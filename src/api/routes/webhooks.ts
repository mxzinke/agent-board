import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { webhooks, boardMembers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { notFound, forbidden } from '../lib/errors';
import { nanoid } from 'nanoid';

const webhooksRouter = new Hono();
webhooksRouter.use('*', authMiddleware);

// List webhooks for a board
webhooksRouter.get('/boards/:boardId/webhooks', async (c) => {
  const { sub } = c.get('user');
  const boardId = c.req.param('boardId');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, sub))).limit(1);
  if (!membership) throw notFound('Board not found');

  const items = await db.select().from(webhooks).where(eq(webhooks.boardId, boardId));
  return c.json(items);
});

// Create webhook
webhooksRouter.post('/boards/:boardId/webhooks',
  zValidator('json', z.object({
    url: z.string().url(),
    events: z.string().optional(), // comma-separated: "goal.created,goal.updated" or "*"
  })),
  async (c) => {
    const { sub } = c.get('user');
    const boardId = c.req.param('boardId');
    const { url, events } = c.req.valid('json');

    const [membership] = await db.select().from(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, sub))).limit(1);
    if (!membership) throw notFound('Board not found');

    const secret = nanoid(32);
    const [webhook] = await db.insert(webhooks).values({
      boardId,
      url,
      events: events || '*',
      secret,
      createdBy: sub,
    }).returning();

    return c.json({ ...webhook, secret }, 201);
  }
);

// Delete webhook
webhooksRouter.delete('/boards/:boardId/webhooks/:id', async (c) => {
  const { sub } = c.get('user');
  const boardId = c.req.param('boardId');
  const id = c.req.param('id');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, sub))).limit(1);
  if (!membership) throw notFound('Board not found');

  await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.boardId, boardId)));
  return c.json({ ok: true });
});

export default webhooksRouter;
