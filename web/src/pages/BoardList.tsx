import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';

export function BoardList() {
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
  };

  if (loading) return <div className="text-zinc-400 text-sm">Loading boards...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-zinc-900">Boards</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 text-sm bg-zinc-900 text-white hover:bg-zinc-800"
        >
          + New Board
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 border border-zinc-200 p-4 space-y-3">
          <input
            type="text"
            placeholder="Board name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:border-zinc-900"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:border-zinc-900"
          />
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 text-sm bg-zinc-900 text-white hover:bg-zinc-800">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900">Cancel</button>
          </div>
        </form>
      )}

      {boards.length === 0 ? (
        <p className="text-sm text-zinc-400">No boards yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={async () => {
                const full = await api.getBoard(board.id);
                setCurrentBoard(full);
              }}
              className="border border-zinc-200 p-4 text-left hover:border-zinc-400 transition-colors"
            >
              <h3 className="font-medium text-zinc-900 text-sm">{board.name}</h3>
              {board.description && (
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{board.description}</p>
              )}
              <p className="text-xs text-zinc-300 mt-2">
                {board.role}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
