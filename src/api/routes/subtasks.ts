import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { subtasks, goals, boardMembers } from '../../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { notFound, forbidden } from '../lib/errors';

const subtasksRouter = new Hono();
subtasksRouter.use('*', authMiddleware);

// Helper: verify goal access
async function requireGoalAccess(goalId: string, userId: string) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) throw notFound('Goal not found');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, goal.boardId), eq(boardMembers.userId, userId))).limit(1);
  if (!membership) throw forbidden('Not a board member');

  return goal;
}

// List subtasks
subtasksRouter.get('/goals/:goalId/subtasks', async (c) => {
  const { sub } = c.get('user');
  const goalId = c.req.param('goalId');

  await requireGoalAccess(goalId, sub);

  const items = await db.select().from(subtasks)
    .where(eq(subtasks.goalId, goalId))
    .orderBy(asc(subtasks.position));

  return c.json(items);
});

// Create subtask
subtasksRouter.post('/goals/:goalId/subtasks',
  zValidator('json', z.object({
    title: z.string().min(1).max(512),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const goalId = c.req.param('goalId');
    const { title } = c.req.valid('json');

    await requireGoalAccess(goalId, sub);

    const existing = await db.select({ position: subtasks.position })
      .from(subtasks).where(eq(subtasks.goalId, goalId));
    const maxPos = existing.reduce((max, s) => Math.max(max, s.position), -1);

    const [subtask] = await db.insert(subtasks).values({
      goalId,
      title,
      position: maxPos + 1000,
    }).returning();

    return c.json(subtask, 201);
  }
);

// Update subtask
subtasksRouter.patch('/goals/:goalId/subtasks/:id',
  zValidator('json', z.object({
    title: z.string().min(1).max(512).optional(),
    done: z.boolean().optional(),
    position: z.number().int().optional(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const goalId = c.req.param('goalId');
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    await requireGoalAccess(goalId, sub);

    const [subtask] = await db.update(subtasks)
      .set(updates)
      .where(and(eq(subtasks.id, id), eq(subtasks.goalId, goalId)))
      .returning();
    if (!subtask) throw notFound('Subtask not found');

    return c.json(subtask);
  }
);

// Delete subtask
subtasksRouter.delete('/goals/:goalId/subtasks/:id', async (c) => {
  const { sub } = c.get('user');
  const goalId = c.req.param('goalId');
  const id = c.req.param('id');

  await requireGoalAccess(goalId, sub);

  await db.delete(subtasks).where(and(eq(subtasks.id, id), eq(subtasks.goalId, goalId)));
  return c.json({ ok: true });
});

export default subtasksRouter;
