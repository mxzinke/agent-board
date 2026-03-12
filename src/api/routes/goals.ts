import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { goals, boardMembers, subtasks, comments, users } from '../../db/schema';
import { eq, and, asc, count, inArray, lt, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { suspensionMiddleware } from '../middleware/suspension';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { notFound, forbidden, badRequest } from '../lib/errors';
import { config } from '../../config';
import { broadcastBoardEvent } from '../lib/broadcast';
import { deliverWebhooks } from '../lib/webhookDelivery';

const goalsRouter = new Hono();
goalsRouter.use('*', authMiddleware);
goalsRouter.use('*', suspensionMiddleware);
goalsRouter.use('*', rateLimitMiddleware);

// Helper: check board membership
async function requireBoardMember(boardId: string, userId: string) {
  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId))).limit(1);
  if (!membership) throw forbidden('Not a board member');
  return membership;
}

// Auto-archive: mark done goals with no activity for 24h as archived
async function autoArchiveGoals(boardId: string) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.update(goals)
    .set({ archived: true })
    .where(and(
      eq(goals.boardId, boardId),
      eq(goals.status, 'done'),
      eq(goals.archived, false),
      lt(goals.updatedAt, cutoff),
    ));
}

// List goals for a board
goalsRouter.get('/boards/:boardId/goals', async (c) => {
  const { sub } = c.get('user');
  const boardId = c.req.param('boardId');
  const status = c.req.query('status');
  const archived = c.req.query('archived');
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '200', 10) || 200, 1), 500);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);

  await requireBoardMember(boardId, sub);

  // Lazily auto-archive on each board load
  await autoArchiveGoals(boardId);

  // Build WHERE conditions
  type GoalStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  const validStatuses: GoalStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
  const conditions = [eq(goals.boardId, boardId)];
  if (status) {
    const statuses = status.split(',').map(s => s.trim()).filter((s): s is GoalStatus => validStatuses.includes(s as GoalStatus));
    if (statuses.length > 0) {
      conditions.push(inArray(goals.status, statuses));
    }
  }

  // Filter by archived status: default is to exclude archived goals
  if (archived === 'true') {
    conditions.push(eq(goals.archived, true));
  } else if (archived === 'only') {
    // alias for 'true' — fetch only archived
    conditions.push(eq(goals.archived, true));
  } else {
    // Default: exclude archived
    conditions.push(eq(goals.archived, false));
  }

  const items = await db
    .select({
      id: goals.id,
      boardId: goals.boardId,
      title: goals.title,
      description: goals.description,
      acceptanceCriteria: goals.acceptanceCriteria,
      status: goals.status,
      position: goals.position,
      assigneeId: goals.assigneeId,
      archived: goals.archived,
      createdBy: goals.createdBy,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(goals)
    .where(and(...conditions))
    .orderBy(asc(goals.position))
    .limit(limit)
    .offset(offset);

  return c.json(items);
});

// Create goal
goalsRouter.post('/boards/:boardId/goals',
  zValidator('json', z.object({
    title: z.string().min(1).max(512),
    description: z.string().max(10000).optional(),
    acceptanceCriteria: z.string().max(10000).optional(),
    status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
    assigneeId: z.string().uuid().optional(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const boardId = c.req.param('boardId');
    const { title, description, acceptanceCriteria, status, assigneeId } = c.req.valid('json');

    await requireBoardMember(boardId, sub);

    // Check board goal limit
    const [goalCount] = await db.select({ cnt: count() }).from(goals).where(eq(goals.boardId, boardId));
    if (goalCount.cnt >= config.maxGoalsPerBoard) throw badRequest(`Board goal limit reached (${config.maxGoalsPerBoard})`);

    // Get next position
    const existingGoals = await db.select({ position: goals.position })
      .from(goals)
      .where(and(eq(goals.boardId, boardId), eq(goals.status, status || 'backlog')));
    const maxPos = existingGoals.reduce((max, g) => Math.max(max, g.position), -1);

    const [goal] = await db.insert(goals).values({
      boardId,
      title,
      description,
      acceptanceCriteria,
      status: status || 'backlog',
      position: maxPos + 1000,
      assigneeId,
      createdBy: sub,
    }).returning();

    broadcastBoardEvent(boardId, { type: 'goal-created', goalId: goal.id });
    deliverWebhooks(boardId, { type: 'goal-created', goalId: goal.id, data: goal }, sub);

    return c.json(goal, 201);
  }
);

// Get goal detail with subtasks and comments
goalsRouter.get('/boards/:boardId/goals/:id', async (c) => {
  const { sub } = c.get('user');
  const boardId = c.req.param('boardId');
  const id = c.req.param('id');

  await requireBoardMember(boardId, sub);

  const [goal] = await db.select().from(goals)
    .where(and(eq(goals.id, id), eq(goals.boardId, boardId))).limit(1);
  if (!goal) throw notFound('Goal not found');

  const goalSubtasks = await db.select().from(subtasks)
    .where(eq(subtasks.goalId, id))
    .orderBy(asc(subtasks.position));

  const goalComments = await db
    .select({
      id: comments.id,
      goalId: comments.goalId,
      authorId: comments.authorId,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorUsername: users.username,
      authorDisplayName: users.displayName,
      authorIsAgent: users.isAgent,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.goalId, id))
    .orderBy(asc(comments.createdAt));

  return c.json({ ...goal, subtasks: goalSubtasks, comments: goalComments });
});

// Reorder goals within a status column
goalsRouter.post('/boards/:boardId/goals/reorder',
  zValidator('json', z.object({
    orderedIds: z.array(z.string().uuid()),
    status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const boardId = c.req.param('boardId');
    const { orderedIds, status } = c.req.valid('json');

    await requireBoardMember(boardId, sub);

    // Validate all goals belong to board and have the given status
    const existingGoals = await db.select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.boardId, boardId), eq(goals.status, status), inArray(goals.id, orderedIds)));

    if (existingGoals.length !== orderedIds.length) {
      throw badRequest('Some goal IDs are invalid or do not match the given status');
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.update(goals)
          .set({ position: (i + 1) * 1000, updatedAt: new Date() })
          .where(eq(goals.id, orderedIds[i]));
      }
    });

    broadcastBoardEvent(boardId, { type: 'goals-reordered', data: { status } });

    return c.json({ ok: true });
  }
);

// Update goal
goalsRouter.patch('/boards/:boardId/goals/:id',
  zValidator('json', z.object({
    title: z.string().min(1).max(512).optional(),
    description: z.string().max(10000).optional(),
    acceptanceCriteria: z.string().max(10000).nullable().optional(),
    status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
    position: z.number().int().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    archived: z.boolean().optional(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const boardId = c.req.param('boardId');
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    await requireBoardMember(boardId, sub);

    const [existing] = await db.select().from(goals)
      .where(and(eq(goals.id, id), eq(goals.boardId, boardId))).limit(1);
    if (!existing) throw notFound('Goal not found');

    const assigneeChanged = updates.assigneeId !== undefined && updates.assigneeId !== existing.assigneeId;

    // Auto-unarchive on status change or assignee change (activity on archived goal)
    const hasActivity = updates.status !== undefined || assigneeChanged;
    const autoUnarchive = existing.archived && hasActivity && updates.archived === undefined;

    const [goal] = await db.update(goals)
      .set({ ...updates, ...(autoUnarchive ? { archived: false } : {}), updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();

    if (assigneeChanged) {
      broadcastBoardEvent(boardId, { type: 'goal-assigned', goalId: id, data: { assigneeId: goal.assigneeId } });
      deliverWebhooks(boardId, { type: 'goal-assigned', goalId: id, data: { assigneeId: goal.assigneeId } }, sub);
    } else {
      broadcastBoardEvent(boardId, { type: 'goal-updated', goalId: id });
      deliverWebhooks(boardId, { type: 'goal-updated', goalId: id, data: goal }, sub);
    }

    return c.json(goal);
  }
);

// Delete goal
goalsRouter.delete('/boards/:boardId/goals/:id', async (c) => {
  const { sub } = c.get('user');
  const boardId = c.req.param('boardId');
  const id = c.req.param('id');

  await requireBoardMember(boardId, sub);

  const [existing] = await db.select().from(goals)
    .where(and(eq(goals.id, id), eq(goals.boardId, boardId))).limit(1);
  if (!existing) throw notFound('Goal not found');

  await db.delete(goals).where(eq(goals.id, id));

  broadcastBoardEvent(boardId, { type: 'goal-deleted', goalId: id });
  deliverWebhooks(boardId, { type: 'goal-deleted', goalId: id }, sub);

  return c.json({ ok: true });
});

export default goalsRouter;
