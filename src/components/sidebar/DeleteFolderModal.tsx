import { useState } from 'react';
import { X, AlertTriangle, Trash2, FolderOutput } from 'lucide-react';
import type { Folder } from '../../types';

interface DeleteFolderModalProps {
  folder: { id: string; name: string };
  noteCount: number;
  otherFolders: Folder[];
  onDeleteAll: () => void;
  onMoveAndDelete: (targetFolderId: string | null) => void;
  onClose: () => void;
}

export function DeleteFolderModal({ folder, noteCount, otherFolders, onDeleteAll, onMoveAndDelete, onClose }: DeleteFolderModalProps) {
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <h2 className="text-lg font-semibold text-text-primary">Delete Folder</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3 mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                "{folder.name}" contains {noteCount} {noteCount === 1 ? 'note' : 'notes'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Choose what to do with the notes before deleting this folder.
              </p>
            </div>
          </div>

          {/* Move option */}
          <div className="mb-3 p-3 border border-border-primary rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FolderOutput size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-primary">Move notes, then delete folder</span>
            </div>
            <select
              value={targetFolderId ?? '__root__'}
              onChange={(e) => setTargetFolderId(e.target.value === '__root__' ? null : e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-bg-tertiary border border-border-primary rounded focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="__root__">/ (root)</option>
              {otherFolders.map(f => (
                <option key={f.id} value={f.id}>{f.path}</option>
              ))}
            </select>
            <button
              onClick={() => onMoveAndDelete(targetFolderId)}
              className="mt-2 w-full px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded transition-colors cursor-pointer"
            >
              Move notes and delete folder
            </button>
          </div>

          {/* Delete all option */}
          <button
            onClick={onDeleteAll}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            Delete folder and all {noteCount} {noteCount === 1 ? 'note' : 'notes'}
          </button>
        </div>
      </div>
    </div>
  );
}
