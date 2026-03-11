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

  // Strip IPv6 brackets for inspection
  const bare = hostname.startsWith('[') ? hostname.slice(1, -1) : hostname;

  // Block loopback and unspecified
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0', '::', '0'].includes(bare)) return false;

  // Block IPv4 private ranges
  if (bare.startsWith('10.')) return false;
  if (bare.startsWith('192.168.')) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(bare)) return false;

  // Block link-local and metadata
  if (bare.startsWith('169.254.')) return false;

  // Block IPv4-in-IPv6 mapped addresses (e.g. ::ffff:127.0.0.1, ::ffff:10.0.0.1)
  if (/^::ffff:/.test(bare)) return false;

  // Block IPv6 private ranges (ULA fc00::/7, link-local fe80::/10)
  if (/^f[cd]/.test(bare)) return false;
  if (bare.startsWith('fe80')) return false;

  // Block numeric-only hostnames (decimal IP bypass like 2130706433)
  if (/^\d+$/.test(bare)) return false;

  // Block octal IP notation (e.g. 0177.0.0.1)
  if (/^0\d/.test(bare)) return false;

  // Block suspicious TLDs / suffixes
  if (bare.endsWith('.internal') || bare.endsWith('.local') || bare.endsWith('.localhost')) return false;

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
