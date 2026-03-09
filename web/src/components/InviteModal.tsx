import { useState } from 'react';
import { api } from '../api';

interface InviteModalProps {
  boardId: string;
  onClose: () => void;
}

export function InviteModal({ boardId, onClose }: InviteModalProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await api.createInvite(boardId, { expiresInHours: 168 }); // 7 days
      setInviteUrl(result.url || `${window.location.origin}/join/${result.token}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white border border-zinc-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-zinc-900 mb-4">Share Board</h3>

        {!inviteUrl ? (
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-2 bg-zinc-900 text-white text-sm hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Generate Invite Link'}
          </button>
        ) : (
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-zinc-200 text-xs text-zinc-600 bg-zinc-50"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-zinc-900 text-white text-xs hover:bg-zinc-800"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Link expires in 7 days.</p>
          </div>
        )}

        <button onClick={onClose} className="mt-4 text-sm text-zinc-400 hover:text-zinc-600">
          Close
        </button>
      </div>
    </div>
  );
}
