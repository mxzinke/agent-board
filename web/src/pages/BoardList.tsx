import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';

interface BoardListProps {
  navigate: (to: string) => void;
}

export function BoardList({ navigate }: BoardListProps) {
  const { boards, fetchBoards, setCurrentBoard } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoards().finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const board = await api.createBoard({ name, description: description || undefined });
    setName('');
    setDescription('');
    setShowCreate(false);
    await fetchBoards();
    setCurrentBoard(board);
    navigate('/b/' + board.id);
  };

  if (loading) return <div className="text-zinc-400 dark:text-zinc-500 text-sm">Loading boards...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Boards</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          + New Board
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
          <input
            type="text"
            placeholder="Board name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
          />
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">Cancel</button>
          </div>
        </form>
      )}

      {boards.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No boards yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={async () => {
                const full = await api.getBoard(board.id);
                setCurrentBoard(full);
                navigate('/b/' + board.id);
              }}
              className="border border-zinc-200 dark:border-zinc-700 p-4 text-left hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
            >
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{board.name}</h3>
              {board.description && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">{board.description}</p>
              )}
              <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-2">
                {board.role}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
