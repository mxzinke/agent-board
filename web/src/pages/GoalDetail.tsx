import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export function GoalDetail() {
  const { selectedGoal, setSelectedGoal, currentBoard, fetchGoals } = useStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(selectedGoal?.title || '');
  const [description, setDescription] = useState(selectedGoal?.description || '');
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');

  if (!selectedGoal || !currentBoard) return null;

  const refresh = async () => {
    const goal = await api.getGoal(currentBoard.id, selectedGoal.id);
    setSelectedGoal(goal);
  };

  const handleSave = async () => {
    await api.updateGoal(currentBoard.id, selectedGoal.id, { title, description });
    setEditing(false);
    await refresh();
    await fetchGoals(currentBoard.id);
  };

  const handleStatusChange = async (status: string) => {
    await api.updateGoal(currentBoard.id, selectedGoal.id, { status });
    await refresh();
    await fetchGoals(currentBoard.id);
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await api.createSubtask(selectedGoal.id, newSubtask);
    setNewSubtask('');
    await refresh();
  };

  const handleToggleSubtask = async (subtaskId: string, done: boolean) => {
    await api.updateSubtask(selectedGoal.id, subtaskId, { done });
    await refresh();
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await api.deleteSubtask(selectedGoal.id, subtaskId);
    await refresh();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await api.createComment(selectedGoal.id, newComment);
    setNewComment('');
    await refresh();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this goal?')) return;
    await api.deleteGoal(currentBoard.id, selectedGoal.id);
    setSelectedGoal(null);
    await fetchGoals(currentBoard.id);
  };

  const subtasksDone = selectedGoal.subtasks?.filter((s: any) => s.done).length || 0;
  const subtasksTotal = selectedGoal.subtasks?.length || 0;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 text-lg font-bold focus:outline-none focus:border-zinc-900"
              autoFocus
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Description..."
              className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:border-zinc-900 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-zinc-900 text-white">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-zinc-400">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <h2
              className="text-lg font-bold text-zinc-900 cursor-pointer hover:text-zinc-600"
              onClick={() => { setEditing(true); setTitle(selectedGoal.title); setDescription(selectedGoal.description || ''); }}
            >
              {selectedGoal.title}
            </h2>
            {selectedGoal.description && (
              <p className="text-sm text-zinc-500 mt-2 whitespace-pre-wrap">{selectedGoal.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex gap-1 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`px-2 py-1 text-xs border ${
              selectedGoal.status === s
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-zinc-400 hover:border-zinc-400'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Subtasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Subtasks {subtasksTotal > 0 && `(${subtasksDone}/${subtasksTotal})`}
          </h3>
        </div>

        {subtasksTotal > 0 && (
          <div className="w-full h-1 bg-zinc-100 mb-3">
            <div
              className="h-1 bg-zinc-900 transition-all"
              style={{ width: `${(subtasksDone / subtasksTotal) * 100}%` }}
            />
          </div>
        )}

        <div className="space-y-1">
          {selectedGoal.subtasks?.map((subtask: any) => (
            <div key={subtask.id} className="flex items-center gap-2 group py-1">
              <button
                onClick={() => handleToggleSubtask(subtask.id, !subtask.done)}
                className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center text-xs ${
                  subtask.done ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-300 hover:border-zinc-500'
                }`}
              >
                {subtask.done && '\u2713'}
              </button>
              <span className={`text-sm flex-1 ${subtask.done ? 'line-through text-zinc-300' : 'text-zinc-700'}`}>
                {subtask.title}
              </span>
              <button
                onClick={() => handleDeleteSubtask(subtask.id)}
                className="text-xs text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
              >
                \u2715
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="Add subtask..."
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
            className="flex-1 px-2 py-1 border border-zinc-200 text-sm focus:outline-none focus:border-zinc-900"
          />
          <button onClick={handleAddSubtask} className="px-2 py-1 text-xs bg-zinc-900 text-white">Add</button>
        </div>
      </div>

      {/* Comments */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Discussion ({selectedGoal.comments?.length || 0})
        </h3>

        <div className="space-y-3 mb-4">
          {selectedGoal.comments?.map((comment: any) => (
            <div key={comment.id} className="border-l-2 border-zinc-100 pl-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-700">
                  {comment.authorDisplayName || comment.authorUsername}
                </span>
                {comment.authorIsAgent && (
                  <span className="text-xs bg-zinc-100 px-1 py-0.5 text-zinc-400 border border-zinc-200">agent</span>
                )}
                <span className="text-xs text-zinc-300">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="flex-1 px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:border-zinc-900 resize-none"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="self-end px-3 py-2 text-xs bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="border-t border-zinc-100 pt-4">
        <button onClick={handleDelete} className="text-xs text-zinc-300 hover:text-red-500">
          Delete goal
        </button>
      </div>
    </div>
  );
}
