import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { KanbanColumn } from '../components/KanbanColumn';
import { InviteModal } from '../components/InviteModal';

const STATUSES = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

export function Board() {
  const { currentBoard, setCurrentBoard, goals, fetchGoals, setSelectedGoal, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');

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

  useEffect(() => {
    if (currentBoard) {
      fetchGoals(currentBoard.id).finally(() => setLoading(false));
    }
  }, [currentBoard?.id]);

  const handleCreateGoal = async (status: string) => {
    if (!newGoalTitle.trim() || !currentBoard) return;
    await api.createGoal(currentBoard.id, { title: newGoalTitle, status });
    setNewGoalTitle('');
    setShowNewGoal(null);
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
  };

  if (loading) return <div className="text-zinc-400 dark:text-zinc-500 text-sm">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{currentBoard?.name}</h2>
          {currentBoard?.description && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">{currentBoard.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
          >
            Share
          </button>
        </div>
      </div>

      {/* Members bar */}
      <div className="flex gap-2 mb-4 text-xs text-zinc-400 dark:text-zinc-500 flex-wrap">
        {currentBoard?.members?.map((m: any) => (
          <div key={m.userId} className="flex items-center gap-1 border border-zinc-100 dark:border-zinc-800 px-2 py-0.5 bg-zinc-50 dark:bg-zinc-900 group">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {m.displayName || m.username}
            </span>
            {m.isAgent && <span className="text-zinc-300 dark:text-zinc-600 text-xs">●</span>}
            {isOwner && (
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleRole(m); }}
                className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 ml-1"
                title={`Role: ${m.role}`}
              >
                {m.role === 'owner' ? '\u{1F451}' : '\u00B7'}
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
            onOpenGoal={handleOpenGoal}
            onMoveGoal={handleMoveGoal}
            showNewGoal={showNewGoal === key}
            onShowNewGoal={() => { setShowNewGoal(key); setNewGoalTitle(''); }}
            newGoalTitle={newGoalTitle}
            onNewGoalTitleChange={setNewGoalTitle}
            onCreateGoal={() => handleCreateGoal(key)}
            onCancelNewGoal={() => setShowNewGoal(null)}
          />
        ))}
      </div>

      {showInvite && (
        <InviteModal boardId={currentBoard.id} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}
