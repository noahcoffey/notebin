import { useEffect, useState } from 'react';
import { useWorkspaceStore, useNoteStore } from '../../store';
import { backlinkStorage } from '../../services/storage';
import type { Backlink } from '../../types';
import { Link2, FileText } from 'lucide-react';

export function BacklinksPanel() {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(false);

  const { tabs, activeTabId, openNote } = useWorkspaceStore();
  const { getNoteById, notes } = useNoteStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeNote = activeTab ? getNoteById(activeTab.noteId) : undefined;

  useEffect(() => {
    if (!activeNote) {
      setBacklinks([]);
      return;
    }

    setLoading(true);
    backlinkStorage.getByTarget(activeNote.id)
      .then(links => {
        setBacklinks(links);
      })
      .catch(err => console.error('Error fetching backlinks:', err))
      .finally(() => setLoading(false));
  }, [activeNote]);

  if (!activeNote) {
    return (
      <div className="p-4 text-sm text-text-muted">
        Select a note to see backlinks
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-text-muted">
        Loading backlinks...
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
          <Link2 size={14} />
          <span>No backlinks</span>
        </div>
        <p className="text-xs text-text-faint">
          Pages that link to this note will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs text-text-muted">
        {backlinks.length} backlink{backlinks.length !== 1 ? 's' : ''}
      </div>
      {backlinks.map((backlink, index) => {
        const sourceNote = notes.find(n => n.id === backlink.sourceNoteId);
        if (!sourceNote) return null;

        return (
          <div
            key={`${backlink.sourceNoteId}-${index}`}
            className="px-3 py-2 hover:bg-bg-hover cursor-pointer"
            onClick={() => openNote(sourceNote.id, sourceNote.title)}
          >
            <div className="flex items-center gap-2 text-sm text-text-primary">
              <FileText size={14} className="text-text-muted shrink-0" />
              <span className="truncate">{sourceNote.title}</span>
            </div>
            {backlink.context && (
              <p className="mt-1 text-xs text-text-muted line-clamp-2 pl-5">
                {backlink.context}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
