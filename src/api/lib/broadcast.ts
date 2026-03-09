// SSE connection management with PostgreSQL LISTEN/NOTIFY for cross-pod broadcasting

import postgres from 'postgres';

interface SSEConnection {
  send: (data: string) => void;
}

export interface BoardEvent {
  type: 'goal-created' | 'goal-updated' | 'goal-deleted' | 'subtask-updated' | 'comment-added';
  goalId?: string;
  data?: Record<string, unknown>;
}

interface NotifyPayload {
  boardId: string;
  event: BoardEvent;
}

const CHANNEL = 'board_events';
const RECONNECT_DELAY_MS = 1500;

// Local SSE connections on this pod
const boardConnections = new Map<string, Set<SSEConnection>>();

// Dedicated PG connection for LISTEN (not pooled)
let listener: postgres.Sql | null = null;
let listenerReady = false;

// Shared PG connection for NOTIFY (lightweight, single connection)
let notifier: postgres.Sql | null = null;

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
      try {
        const parsed: NotifyPayload = JSON.parse(payload);
        deliverToLocalConnections(parsed.boardId, parsed.event);
      } catch {
        // Ignore malformed payloads
      }
    }, () => {
      // onlisten — called when subscription is re-established after reconnect
      console.log('[broadcast] PG LISTEN re-established on channel:', CHANNEL);
    });
    listenerReady = true;
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

// Initialize the LISTEN connection on module load
setupListener().catch((err) => {
  console.error('[broadcast] Initial LISTEN setup failed:', err);
  scheduleReconnect();
});
