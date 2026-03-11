// SSE connection management with PostgreSQL LISTEN/NOTIFY for cross-pod broadcasting

import postgres from 'postgres';

interface SSEConnection {
  send: (data: string) => void | Promise<void>;
}

export interface BoardEvent {
  type: 'goal-created' | 'goal-updated' | 'goal-deleted' | 'goal-assigned' | 'subtask-updated' | 'comment-added';
  goalId?: string;
  data?: Record<string, unknown>;
}

interface NotifyPayload {
  boardId: string;
  event: BoardEvent;
}

const CHANNEL = 'board_events';
const RECONNECT_DELAY_MS = 1500;
const HEALTH_CHECK_INTERVAL_MS = 30_000; // Check every 30s

// Local SSE connections on this pod
const boardConnections = new Map<string, Set<SSEConnection>>();

// Dedicated PG connection for LISTEN (not pooled)
let listener: postgres.Sql | null = null;
let listenerReady = false;
let lastListenerActivity = Date.now();

// Shared PG connection for NOTIFY (lightweight, single connection)
let notifier: postgres.Sql | null = null;

// Health check interval
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return url;
}

function deliverToLocalConnections(boardId: string, event: BoardEvent): void {
  const conns = boardConnections.get(boardId);
  if (!conns || conns.size === 0) return;

  const payload = JSON.stringify(event);
  for (const conn of conns) {
    try {
      conn.send(payload);
    } catch {
      conns.delete(conn);
    }
  }
}

async function setupListener(): Promise<void> {
  if (listener) {
    try {
      await listener.end();
    } catch {
      // ignore cleanup errors
    }
  }

  const sql = postgres(getConnectionString(), {
    max: 1,
    // Keep the connection alive — no idle timeout
    idle_timeout: 0,
    connect_timeout: 10,
  });

  listener = sql;

  try {
    await sql.listen(CHANNEL, (payload) => {
      lastListenerActivity = Date.now();
      try {
        const parsed: NotifyPayload = JSON.parse(payload);
        deliverToLocalConnections(parsed.boardId, parsed.event);
      } catch {
        // Ignore malformed payloads
      }
    }, () => {
      // onlisten — called when subscription is re-established after reconnect
      listenerReady = true;
      lastListenerActivity = Date.now();
      console.log('[broadcast] PG LISTEN re-established on channel:', CHANNEL);
    });
    listenerReady = true;
    lastListenerActivity = Date.now();
    console.log('[broadcast] PG LISTEN connected on channel:', CHANNEL);
  } catch (err) {
    listenerReady = false;
    console.error('[broadcast] PG LISTEN failed, reconnecting in', RECONNECT_DELAY_MS, 'ms', err);
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  setTimeout(async () => {
    console.log('[broadcast] Attempting LISTEN reconnection...');
    try {
      await setupListener();
    } catch (err) {
      console.error('[broadcast] Reconnection failed:', err);
      scheduleReconnect();
    }
  }, RECONNECT_DELAY_MS);
}

function getNotifier(): postgres.Sql {
  if (!notifier) {
    notifier = postgres(getConnectionString(), {
      max: 2,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return notifier;
}

/**
 * Periodic health check for the PG LISTEN connection.
 * Sends a self-ping via NOTIFY and verifies it is received.
 * If no activity is detected within the expected window, forces reconnection.
 */
function startHealthCheck(): void {
  if (healthCheckTimer) return;

  healthCheckTimer = setInterval(async () => {
    if (!listenerReady) return; // Already reconnecting

    const timeSinceActivity = Date.now() - lastListenerActivity;

    // If we haven't seen any activity in 2x the health check interval,
    // the listener is likely dead. Force reconnection.
    if (timeSinceActivity > HEALTH_CHECK_INTERVAL_MS * 2) {
      console.warn(
        `[broadcast] PG LISTEN health check failed: no activity for ${Math.round(timeSinceActivity / 1000)}s, forcing reconnect`,
      );
      listenerReady = false;
      try {
        await setupListener();
      } catch (err) {
        console.error('[broadcast] Health check reconnection failed:', err);
        scheduleReconnect();
      }
      return;
    }

    // Send a self-ping to verify the connection is alive
    try {
      const sql = getNotifier();
      await sql.notify(CHANNEL, JSON.stringify({ boardId: '__health__', event: { type: 'goal-updated' } }));
    } catch (err) {
      console.warn('[broadcast] Health check NOTIFY failed:', err);
      // The next health check will detect the lack of activity and reconnect
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

// --- Public API (same exports as before) ---

export function addConnection(boardId: string, conn: SSEConnection): void {
  if (!boardConnections.has(boardId)) {
    boardConnections.set(boardId, new Set());
  }
  boardConnections.get(boardId)!.add(conn);
}

export function removeConnection(boardId: string, conn: SSEConnection): void {
  const conns = boardConnections.get(boardId);
  if (!conns) return;
  conns.delete(conn);
  if (conns.size === 0) {
    boardConnections.delete(boardId);
  }
}

export function broadcastBoardEvent(boardId: string, event: BoardEvent): void {
  const payload: NotifyPayload = { boardId, event };
  const json = JSON.stringify(payload);

  if (json.length > 7999) {
    console.error('[broadcast] Payload exceeds 8000 byte PG NOTIFY limit, dropping');
    return;
  }

  // Send via PG NOTIFY — all pods (including this one) will receive it via LISTEN
  const sql = getNotifier();
  sql.notify(CHANNEL, json).catch((err) => {
    console.error('[broadcast] PG NOTIFY failed:', err);
    // Fallback: deliver locally even if NOTIFY fails
    deliverToLocalConnections(boardId, event);
  });
}

/** Returns health status of the PG LISTEN connection */
export function getListenerHealth(): {
  status: 'healthy' | 'degraded' | 'down';
  listenerReady: boolean;
  lastActivityAgo: number;
  activeConnections: number;
} {
  const now = Date.now();
  const lastActivityAgo = Math.round((now - lastListenerActivity) / 1000);

  let activeConnections = 0;
  for (const conns of boardConnections.values()) {
    activeConnections += conns.size;
  }

  let status: 'healthy' | 'degraded' | 'down';
  if (!listenerReady) {
    status = 'down';
  } else if (lastActivityAgo > HEALTH_CHECK_INTERVAL_MS * 2 / 1000) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return { status, listenerReady, lastActivityAgo, activeConnections };
}

// Initialize the LISTEN connection on module load
setupListener().catch((err) => {
  console.error('[broadcast] Initial LISTEN setup failed:', err);
  scheduleReconnect();
});

// Start the periodic health check
startHealthCheck();
