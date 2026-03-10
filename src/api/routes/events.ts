import { Hono } from 'hono';
import { verifyToken } from '../lib/jwt';
import { db } from '../../db';
import { boardMembers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { addConnection, removeConnection } from '../lib/broadcast';

const eventsRouter = new Hono();

const KEEPALIVE_INTERVAL_MS = 10_000;

/** Format an SSE frame */
function sseFrame(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}

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

  // Use Bun's native ReadableStream with start() controller.
  // Hono's streamSSE uses a TransformStream whose pull-based ReadableStream
  // doesn't reliably flush subsequent writes in Bun — keepalive frames get
  // buffered indefinitely. Using controller.enqueue() directly bypasses this.
  const encoder = new TextEncoder();
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Stream closed
        }
      };

      const conn = {
        send: (data: string) => {
          send(sseFrame('board-update', data));
        },
      };

      addConnection(boardId, conn);

      // Send initial connected event
      send(sseFrame('board-update', JSON.stringify({ type: 'connected' })));

      // Keepalive every 10s — controller.enqueue() pushes data directly
      // into the response stream without going through a TransformStream,
      // so each frame is flushed immediately by Bun's HTTP server.
      console.log(`[SSE] Connection established for board ${boardId}, starting keepalive timer`);
      keepaliveTimer = setInterval(() => {
        console.log(`[SSE] Sending keepalive for board ${boardId}`);
        try {
          send(sseFrame('keepalive', 'ping'));
        } catch (e) {
          console.error(`[SSE] Keepalive send failed:`, e);
          if (keepaliveTimer) clearInterval(keepaliveTimer);
        }
      }, KEEPALIVE_INTERVAL_MS);

      // Cleanup when client disconnects
      c.req.raw.signal.addEventListener('abort', () => {
        if (keepaliveTimer) {
          clearInterval(keepaliveTimer);
          keepaliveTimer = null;
        }
        removeConnection(boardId, conn);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

export default eventsRouter;
