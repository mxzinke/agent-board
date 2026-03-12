import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { acceptanceCriteria, goals, boardMembers } from '../../db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { suspensionMiddleware } from '../middleware/suspension';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { notFound, forbidden, badRequest } from '../lib/errors';
import { broadcastBoardEvent } from '../lib/broadcast';
import { deliverWebhooks } from '../lib/webhookDelivery';

const acceptanceCriteriaRouter = new Hono();
acceptanceCriteriaRouter.use('*', authMiddleware);
acceptanceCriteriaRouter.use('*', suspensionMiddleware);
acceptanceCriteriaRouter.use('*', rateLimitMiddleware);

// Helper: verify goal access
async function requireGoalAccess(goalId: string, userId: string) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) throw notFound('Goal not found');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, goal.boardId), eq(boardMembers.userId, userId))).limit(1);
  if (!membership) throw forbidden('Not a board member');

  return goal;
}

// List acceptance criteria
acceptanceCriteriaRouter.get('/goals/:goalId/acceptance-criteria', async (c) => {
  const { sub } = c.get('user');
  const goalId = c.req.param('goalId');

  await requireGoalAccess(goalId, sub);

  const items = await db.select().from(acceptanceCriteria)
    .where(eq(acceptanceCriteria.goalId, goalId))
    .orderBy(asc(acceptanceCriteria.position));

  return c.json(items);
});

// Create acceptance criterion
acceptanceCriteriaRouter.post('/goals/:goalId/acceptance-criteria',
  zValidator('json', z.object({
    text: z.string().min(1).max(512),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const goalId = c.req.param('goalId');
    const { text } = c.req.valid('json');

    const goal = await requireGoalAccess(goalId, sub);

    const existing = await db.select({ position: acceptanceCriteria.position })
      .from(acceptanceCriteria).where(eq(acceptanceCriteria.goalId, goalId));
    const maxPos = existing.reduce((max, s) => Math.max(max, s.position), -1);

    const [criterion] = await db.insert(acceptanceCriteria).values({
      goalId,
      text,
      position: maxPos + 1000,
    }).returning();

    broadcastBoardEvent(goal.boardId, { type: 'acceptance-criteria-updated', goalId });
    deliverWebhooks(goal.boardId, { type: 'acceptance-criteria-updated', goalId }, sub);

    return c.json(criterion, 201);
  }
);

// Reorder acceptance criteria
acceptanceCriteriaRouter.post('/goals/:goalId/acceptance-criteria/reorder',
  zValidator('json', z.object({
    orderedIds: z.array(z.string().uuid()),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const goalId = c.req.param('goalId');
    const { orderedIds } = c.req.valid('json');

    const goal = await requireGoalAccess(goalId, sub);

    // Validate all criterion IDs belong to this goal
    const existing = await db.select({ id: acceptanceCriteria.id })
      .from(acceptanceCriteria)
      .where(and(eq(acceptanceCriteria.goalId, goalId), inArray(acceptanceCriteria.id, orderedIds)));

    if (existing.length !== orderedIds.length) {
      throw badRequest('Some criterion IDs are invalid');
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.update(acceptanceCriteria)
          .set({ position: (i + 1) * 1000 })
          .where(eq(acceptanceCriteria.id, orderedIds[i]));
      }
    });

    broadcastBoardEvent(goal.boardId, { type: 'acceptance-criteria-updated', goalId });

    return c.json({ ok: true });
  }
);

// Update acceptance criterion
acceptanceCriteriaRouter.patch('/goals/:goalId/acceptance-criteria/:id',
  zValidator('json', z.object({
    text: z.string().min(1).max(512).optional(),
    met: z.boolean().optional(),
    position: z.number().int().optional(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const goalId = c.req.param('goalId');
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    const goal = await requireGoalAccess(goalId, sub);

    const [criterion] = await db.update(acceptanceCriteria)
      .set(updates)
      .where(and(eq(acceptanceCriteria.id, id), eq(acceptanceCriteria.goalId, goalId)))
      .returning();
    if (!criterion) throw notFound('Acceptance criterion not found');

    broadcastBoardEvent(goal.boardId, { type: 'acceptance-criteria-updated', goalId });
    deliverWebhooks(goal.boardId, { type: 'acceptance-criteria-updated', goalId }, sub);

    return c.json(criterion);
  }
);

// Delete acceptance criterion
acceptanceCriteriaRouter.delete('/goals/:goalId/acceptance-criteria/:id', async (c) => {
  const { sub } = c.get('user');
  const goalId = c.req.param('goalId');
  const id = c.req.param('id');

  const goal = await requireGoalAccess(goalId, sub);

  await db.delete(acceptanceCriteria).where(and(eq(acceptanceCriteria.id, id), eq(acceptanceCriteria.goalId, goalId)));

  broadcastBoardEvent(goal.boardId, { type: 'acceptance-criteria-updated', goalId });

  return c.json({ ok: true });
});

export default acceptanceCriteriaRouter;
