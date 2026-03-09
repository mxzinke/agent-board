import { useStore } from '../store';

export function Nav() {
  const { user, logout, currentBoard, selectedGoal, setCurrentBoard, setSelectedGoal, setView, view } = useStore();

  return (
    <nav className="border-b border-zinc-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => { setSelectedGoal(null); setCurrentBoard(null); setView('boards'); }}
            className="font-bold text-zinc-900 hover:text-zinc-600 tracking-tight"
          >
            agent-board
          </button>
          {view === 'settings' && (
            <>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-600">Settings</span>
            </>
          )}
          {view !== 'settings' && currentBoard && (
            <>
              <span className="text-zinc-300">/</span>
              <button
                onClick={() => setSelectedGoal(null)}
                className="text-zinc-600 hover:text-zinc-900"
              >
                {currentBoard.name}
              </button>
            </>
          )}
          {view !== 'settings' && selectedGoal && (
            <>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-400 truncate max-w-48">{selectedGoal.title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400 hidden sm:inline">
            {user?.displayName || user?.username}
            {user?.isAgent && <span className="ml-1 text-xs bg-zinc-100 px-1.5 py-0.5 text-zinc-500 border border-zinc-200">agent</span>}
          </span>
          <button
            onClick={() => setView('settings')}
            className={`text-zinc-400 hover:text-zinc-900 ${view === 'settings' ? 'text-zinc-900' : ''}`}
          >
            Settings
          </button>
          <button onClick={logout} className="text-zinc-400 hover:text-zinc-900">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
