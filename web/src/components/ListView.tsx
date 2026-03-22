import { useState } from 'react';
import { ChevronRight, Plus, Archive } from 'lucide-react';
import { useTouchDrag } from '../hooks/useTouchDrag';
import { SwipeableCard } from './SwipeableCard';
import type { Goal, BoardMember } from '../types';

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

interface ListViewProps {
  statuses: { key: string; label: string }[];
  goals: Goal[];
  members?: BoardMember[];
  onOpenGoal: (goalId: string) => void;
  onMoveGoal: (goalId: string, newStatus: string) => void;
  onArchiveGoal: (goalId: string) => void;
  onShowNewGoal: (status: string) => void;
}

export function ListView({
  statuses,
  goals,
  members,
  onOpenGoal,
  onMoveGoal,
  onArchiveGoal,
  onShowNewGoal,
}: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Touch drag-and-drop for mobile
  const { onTouchStart } = useTouchDrag({
    onDrop: (goalId, targetStatus) => {
      const goal = goals.find(g => g.id === goalId);
      if (goal && goal.status !== targetStatus) {
        onMoveGoal(goalId, targetStatus);
      }
    },
  });

  const toggleCollapse = (status: string) => {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className="space-y-4">
      {statuses.map(({ key, label }) => {
        const statusGoals = goals.filter((g) => g.status === key);
        const isCollapsed = collapsed[key] ?? false;

        return (
          <div key={key} data-status={key}>
            {/* Status header */}
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => toggleCollapse(key)}
                className="flex items-center gap-2 group"
              >
                <ChevronRight
                  className={`w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 transition-transform ${
                    isCollapsed ? '' : 'rotate-90'
                  }`}
                />
                <div className={`w-2 h-2 ${STATUS_COLORS[key]}`} />
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  {label}
                </h3>
                <span className="text-xs text-zinc-300 dark:text-zinc-600">
                  {statusGoals.length}
                </span>
              </button>
              <button
                onClick={() => onShowNewGoal(key)}
                className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 leading-none"
                title="Add goal"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Goal list */}
            {!isCollapsed && (
              <div className="space-y-1">
                {statusGoals.length === 0 && (
                  <p className="text-xs text-zinc-300 dark:text-zinc-600 pl-7 py-2">
                    No goals
                  </p>
                )}
                {statusGoals.map((goal) => {
                  const assignee = goal.assigneeId
                    ? members?.find((m) => m.userId === goal.assigneeId)
                    : null;

                  return (
                    <SwipeableCard
                      key={goal.id}
                      className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer group"
                      onClick={() => onOpenGoal(goal.id)}
                      onTouchStart={(e) => onTouchStart(e, goal.id)}
                      onArchive={() => onArchiveGoal(goal.id)}
                    >
                      {/* Title + description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium leading-snug truncate">
                          {goal.title}
                        </p>
                        {goal.description && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                            {goal.description}
                          </p>
                        )}
                      </div>

                      {/* Actions — hidden on touch devices, visible on pointer (mouse) hover */}
                      <div className="hidden pointer-fine:flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {PREV_STATUS[key] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveGoal(goal.id, PREV_STATUS[key]);
                            }}
                            className="text-xs px-1.5 py-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                          >
                            &larr;
                          </button>
                        )}
                        {NEXT_STATUS[key] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveGoal(goal.id, NEXT_STATUS[key]);
                            }}
                            className="text-xs px-1.5 py-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                          >
                            &rarr;
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchiveGoal(goal.id);
                          }}
                          className="text-xs px-1.5 py-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                          title="Archive"
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Assignee avatar */}
                      {assignee && (
                        <span
                          className="flex-shrink-0 w-5 h-5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium flex items-center justify-center rounded-full"
                          title={assignee.displayName || assignee.username || ''}
                        >
                          {(assignee.displayName || assignee.username || '').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </SwipeableCard>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
