import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { KanbanColumn } from '../components/KanbanColumn';
import { InviteModal } from '../components/InviteModal';
import { CreateGoalModal } from '../components/CreateGoalModal';
import { Crown } from 'lucide-react';

const STATUSES = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

interface BoardProps {
  navigate: (to: string) => void;
}

export function Board({ navigate }: BoardProps) {
  const { currentBoard, setCurrentBoard, goals, fetchGoals, setSelectedGoal, user, fetchBoards } = useStore();
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [createGoalStatus, setCreateGoalStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentMembership = currentBoard?.members?.find((m: any) => m.userId === user?.id);
  const isOwner = currentMembership?.role === 'owner';

  const refreshBoard = async () => {
    if (!currentBoard) return;
    const board = await api.getBoard(currentBoard.id);
    setCurrentBoard(board);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentBoard) return;
    try {
      await api.removeMember(currentBoard.id, userId);
      await refreshBoard();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleRole = async (member: any) => {
    if (!currentBoard) return;
    const newRole = member.role === 'owner' ? 'member' : 'owner';
    try {
      await api.updateMemberRole(currentBoard.id, member.userId, newRole);
      await refreshBoard();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const startEditing = () => {
    if (!currentBoard) return;
    setEditName(currentBoard.name || '');
    setEditDescription(currentBoard.description || '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!currentBoard || !editName.trim()) return;
    try {
      await api.updateBoard(currentBoard.id, { name: editName.trim(), description: editDescription.trim() || undefined });
      await refreshBoard();
      setEditing(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteBoard = async () => {
    if (!currentBoard) return;
    try {
      await api.deleteBoard(currentBoard.id);
      setCurrentBoard(null);
      await fetchBoards();
      navigate('/');
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => {
    if (currentBoard) {
      fetchGoals(currentBoard.id).finally(() => setLoading(false));
    }
  }, [currentBoard?.id]);

  const handleCreateGoal = async (status: string, data: { title: string; description: string; subtasks: string[] }) => {
    if (!data.title.trim() || !currentBoard) return;
    const goal = await api.createGoal(currentBoard.id, {
      title: data.title,
      description: data.description || undefined,
      status,
    });
    // Create subtasks if any
    for (const subtaskTitle of data.subtasks) {
      if (subtaskTitle.trim()) {
        await api.createSubtask(goal.id, subtaskTitle.trim());
      }
    }
    setCreateGoalStatus(null);
    await fetchGoals(currentBoard.id);
  };

  const handleMoveGoal = async (goalId: string, newStatus: string) => {
    if (!currentBoard) return;
    await api.updateGoal(currentBoard.id, goalId, { status: newStatus });
    await fetchGoals(currentBoard.id);
  };

  const handleOpenGoal = async (goalId: string) => {
    if (!currentBoard) return;
    const goal = await api.getGoal(currentBoard.id, goalId);
    setSelectedGoal(goal);
    navigate('/b/' + currentBoard.id + '/' + goalId);
  };

  if (loading) return <div className="text-zinc-400 dark:text-zinc-500 text-sm">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-lg font-bold bg-transparent border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(false); }}
              />
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="text-sm bg-transparent border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-zinc-600 dark:text-zinc-400 outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(false); }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2
                className={`text-lg font-bold text-zinc-900 dark:text-zinc-100 ${isOwner ? 'cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300' : ''}`}
                onClick={isOwner ? startEditing : undefined}
                title={isOwner ? 'Click to edit' : undefined}
              >
                {currentBoard?.name}
              </h2>
              {currentBoard?.description && (
                <p
                  className={`text-sm text-zinc-400 dark:text-zinc-500 ${isOwner ? 'cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300' : ''}`}
                  onClick={isOwner ? startEditing : undefined}
                >
                  {currentBoard.description}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          {isOwner && !editing && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 text-red-500 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Delete
            </button>
          )}
          <button
            onClick={() => setShowInvite(true)}
            className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
          >
            Share
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">Delete Board</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Are you sure you want to delete <strong>{currentBoard?.name}</strong>? This action cannot be undone. All goals, subtasks, and comments will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBoard}
                className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700"
              >
                Delete Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members bar */}
      <div className="flex gap-2 mb-4 text-xs text-zinc-400 dark:text-zinc-500 flex-wrap">
        {currentBoard?.members?.map((m: any) => (
          <div key={m.userId} className="flex items-center gap-1 border border-zinc-100 dark:border-zinc-800 px-2 py-0.5 bg-zinc-50 dark:bg-zinc-900 group">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {m.displayName || m.username}
            </span>
            {m.isAgent && <span className="text-zinc-300 dark:text-zinc-600 text-xs">{'\u25cf'}</span>}
            {isOwner && (
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleRole(m); }}
                className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 ml-1"
                title={`Role: ${m.role}`}
              >
                {m.role === 'owner' ? (
                  <Crown className="w-3 h-3 inline" />
                ) : '\u00b7'}
              </button>
            )}
            {isOwner && m.userId !== user?.id && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.userId); }}
                className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 ml-0.5"
              >
                &times;
              </button>
            )}
            {!isOwner && m.userId === user?.id && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.userId); }}
                className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 ml-1"
                title="Leave board"
              >
                Leave
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUSES.map(({ key, label }) => (
          <KanbanColumn
            key={key}
            status={key}
            label={label}
            goals={goals.filter((g) => g.status === key)}
            members={currentBoard?.members}
            onOpenGoal={handleOpenGoal}
            onMoveGoal={handleMoveGoal}
            onShowNewGoal={() => setCreateGoalStatus(key)}
          />
        ))}
      </div>

      {createGoalStatus && (
        <CreateGoalModal
          status={createGoalStatus}
          statusLabel={STATUSES.find(s => s.key === createGoalStatus)?.label || createGoalStatus}
          onClose={() => setCreateGoalStatus(null)}
          onCreate={(data) => handleCreateGoal(createGoalStatus, data)}
        />
      )}

      {showInvite && (
        <InviteModal boardId={currentBoard.id} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}
