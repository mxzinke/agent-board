import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Star, GripVertical } from 'lucide-react';

interface BoardListProps {
  navigate: (to: string) => void;
}

export function BoardList({ navigate }: BoardListProps) {
  const { boards, fetchBoards, setCurrentBoard } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggedBoardId, setDraggedBoardId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

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

  const handleToggleFavorite = async (e: React.MouseEvent, boardId: string, currentFavorite: boolean) => {
    e.stopPropagation();
    await api.toggleFavorite(boardId, !currentFavorite);
    await fetchBoards();
  };

  const handleDragStart = (e: React.DragEvent, boardId: string) => {
    setDraggedBoardId(boardId);
    e.dataTransfer.setData('text/plain', boardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, boardId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedBoardId || boardId === draggedBoardId) return;

    const el = cardRefs.current.get(boardId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    setDropTargetId(boardId);
    setDropPosition(pos);
  };

  const handleDragEnd = () => {
    setDraggedBoardId(null);
    setDropTargetId(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedBoardId || !dropTargetId || draggedBoardId === dropTargetId) {
      handleDragEnd();
      return;
    }

    // Compute new order
    const currentOrder = boards.map(b => b.id);
    const fromIndex = currentOrder.indexOf(draggedBoardId);
    const toIndex = currentOrder.indexOf(dropTargetId);
    if (fromIndex === -1 || toIndex === -1) { handleDragEnd(); return; }

    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    const insertIndex = newOrder.indexOf(dropTargetId);
    const finalIndex = dropPosition === 'before' ? insertIndex : insertIndex + 1;
    newOrder.splice(finalIndex, 0, draggedBoardId);

    handleDragEnd();

    // Optimistic: reorder boards in store
    const reordered = newOrder.map(id => boards.find(b => b.id === id)!).filter(Boolean);
    useStore.setState({ boards: reordered });

    try {
      await api.reorderBoards(newOrder);
      await fetchBoards();
    } catch {
      await fetchBoards(); // revert
    }
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
            <div
              key={board.id}
              ref={(el) => { if (el) cardRefs.current.set(board.id, el); }}
              draggable
              onDragStart={(e) => handleDragStart(e, board.id)}
              onDragOver={(e) => handleDragOver(e, board.id)}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              onClick={async () => {
                const full = await api.getBoard(board.id);
                setCurrentBoard(full);
                navigate('/b/' + board.id);
              }}
              className={`relative border p-4 text-left cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors group/card ${
                draggedBoardId === board.id
                  ? 'opacity-40 border-zinc-300 dark:border-zinc-600'
                  : dropTargetId === board.id
                    ? dropPosition === 'before'
                      ? 'border-t-2 border-t-zinc-900 dark:border-t-zinc-100 border-zinc-200 dark:border-zinc-700'
                      : 'border-b-2 border-b-zinc-900 dark:border-b-zinc-100 border-zinc-200 dark:border-zinc-700'
                    : 'border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span
                  onClick={(e) => handleToggleFavorite(e, board.id, !!board.isFavorite)}
                  className="cursor-pointer transition-colors"
                  title={board.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`w-4 h-4 ${
                      board.isFavorite
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-300 dark:text-zinc-600 opacity-0 group-hover/card:opacity-100 hover:text-zinc-400 dark:hover:text-zinc-500'
                    }`}
                  />
                </span>
                <span
                  className="text-zinc-300 dark:text-zinc-600 opacity-0 group-hover/card:opacity-100 cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-4 h-4" />
                </span>
              </div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm pr-12">{board.name}</h3>
              {board.description && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">{board.description}</p>
              )}
              <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-2">
                {board.role}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
