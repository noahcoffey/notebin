import { useState } from 'react';
import { X, Copy, Check, Loader2, Globe, Lock } from 'lucide-react';
import { useNoteStore } from '../../store';
import type { Note } from '../../types';

interface ShareModalProps {
  note: Note;
  onClose: () => void;
}

export function ShareModal({ note, onClose }: ShareModalProps) {
  const { updateNote } = useNoteStore();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPublic = note.isPublic ?? false;
  const shareUrl = `${window.location.origin}/share/${note.id}`;

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      await updateNote(note.id, { isPublic: !isPublic });
    } catch (error) {
      console.error('Failed to update note visibility:', error);
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <h2 className="text-lg font-semibold text-text-primary">Share Note</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-4 p-3 bg-bg-tertiary rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe size={20} className="text-green-500" />
              ) : (
                <Lock size={20} className="text-text-muted" />
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-xs text-text-muted">
                  {isPublic ? 'Anyone with the link can view' : 'Only you can access'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isPublic
                  ? 'bg-bg-hover text-text-primary hover:bg-bg-active'
                  : 'bg-accent text-white hover:bg-accent/90'
              } disabled:opacity-50`}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isPublic ? (
                'Make Private'
              ) : (
                'Make Public'
              )}
            </button>
          </div>

          {isPublic && (
            <div>
              <p className="text-sm text-text-muted mb-2">Share this link:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-accent text-white rounded hover:bg-accent/90 transition-colors flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
