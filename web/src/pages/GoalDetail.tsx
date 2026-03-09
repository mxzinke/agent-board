import { useState, useEffect, useRef, useCallback } from 'react';
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

interface GoalDetailProps {
  navigate: (to: string) => void;
}

export function GoalDetail({ navigate }: GoalDetailProps) {
  const { selectedGoal, setSelectedGoal, currentBoard, fetchGoals } = useStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(selectedGoal?.title || '');
  const [description, setDescription] = useState(selectedGoal?.description || '');
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [attachmentsList, setAttachmentsList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleEditSubtask = async (subtaskId: string) => {
    if (!editingSubtaskTitle.trim()) return;
    await api.updateSubtask(selectedGoal.id, subtaskId, { title: editingSubtaskTitle.trim() });
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
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

  const loadAttachments = useCallback(async () => {
    if (!selectedGoal) return;
    try {
      const files = await api.listAttachments(selectedGoal.id);
      setAttachmentsList(files);
    } catch { /* ignore */ }
  }, [selectedGoal?.id]);

  useEffect(() => { loadAttachments(); }, [loadAttachments]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!selectedGoal) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadAttachment(selectedGoal.id, file);
      }
      await loadAttachments();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    await api.deleteAttachment(id);
    await loadAttachments();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDelete = async () => {
    if (!confirm('Delete this goal?')) return;
    await api.deleteGoal(currentBoard.id, selectedGoal.id);
    setSelectedGoal(null);
    await fetchGoals(currentBoard.id);
    navigate('/b/' + currentBoard.id);
  };

  const handleBack = () => {
    setSelectedGoal(null);
    navigate('/b/' + currentBoard.id);
  };

  const subtasksDone = selectedGoal.subtasks?.filter((s: any) => s.done).length || 0;
  const subtasksTotal = selectedGoal.subtasks?.length || 0;

  return (
    <div
      className={`max-w-2xl ${dragOver ? 'ring-2 ring-zinc-400 dark:ring-zinc-500 ring-offset-4 dark:ring-offset-zinc-950' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Back link */}
      <button
        onClick={handleBack}
        className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 mb-4 inline-block"
      >
        &larr; Back to board
      </button>

      {/* Header */}
      <div className="mb-6">
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
              autoFocus
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Description..."
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-zinc-400 dark:text-zinc-500">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <h2
              className="text-lg font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-400"
              onClick={() => { setEditing(true); setTitle(selectedGoal.title); setDescription(selectedGoal.description || ''); }}
            >
              {selectedGoal.title}
            </h2>
            {selectedGoal.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 whitespace-pre-wrap">{selectedGoal.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`px-2 py-1 text-xs border ${
              selectedGoal.status === s
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Subtasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Subtasks {subtasksTotal > 0 && `(${subtasksDone}/${subtasksTotal})`}
          </h3>
        </div>

        {subtasksTotal > 0 && (
          <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 mb-3">
            <div
              className="h-1 bg-zinc-900 dark:bg-zinc-100 transition-all"
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
                  subtask.done ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-950' : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500 dark:hover:border-zinc-400'
                }`}
              >
                {subtask.done && '\u2713'}
              </button>
              {editingSubtaskId === subtask.id ? (
                <input
                  type="text"
                  value={editingSubtaskTitle}
                  onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSubtask(subtask.id);
                    if (e.key === 'Escape') { setEditingSubtaskId(null); setEditingSubtaskTitle(''); }
                  }}
                  onBlur={() => handleEditSubtask(subtask.id)}
                  autoFocus
                  className="flex-1 px-1 py-0 text-sm border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                />
              ) : (
                <span
                  className={`text-sm flex-1 cursor-pointer ${subtask.done ? 'line-through text-zinc-300 dark:text-zinc-600' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                  onClick={() => { setEditingSubtaskId(subtask.id); setEditingSubtaskTitle(subtask.title); }}
                >
                  {subtask.title}
                </span>
              )}
              <button
                onClick={() => handleDeleteSubtask(subtask.id)}
                className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"
              >
                {'\u2715'}
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
            className="flex-1 px-2 py-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
          />
          <button onClick={handleAddSubtask} className="px-2 py-1 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950">Add</button>
        </div>
      </div>

      {/* Attachments */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Files {attachmentsList.length > 0 && `(${attachmentsList.length})`}
          </h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
          >
            {uploading ? 'Uploading...' : '+ Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
          />
        </div>

        {attachmentsList.length > 0 ? (
          <div className="space-y-1">
            {attachmentsList.map((att: any) => (
              <div key={att.id} className="flex items-center justify-between py-1.5 px-2 border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 group">
                <a
                  href={api.downloadAttachment(att.id)}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-2 min-w-0 flex-1"
                  onClick={(e) => {
                    e.preventDefault();
                    const token = localStorage.getItem('agent-board-token');
                    fetch(api.downloadAttachment(att.id), {
                      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    }).then(r => r.blob()).then(blob => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = att.filename;
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                  }}
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{att.filename}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">{formatFileSize(att.size)}</span>
                </a>
                <button
                  onClick={() => handleDeleteAttachment(att.id)}
                  className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 ml-2"
                >
                  {'\u2715'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-300 dark:text-zinc-600">Drop files here or click Upload</p>
        )}
      </div>

      {/* Comments */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          Discussion ({selectedGoal.comments?.length || 0})
        </h3>

        <div className="space-y-3 mb-4">
          {selectedGoal.comments?.map((comment: any) => (
            <div key={comment.id} className="border-l-2 border-zinc-100 dark:border-zinc-800 pl-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {comment.authorDisplayName || comment.authorUsername}
                </span>
                {comment.authorIsAgent && (
                  <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700">agent</span>
                )}
                <span className="text-xs text-zinc-300 dark:text-zinc-600">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="self-end px-3 py-2 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
        <button onClick={handleDelete} className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500">
          Delete goal
        </button>
      </div>
    </div>
  );
}
