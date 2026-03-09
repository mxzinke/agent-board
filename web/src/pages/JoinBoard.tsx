import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';

export function JoinBoard() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const { setCurrentBoard, fetchBoards } = useStore();

  useEffect(() => {
    const token = window.location.pathname.split('/join/')[1];
    if (!token) {
      setStatus('error');
      setError('Invalid invite link');
      return;
    }

    api.joinBoard(token)
      .then(async (result) => {
        setStatus('success');
        await fetchBoards();
        const board = await api.getBoard(result.boardId);
        setCurrentBoard(board);
        window.history.replaceState({}, '', '/');
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
  }, []);

  if (status === 'loading') return <div className="flex items-center justify-center h-screen text-zinc-400 text-sm">Joining board...</div>;
  if (status === 'error') return (
    <div className="flex flex-col items-center justify-center h-screen">
      <p className="text-sm text-red-600 mb-4">{error}</p>
      <button onClick={() => window.location.href = '/'} className="text-sm text-zinc-400 hover:text-zinc-600">Go to boards</button>
    </div>
  );
  return null;
}
