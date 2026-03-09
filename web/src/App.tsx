import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Login } from './pages/Login';
import { BoardList } from './pages/BoardList';
import { Board } from './pages/Board';
import { GoalDetail } from './pages/GoalDetail';
import { JoinBoard } from './pages/JoinBoard';
import { Nav } from './components/Nav';

export function App() {
  const { user, checkAuth, currentBoard, selectedGoal } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="flex items-center justify-center h-screen text-zinc-400">Loading...</div>;

  // Handle join links
  if (window.location.pathname.startsWith('/join/')) {
    if (!user) return <Login />;
    return <JoinBoard />;
  }

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {selectedGoal ? (
          <GoalDetail />
        ) : currentBoard ? (
          <Board />
        ) : (
          <BoardList />
        )}
      </main>
    </div>
  );
}
