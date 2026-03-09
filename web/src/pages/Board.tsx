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
  const { currentBoard, goals, fetchGoals, setSelectedGoal } = useStore();
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');

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

  if (loading) return <div className="text-zinc-400 text-sm">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{currentBoard?.name}</h2>
          {currentBoard?.description && (
            <p className="text-sm text-zinc-400">{currentBoard.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="px-3 py-1.5 text-sm border border-zinc-200 text-zinc-600 hover:border-zinc-400"
          >
            Share
          </button>
        </div>
      </div>

      {/* Members bar */}
      <div className="flex gap-2 mb-4 text-xs text-zinc-400 flex-wrap">
        {currentBoard?.members?.map((m: any) => (
          <span key={m.userId} className="border border-zinc-100 px-2 py-0.5 bg-zinc-50">
            {m.displayName || m.username}
            {m.isAgent && <span className="ml-1 text-zinc-300">●</span>}
          </span>
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
