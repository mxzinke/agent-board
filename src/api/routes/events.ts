import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { verifyToken } from '../lib/jwt';
import { db } from '../../db';
import { boardMembers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { addConnection, removeConnection } from '../lib/broadcast';

const eventsRouter = new Hono();

// SSE endpoint — auth via query param since EventSource can't set headers
eventsRouter.get('/boards/:boardId/events', async (c) => {
  const boardId = c.req.param('boardId');
  const token = c.req.query('token');

  if (!token) {
    return c.json({ error: 'Missing token query parameter' }, 401);
  }

  // Verify JWT
  let payload;
  try {
    payload = await verifyToken(token);
  } catch (err) {
    console.error('[SSE] JWT verify failed:', err);
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Verify board membership
  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, payload.sub)))
    .limit(1);

  if (!membership) {
    return c.json({ error: 'Not a board member' }, 403);
  }

  // Disable proxy buffering so keepalive frames reach the client immediately
  c.header('X-Accel-Buffering', 'no');
  c.header('X-Content-Type-Options', 'nosniff');

  return streamSSE(c, async (stream) => {
    let aborted = false;

    const conn = {
      send: async (data: string) => {
        try {
          await stream.writeSSE({ data, event: 'board-update' });
        } catch {
          // Connection dead — will be cleaned up
        }
      },
    };

    addConnection(boardId, conn);

    stream.onAbort(() => {
      aborted = true;
      removeConnection(boardId, conn);
    });

    // Send initial connected event
    await stream.writeSSE({ data: JSON.stringify({ type: 'connected' }), event: 'board-update' });

    // Keepalive loop — uses stream.sleep() to stay within the callback's
    // execution flow. This ensures writes trigger the TransformStream's
    // pull mechanism in Bun, so frames actually reach the client.
    // setInterval + await new Promise(() => {}) does NOT work because
    // interval writes happen outside the pull chain and get buffered forever.
    while (!aborted) {
      await stream.sleep(10_000);
      if (aborted) break;
      try {
        await stream.writeSSE({ data: 'ping', event: 'keepalive' });
      } catch {
        break;
      }
    }
  });
});

export default eventsRouter;
