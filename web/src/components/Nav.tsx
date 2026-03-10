import { useStore } from '../store';
import { useTheme } from '../hooks/useTheme';
import { useSSEStatus } from '../hooks/useSSE';
import { Logo } from './Logo';
import { Sun, Moon, Monitor, Settings, LogOut, Crown } from 'lucide-react';

interface NavProps {
  navigate: (to: string) => void;
  path: string;
}

export function Nav({ navigate, path }: NavProps) {
  const { user, logout, currentBoard, selectedGoal, setCurrentBoard, setSelectedGoal } = useStore();
  const { theme, setTheme } = useTheme();
  const sseStatus = useSSEStatus((s) => s.status);

  const isSettings = path === '/settings';

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  const handleHome = () => {
    setSelectedGoal(null);
    setCurrentBoard(null);
    navigate('/');
  };

  const handleBoardClick = () => {
    if (currentBoard) {
      setSelectedGoal(null);
      navigate('/b/' + currentBoard.id);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={handleHome}
            className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-400 tracking-tight"
          >
            <Logo className="w-5 h-5" />
            <span className="hidden sm:inline">agent-board</span>
          </button>
          {isSettings && (
            <span className="flex items-center gap-2 sm:gap-3">
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span className="text-zinc-600 dark:text-zinc-400">Settings</span>
            </span>
          )}
          {!isSettings && currentBoard && (
            <span className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <button
                onClick={handleBoardClick}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 max-w-24 sm:max-w-40 truncate"
              >
                {currentBoard.name}
              </button>
            </span>
          )}
          {!isSettings && selectedGoal && (
            <span className="hidden sm:flex items-center gap-3">
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span className="text-zinc-400 dark:text-zinc-500 truncate max-w-48">{selectedGoal.title}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          {currentBoard && sseStatus !== 'connected' && (
            <span
              className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400"
              title={sseStatus === 'connecting' ? 'Reconnecting...' : 'Disconnected'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sseStatus === 'connecting' ? 'bg-amber-500 dark:bg-amber-400 animate-pulse' : 'bg-red-500 dark:bg-red-400'}`} />
              <span className="hidden sm:inline">{sseStatus === 'connecting' ? 'Reconnecting' : 'Offline'}</span>
            </span>
          )}
          <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            {user?.displayName || user?.username}
            {user?.isAgent && <span className="ml-1 text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">agent</span>}
          </span>
          <button
            onClick={cycleTheme}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            title={`Theme: ${theme}`}
          >
            {theme === 'light' ? (
              <Sun className="w-5 h-5" />
            ) : theme === 'dark' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`flex items-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 ${isSettings ? 'text-zinc-900 dark:text-zinc-100' : ''}`}
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline ml-1">Settings</span>
          </button>
          <button onClick={handleLogout} className="flex items-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline ml-1">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
