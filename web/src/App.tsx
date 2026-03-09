import { useEffect, useState } from 'react';
import { useStore } from './store';
import { useRouter } from './hooks/useRouter';
import { Login } from './pages/Login';
import { BoardList } from './pages/BoardList';
import { Board } from './pages/Board';
import { GoalDetail } from './pages/GoalDetail';
import { JoinBoard } from './pages/JoinBoard';
import { Settings } from './pages/Settings';
import { Nav } from './components/Nav';
import { InstallPrompt } from './components/InstallPrompt';

export function App() {
  const { user, checkAuth, currentBoard, selectedGoal, loadFromPath } = useStore();
  const [ready, setReady] = useState(false);
  const { path, navigate } = useRouter();

  useEffect(() => {
    checkAuth().then(async () => {
      const token = localStorage.getItem('agent-board-token');
      if (token) {
        await loadFromPath(window.location.pathname);
      }
    }).finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="flex items-center justify-center h-screen text-zinc-400 dark:text-zinc-500">Loading...</div>;

  // Handle join links
  if (path.startsWith('/join/')) {
    if (!user) return <Login />;
    return <JoinBoard navigate={navigate} />;
  }

  if (!user) return <Login />;

  // Determine view from URL path
  const isSettings = path === '/settings';
  const goalMatch = path.match(/^\/b\/([^/]+)\/([^/]+)$/);
  const boardMatch = path.match(/^\/b\/([^/]+)$/);

  const renderView = () => {
    if (isSettings) return <Settings />;
    if ((goalMatch || selectedGoal) && currentBoard) return <GoalDetail navigate={navigate} />;
    if ((boardMatch || currentBoard) && currentBoard) return <Board navigate={navigate} />;
    return <BoardList navigate={navigate} />;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Nav navigate={navigate} path={path} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderView()}
      </main>
      <InstallPrompt />
    </div>
  );
}
