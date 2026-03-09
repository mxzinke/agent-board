import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { api } from '../api';

export function useSSE(boardId: string | null) {
  const fetchGoals = useStore((s) => s.fetchGoals);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!boardId) return;

    const token = localStorage.getItem('agent-board-token');
    if (!token) return;

    let disposed = false;

    function connect() {
      if (disposed) return;

      // Close existing connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const url = `/api/v1/boards/${boardId}/events?token=${encodeURIComponent(token!)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener('board-update', (e) => {
        if (disposed) return;
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'connected') {
            retryRef.current = 0;
            return;
          }
          // Refetch goals on any board change
          fetchGoals(boardId!);

          // If a specific goal is selected and was updated, refresh it too
          const { selectedGoal, setSelectedGoal, currentBoard } = useStore.getState();
          if (selectedGoal && currentBoard && event.goalId === selectedGoal.id) {
            api.getGoal(currentBoard.id, selectedGoal.id).then((goal) => {
              if (!disposed) setSelectedGoal(goal);
            }).catch(() => {});
          }
        } catch {
          // Ignore parse errors
        }
      });

      es.onerror = () => {
        if (disposed) return;
        es.close();
        esRef.current = null;

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30_000);
        retryRef.current++;
        timerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [boardId, fetchGoals]);
}
