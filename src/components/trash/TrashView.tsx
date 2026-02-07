import { useState } from 'react';
import { useNoteStore, useWorkspaceStore } from '../../store';
import { X, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

interface TrashViewProps {
  onClose: () => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function TrashView({ onClose }: TrashViewProps) {
  const { trashedNotes, restoreNote, permanentlyDeleteNote, emptyTrash } = useNoteStore();
  const { openNote } = useWorkspaceStore();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const handleOpenNote = async (id: string, title: string) => {
    await restoreNote(id);
    openNote(id, title);
    onClose();
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setConfirmEmpty(false);
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-secondary">
        <span className="text-sm font-medium text-text-primary">
          Trash
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted mr-1">
            {trashedNotes.length} {trashedNotes.length === 1 ? 'item' : 'items'}
          </span>
          {trashedNotes.length > 0 && (
            <button
              onClick={() => setConfirmEmpty(true)}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer"
              title="Empty trash"
            >
              Empty Trash
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Close trash"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {confirmEmpty && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border-b border-red-500/20">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-400 flex-1">
            Permanently delete {trashedNotes.length} {trashedNotes.length === 1 ? 'note' : 'notes'}?
          </span>
          <button
            onClick={handleEmptyTrash}
            className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            Delete All
          </button>
          <button
            onClick={() => setConfirmEmpty(false)}
            className="text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {trashedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Trash2 size={48} strokeWidth={1} className="mb-4 opacity-50" />
            <p className="text-lg">Trash is empty</p>
            <p className="text-sm mt-2 text-center px-8">
              Deleted notes will appear here
            </p>
          </div>
        ) : (
          <div className="py-1">
            {trashedNotes.map(note => (
              <div
                key={note.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-bg-hover transition-colors group"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleOpenNote(note.id, note.title)}
                >
                  <div className="text-sm text-text-primary truncate hover:underline">
                    {note.title}
                  </div>
                  <div className="text-xs text-text-faint">
                    {note.deletedAt ? timeAgo(note.deletedAt) : ''}
                  </div>
                </div>
                <button
                  onClick={() => restoreNote(note.id)}
                  className="shrink-0 p-1.5 rounded hover:bg-bg-tertiary text-text-faint hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Restore note"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => permanentlyDeleteNote(note.id)}
                  className="shrink-0 p-1.5 rounded hover:bg-red-500/10 text-text-faint hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Delete permanently"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
