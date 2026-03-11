import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import type { Goal, BoardMember } from '../types';

interface KanbanColumnProps {
  status: string;
  label: string;
  goals: Goal[];
  members?: BoardMember[];
  onOpenGoal: (goalId: string) => void;
  onMoveGoal: (goalId: string, newStatus: string) => void;
  onReorderGoals: (status: string, orderedIds: string[]) => void;
  onShowNewGoal: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-zinc-100 dark:bg-zinc-700',
  todo: 'bg-zinc-200 dark:bg-zinc-600',
  in_progress: 'bg-amber-100 dark:bg-amber-900',
  review: 'bg-blue-100 dark:bg-blue-900',
  done: 'bg-emerald-100 dark:bg-emerald-900',
};

const NEXT_STATUS: Record<string, string> = {
  backlog: 'todo',
  todo: 'in_progress',
  in_progress: 'review',
  review: 'done',
};

const PREV_STATUS: Record<string, string> = {
  todo: 'backlog',
  in_progress: 'todo',
  review: 'in_progress',
  done: 'review',
};

export function KanbanColumn({
  status,
  label,
  goals,
  members,
  onOpenGoal,
  onMoveGoal,
  onReorderGoals,
  onShowNewGoal,
}: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);

    // Calculate insertion index based on cursor Y position
    let insertIdx = goals.length; // default: append at end
    for (let i = 0; i < goals.length; i++) {
      const el = cardRefs.current.get(goals[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        insertIdx = i;
        break;
      }
    }
    // Don't show indicator right before or after the dragged item (same position)
    if (draggedId) {
      const dragIdx = goals.findIndex(g => g.id === draggedId);
      if (insertIdx === dragIdx || insertIdx === dragIdx + 1) {
        setDropIndex(null);
        return;
      }
    }
    setDropIndex(insertIdx);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
    setDropIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const goalId = e.dataTransfer.getData('text/plain');
    const fromStatus = e.dataTransfer.getData('application/x-status');

    if (!goalId) { setDropIndex(null); return; }

    if (fromStatus === status && dropIndex !== null) {
      // Same-column reorder
      const currentIds = goals.map(g => g.id);
      const fromIdx = currentIds.indexOf(goalId);
      if (fromIdx === -1) { setDropIndex(null); return; }

      const newIds = [...currentIds];
      newIds.splice(fromIdx, 1);
      const insertAt = dropIndex > fromIdx ? dropIndex - 1 : dropIndex;
      newIds.splice(insertAt, 0, goalId);

      if (newIds.join(',') !== currentIds.join(',')) {
        onReorderGoals(status, newIds);
      }
    } else if (fromStatus !== status) {
      // Cross-column move
      onMoveGoal(goalId, status);
    }

    setDropIndex(null);
    setDraggedId(null);
  };

  const handleDragStart = (e: React.DragEvent, goal: Goal) => {
    e.dataTransfer.setData('text/plain', goal.id);
    e.dataTransfer.setData('application/x-status', status);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(goal.id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropIndex(null);
    setDragOver(false);
  };

  const insertIndicator = (
    <div className="h-0.5 bg-zinc-900 dark:bg-zinc-100 rounded-full mx-1 my-0.5" />
  );

  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${STATUS_COLORS[status]}`} />
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</h3>
          <span className="text-xs text-zinc-300 dark:text-zinc-600">{goals.length}</span>
        </div>
        <button
          onClick={onShowNewGoal}
          className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 leading-none"
          title="Add goal"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div
        className={`space-y-2 min-h-[200px] transition-colors ${dragOver ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {goals.map((goal, index) => (
          <div key={goal.id}>
            {dropIndex === index && insertIndicator}
            <div
              ref={(el) => { if (el) cardRefs.current.set(goal.id, el); }}
              draggable
              onDragStart={(e) => handleDragStart(e, goal)}
              onDragEnd={handleDragEnd}
              className={`border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-3 cursor-grab active:cursor-grabbing hover:border-zinc-400 dark:hover:border-zinc-500 group ${
                draggedId === goal.id ? 'opacity-40' : ''
              }`}
              onClick={() => onOpenGoal(goal.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium leading-snug">{goal.title}</p>
                {goal.assigneeId && (() => {
                  const member = members?.find((m) => m.userId === goal.assigneeId);
                  if (!member) return null;
                  const name = member.displayName || member.username || '';
                  const initial = name.charAt(0).toUpperCase();
                  return (
                    <span
                      className="flex-shrink-0 w-5 h-5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium flex items-center justify-center rounded-full"
                      title={name}
                    >
                      {initial}
                    </span>
                  );
                })()}
              </div>
              {goal.description && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">{goal.description}</p>
              )}
              {/* Move buttons */}
              <div className="flex gap-1 mt-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {PREV_STATUS[status] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveGoal(goal.id, PREV_STATUS[status]); }}
                    className="text-xs px-1.5 py-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                  >
                    &larr;
                  </button>
                )}
                {NEXT_STATUS[status] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveGoal(goal.id, NEXT_STATUS[status]); }}
                    className="text-xs px-1.5 py-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                  >
                    &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {dropIndex === goals.length && insertIndicator}
      </div>
    </div>
  );
}
