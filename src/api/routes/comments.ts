import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { comments, goals, boardMembers, users } from '../../db/schema';
import { eq, and, asc, gte, count } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { suspensionMiddleware } from '../middleware/suspension';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { notFound, forbidden } from '../lib/errors';
import { config } from '../../config';
import { broadcastBoardEvent } from '../lib/broadcast';
import { deliverWebhooks } from '../lib/webhookDelivery';

const commentsRouter = new Hono();
commentsRouter.use('*', authMiddleware);
commentsRouter.use('*', suspensionMiddleware);
commentsRouter.use('*', rateLimitMiddleware);

async function requireGoalAccess(goalId: string, userId: string) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) throw notFound('Goal not found');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, goal.boardId), eq(boardMembers.userId, userId))).limit(1);
  if (!membership) throw forbidden('Not a board member');

  return goal;
}

// List comments
commentsRouter.get('/goals/:goalId/comments', async (c) => {
  const { sub } = c.get('user');
  const goalId = c.req.param('goalId');
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '200', 10) || 200, 1), 500);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);

  await requireGoalAccess(goalId, sub);

  const items = await db
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
    .where(eq(comments.goalId, goalId))
    .orderBy(asc(comments.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json(items);
});

// Create comment
commentsRouter.post('/goals/:goalId/comments',
  zValidator('json', z.object({
    body: z.string().min(1).max(10000),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const goalId = c.req.param('goalId');
    const { body } = c.req.valid('json');

    const goal = await requireGoalAccess(goalId, sub);

    // Check daily comment limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [commentCount] = await db.select({ cnt: count() }).from(comments)
      .where(and(eq(comments.authorId, sub), gte(comments.createdAt, todayStart)));
    if (commentCount.cnt >= config.maxCommentsPerDay) {
      return c.json({ error: `Daily comment limit reached (${config.maxCommentsPerDay})` }, 429);
    }

    const [comment] = await db.insert(comments).values({
      goalId,
      authorId: sub,
      body,
    }).returning();

    // Auto-unarchive on comment activity
    if (goal.archived) {
      await db.update(goals)
        .set({ archived: false, updatedAt: new Date() })
        .where(eq(goals.id, goalId));
    }

    // Return with author info
    const [user] = await db.select({
      username: users.username,
      displayName: users.displayName,
      isAgent: users.isAgent
    }).from(users).where(eq(users.id, sub)).limit(1);

    broadcastBoardEvent(goal.boardId, { type: 'comment-added', goalId });
    deliverWebhooks(goal.boardId, { type: 'comment-added', goalId }, sub);

    return c.json({
      ...comment,
      authorUsername: user?.username,
      authorDisplayName: user?.displayName,
      authorIsAgent: user?.isAgent,
    }, 201);
  }
);

// Update comment
commentsRouter.patch('/goals/:goalId/comments/:id',
  zValidator('json', z.object({
    body: z.string().min(1).max(10000),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const goalId = c.req.param('goalId');
    const id = c.req.param('id');
    const { body } = c.req.valid('json');

    await requireGoalAccess(goalId, sub);

    const [existing] = await db.select().from(comments)
      .where(and(eq(comments.id, id), eq(comments.goalId, goalId))).limit(1);
    if (!existing) throw notFound('Comment not found');
    if (existing.authorId !== sub) throw forbidden('Can only edit your own comments');

    const [comment] = await db.update(comments)
      .set({ body, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();

    return c.json(comment);
  }
);

// Delete comment
commentsRouter.delete('/goals/:goalId/comments/:id', async (c) => {
  const { sub } = c.get('user');
  const goalId = c.req.param('goalId');
  const id = c.req.param('id');

  await requireGoalAccess(goalId, sub);

  const [existing] = await db.select().from(comments)
    .where(and(eq(comments.id, id), eq(comments.goalId, goalId))).limit(1);
  if (!existing) throw notFound('Comment not found');
  if (existing.authorId !== sub) throw forbidden('Can only delete your own comments');

  await db.delete(comments).where(eq(comments.id, id));
  return c.json({ ok: true });
});

export default commentsRouter;
