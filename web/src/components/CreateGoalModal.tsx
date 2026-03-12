import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface CreateGoalModalProps {
  status: string;
  statusLabel: string;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; acceptanceCriteria: string; subtasks: string[] }) => void;
}

export function CreateGoalModal({ status, statusLabel, onClose, onCreate }: CreateGoalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        acceptanceCriteria: acceptanceCriteria.trim(),
        subtasks: subtasks.filter(s => s.trim()),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, newSubtask.trim()]);
    setNewSubtask('');
    subtaskInputRef.current?.focus();
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">New Goal</h3>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700">
              {statusLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              type="text"
              placeholder="Goal title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  // Move focus to description
                  (e.target as HTMLInputElement).form?.querySelector('textarea')?.focus();
                }
              }}
              className="w-full px-3 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              placeholder="Description (optional, supports markdown)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none"
            />
          </div>

          {/* Acceptance Criteria */}
          <div>
            <textarea
              placeholder="Acceptance criteria (optional, supports markdown)"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none"
            />
          </div>

          {/* Subtasks */}
          <div>
            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
              Subtasks
            </h4>
            {subtasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {subtasks.map((subtask, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1.5 border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 group"
                  >
                    <span className="w-4 h-4 border border-zinc-300 dark:border-zinc-600 flex-shrink-0" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{subtask}</span>
                    <button
                      onClick={() => removeSubtask(index)}
                      className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      {'\u2715'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={subtaskInputRef}
                type="text"
                placeholder="Add subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
                className="flex-1 px-2 py-1 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
              />
              <button
                onClick={addSubtask}
                className="px-2 py-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-300 dark:text-zinc-600">
            {navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter to submit
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="px-4 py-1.5 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
