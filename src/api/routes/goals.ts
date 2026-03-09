import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { goals, boardMembers, subtasks, comments, users, goalStatusEnum } from '../../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { notFound, forbidden } from '../lib/errors';

const goalsRouter = new Hono();
goalsRouter.use('*', authMiddleware);

// Helper: check board membership
async function requireBoardMember(boardId: string, userId: string) {
  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId))).limit(1);
  if (!membership) throw forbidden('Not a board member');
  return membership;
}

// List goals for a board
goalsRouter.get('/boards/:boardId/goals', async (c) => {
  const { sub } = c.get('user');
  const boardId = c.req.param('boardId');
  const status = c.req.query('status');

  await requireBoardMember(boardId, sub);

  let query = db
    .select({
      id: goals.id,
      boardId: goals.boardId,
      title: goals.title,
      description: goals.description,
      status: goals.status,
      position: goals.position,
      assigneeId: goals.assigneeId,
      createdBy: goals.createdBy,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(goals)
    .where(eq(goals.boardId, boardId))
    .orderBy(asc(goals.position));

  const allGoals = await query;

  // Filter by status if provided
  const filtered = status
    ? allGoals.filter(g => status.split(',').includes(g.status))
    : allGoals;

  return c.json(filtered);
});

// Create goal
goalsRouter.post('/boards/:boardId/goals',
  zValidator('json', z.object({
    title: z.string().min(1).max(512),
    description: z.string().max(10000).optional(),
    status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
    assigneeId: z.string().uuid().optional(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const boardId = c.req.param('boardId');
    const { title, description, status, assigneeId } = c.req.valid('json');

    await requireBoardMember(boardId, sub);

    // Get next position
    const existingGoals = await db.select({ position: goals.position })
      .from(goals)
      .where(and(eq(goals.boardId, boardId), eq(goals.status, status || 'backlog')));
    const maxPos = existingGoals.reduce((max, g) => Math.max(max, g.position), -1);

    const [goal] = await db.insert(goals).values({
      boardId,
      title,
      description,
      status: status || 'backlog',
      position: maxPos + 1000,
      assigneeId,
      createdBy: sub,
    }).returning();

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

// Update goal
goalsRouter.patch('/boards/:boardId/goals/:id',
  zValidator('json', z.object({
    title: z.string().min(1).max(512).optional(),
    description: z.string().max(10000).optional(),
    status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
    position: z.number().int().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
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

    const [goal] = await db.update(goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();

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
  return c.json({ ok: true });
});

export default goalsRouter;
