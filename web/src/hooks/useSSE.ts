import { useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import { useStore } from '../store';
import { api } from '../api';

// ── Connection status store (shared across components) ──────────────
type SSEStatus = 'connected' | 'connecting' | 'disconnected';

interface SSEStatusState {
  status: SSEStatus;
  setStatus: (s: SSEStatus) => void;
}

export const useSSEStatus = create<SSEStatusState>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}));

// ── Constants ───────────────────────────────────────────────────────
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 12_000; // server sends keepalive every 5s

// ── Hook ────────────────────────────────────────────────────────────
export function useSSE(boardId: string | null) {
  const fetchGoals = useStore((s) => s.fetchGoals);
  const setStatus = useSSEStatus((s) => s.setStatus);

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventRef = useRef<number>(Date.now());
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refetch the currently-selected goal (if any) and its attachments
  const refreshSelectedGoal = useCallback((disposed: boolean) => {
    const { selectedGoal, setSelectedGoal, currentBoard } = useStore.getState();
    if (selectedGoal && currentBoard) {
      api.getGoal(currentBoard.id, selectedGoal.id).then((goal) => {
        if (!disposed) setSelectedGoal(goal);
      }).catch(() => {});
      window.dispatchEvent(new CustomEvent('goal-detail-refresh', { detail: { goalId: selectedGoal.id } }));
    }
  }, []);

  useEffect(() => {
    if (!boardId) return;

    const token = localStorage.getItem('agent-board-token');
    if (!token) return;

    let disposed = false;

    // ── Heartbeat monitor ─────────────────────────────────────────
    // If we don't receive *any* SSE frame (data or keepalive) within
    // HEARTBEAT_TIMEOUT_MS the connection is likely dead. Force reconnect.
    function resetHeartbeat() {
      lastEventRef.current = Date.now();
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setTimeout(() => {
        if (disposed) return;
        const es = esRef.current;
        if (es) {
          // Connection is stale — tear it down so the error path reconnects
          es.close();
          esRef.current = null;
          setStatus('disconnected');
          scheduleReconnect();
        }
      }, HEARTBEAT_TIMEOUT_MS);
    }

    function clearHeartbeat() {
      if (heartbeatTimerRef.current) {
        clearTimeout(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }

    // ── Reconnect scheduler ───────────────────────────────────────
    function scheduleReconnect() {
      if (disposed) return;
      const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, retryRef.current), BACKOFF_MAX_MS);
      retryRef.current++;
      setStatus('connecting');
      timerRef.current = setTimeout(connect, delay);
    }

    // ── Core connect ──────────────────────────────────────────────
    function connect() {
      if (disposed) return;

      // Tear down previous connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      clearHeartbeat();
      setStatus('connecting');

      const url = `/api/v1/boards/${boardId}/events?token=${encodeURIComponent(token!)}`;
      const es = new EventSource(url);
      esRef.current = es;

      // Any incoming frame resets the heartbeat clock
      es.addEventListener('board-update', (e) => {
        if (disposed) return;
        resetHeartbeat();
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'connected') {
            retryRef.current = 0;
            setStatus('connected');
            return;
          }
          // Refetch goals on any board change
          fetchGoals(boardId!);

          // If the updated goal is currently selected, refresh it
          const { selectedGoal } = useStore.getState();
          if (selectedGoal && event.goalId === selectedGoal.id) {
            refreshSelectedGoal(disposed);
          }
        } catch {
          // Ignore parse errors
        }
      });

      // Keepalive frames also prove the connection is alive
      es.addEventListener('keepalive', () => {
        resetHeartbeat();
      });

      es.onopen = () => {
        resetHeartbeat();
      };

      es.onerror = () => {
        if (disposed) return;
        es.close();
        esRef.current = null;
        clearHeartbeat();
        setStatus('disconnected');
        scheduleReconnect();
      };
    }

    connect();

    // ── Visibility change ─────────────────────────────────────────
    // When a mobile browser backgrounds the tab it often silently kills
    // the TCP socket. readyState may still report OPEN or CONNECTING,
    // so we also check time-since-last-event.
    function handleVisibilityChange() {
      if (disposed || document.hidden) return;

      const es = esRef.current;
      const staleSince = Date.now() - lastEventRef.current;
      const connectionDead =
        !es ||
        es.readyState === EventSource.CLOSED ||
        es.readyState === EventSource.CONNECTING ||
        staleSince > HEARTBEAT_TIMEOUT_MS;

      if (connectionDead) {
        // Kill anything lingering
        if (es) { es.close(); esRef.current = null; }
        clearHeartbeat();
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        retryRef.current = 0;
        connect();
      }

      // Always refetch on resume to catch anything missed while hidden
      fetchGoals(boardId!);
      refreshSelectedGoal(disposed);
    }

    // ── Online / offline ──────────────────────────────────────────
    function handleOnline() {
      if (disposed) return;
      // Network just came back — force reconnect
      const es = esRef.current;
      if (es) { es.close(); esRef.current = null; }
      clearHeartbeat();
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      retryRef.current = 0;
      connect();
      fetchGoals(boardId!);
      refreshSelectedGoal(disposed);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // ── Cleanup ───────────────────────────────────────────────────
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      clearHeartbeat();
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      setStatus('disconnected');
    };
  }, [boardId, fetchGoals, setStatus, refreshSelectedGoal]);
}
