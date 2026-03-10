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
    const conn = {
      send: (data: string) => {
        stream.writeSSE({ data, event: 'board-update' });
      },
    };

    addConnection(boardId, conn);

    // Send initial connected event
    await stream.writeSSE({ data: JSON.stringify({ type: 'connected' }), event: 'board-update' });

    // Keepalive every 10 seconds — must be shorter than any proxy/LB idle
    // timeout in the chain (Hetzner LB TCP ~10-60s, Traefik, Cilium).
    // Using await to ensure each frame is flushed to the network.
    const keepalive = setInterval(async () => {
      try {
        await stream.writeSSE({ data: '', event: 'keepalive' });
      } catch {
        clearInterval(keepalive);
      }
    }, 10_000);

    // Wait until the stream is closed
    stream.onAbort(() => {
      clearInterval(keepalive);
      removeConnection(boardId, conn);
    });

    // Keep the stream open indefinitely
    await new Promise(() => {});
  });
});

export default eventsRouter;
