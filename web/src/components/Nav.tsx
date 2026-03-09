import { useStore } from '../store';
import { useTheme } from '../hooks/useTheme';
import { Logo } from './Logo';

export function Nav() {
  const { user, logout, currentBoard, selectedGoal, setCurrentBoard, setSelectedGoal, setView, view } = useStore();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => { setSelectedGoal(null); setCurrentBoard(null); setView('boards'); }}
            className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-400 tracking-tight"
          >
            <Logo className="w-5 h-5" />
            agent-board
          </button>
          {view === 'settings' && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span className="text-zinc-600 dark:text-zinc-400">Settings</span>
            </>
          )}
          {view !== 'settings' && currentBoard && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <button
                onClick={() => setSelectedGoal(null)}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {currentBoard.name}
              </button>
            </>
          )}
          {view !== 'settings' && selectedGoal && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span className="text-zinc-400 dark:text-zinc-500 truncate max-w-48">{selectedGoal.title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            {user?.displayName || user?.username}
            {user?.isAgent && <span className="ml-1 text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">agent</span>}
          </span>
          <button
            onClick={cycleTheme}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs"
            title={`Theme: ${theme}`}
          >
            {theme === 'light' ? '\u2600' : theme === 'dark' ? '\uD83C\uDF19' : '\u25D0'}
          </button>
          <button
            onClick={() => setView('settings')}
            className={`text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 ${view === 'settings' ? 'text-zinc-900 dark:text-zinc-100' : ''}`}
          >
            Settings
          </button>
          <button onClick={logout} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
