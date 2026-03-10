import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { webhooks, boardMembers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { suspensionMiddleware } from '../middleware/suspension';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { notFound, forbidden, badRequest } from '../lib/errors';
import { nanoid } from 'nanoid';

/** Validate that a webhook URL is safe (no SSRF) */
function isAllowedWebhookUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) return false;
  if (hostname.startsWith('10.')) return false;
  if (hostname.startsWith('192.168.')) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
  if (hostname === '169.254.169.254') return false;
  if (hostname.startsWith('169.254.')) return false;
  if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return false;
  return true;
}

const webhooksRouter = new Hono();
webhooksRouter.use('*', authMiddleware);
webhooksRouter.use('*', suspensionMiddleware);
webhooksRouter.use('*', rateLimitMiddleware);

// List webhooks for a board
webhooksRouter.get('/boards/:boardId/webhooks', async (c) => {
  const { sub } = c.get('user');
  const boardId = c.req.param('boardId');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, sub))).limit(1);
  if (!membership) throw notFound('Board not found');

  const items = await db.select({
    id: webhooks.id,
    boardId: webhooks.boardId,
    url: webhooks.url,
    events: webhooks.events,
    active: webhooks.active,
    createdBy: webhooks.createdBy,
    createdAt: webhooks.createdAt,
  }).from(webhooks).where(eq(webhooks.boardId, boardId));
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

    if (!isAllowedWebhookUrl(url)) throw badRequest('Invalid webhook URL: must be HTTPS and not target private/internal addresses');

    const [membership] = await db.select().from(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, sub))).limit(1);
    if (!membership) throw notFound('Board not found');
    if (membership.role !== 'owner') throw forbidden('Only board owners can manage webhooks');

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
  if (membership.role !== 'owner') throw forbidden('Only board owners can manage webhooks');

  await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.boardId, boardId)));
  return c.json({ ok: true });
});

export default webhooksRouter;
