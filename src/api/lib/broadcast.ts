// In-memory SSE connection management for live board updates

interface SSEConnection {
  send: (data: string) => void;
}

const boardConnections = new Map<string, Set<SSEConnection>>();

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

export interface BoardEvent {
  type: 'goal-created' | 'goal-updated' | 'goal-deleted' | 'subtask-updated' | 'comment-added';
  goalId?: string;
  data?: Record<string, unknown>;
}

export function broadcastBoardEvent(boardId: string, event: BoardEvent): void {
  const conns = boardConnections.get(boardId);
  if (!conns || conns.size === 0) return;

  const payload = JSON.stringify(event);
  for (const conn of conns) {
    try {
      conn.send(payload);
    } catch {
      // Connection likely closed, will be cleaned up
      conns.delete(conn);
    }
  }
}
