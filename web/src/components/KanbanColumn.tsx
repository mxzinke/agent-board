interface KanbanColumnProps {
  status: string;
  label: string;
  goals: any[];
  onOpenGoal: (goalId: string) => void;
  onMoveGoal: (goalId: string, newStatus: string) => void;
  showNewGoal: boolean;
  onShowNewGoal: () => void;
  newGoalTitle: string;
  onNewGoalTitleChange: (title: string) => void;
  onCreateGoal: () => void;
  onCancelNewGoal: () => void;
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
  onOpenGoal,
  onMoveGoal,
  showNewGoal,
  onShowNewGoal,
  newGoalTitle,
  onNewGoalTitleChange,
  onCreateGoal,
  onCancelNewGoal,
}: KanbanColumnProps) {
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
          className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 text-lg leading-none"
          title="Add goal"
        >
          +
        </button>
      </div>

      <div className="space-y-2 min-h-[200px]">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-3 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 group"
            onClick={() => onOpenGoal(goal.id)}
          >
            <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium leading-snug">{goal.title}</p>
            {goal.description && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">{goal.description}</p>
            )}
            {/* Move buttons */}
            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        ))}

        {showNewGoal && (
          <div className="border border-zinc-300 dark:border-zinc-600 p-2">
            <input
              type="text"
              placeholder="Goal title..."
              value={newGoalTitle}
              onChange={(e) => onNewGoalTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreateGoal();
                if (e.key === 'Escape') onCancelNewGoal();
              }}
              className="w-full px-2 py-1 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
              autoFocus
            />
            <div className="flex gap-1 mt-1">
              <button onClick={onCreateGoal} className="text-xs px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950">Add</button>
              <button onClick={onCancelNewGoal} className="text-xs px-2 py-1 text-zinc-400 dark:text-zinc-500">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
