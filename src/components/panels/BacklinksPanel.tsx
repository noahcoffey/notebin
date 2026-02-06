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

  const activeNoteId = activeNote?.id;
  const [prevNoteId, setPrevNoteId] = useState(activeNoteId);
  if (activeNoteId !== prevNoteId) {
    setPrevNoteId(activeNoteId);
    if (!activeNoteId) {
      setBacklinks([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!activeNoteId) return;
    let cancelled = false;
    backlinkStorage.getByTarget(activeNoteId)
      .then(links => {
        if (!cancelled) setBacklinks(links);
      })
      .catch(err => console.error('Error fetching backlinks:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeNoteId]);

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

  // Group backlinks by source note
  const groupedBacklinks = backlinks.reduce((acc, backlink) => {
    if (!acc[backlink.sourceNoteId]) {
      acc[backlink.sourceNoteId] = {
        sourceNoteId: backlink.sourceNoteId,
        count: 0,
        context: backlink.context, // Use first context as preview
      };
    }
    acc[backlink.sourceNoteId].count++;
    return acc;
  }, {} as Record<string, { sourceNoteId: string; count: number; context?: string }>);

  const uniqueBacklinks = Object.values(groupedBacklinks);

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs text-text-muted">
        {uniqueBacklinks.length} note{uniqueBacklinks.length !== 1 ? 's' : ''} linking here
      </div>
      {uniqueBacklinks.map((grouped) => {
        const sourceNote = notes.find(n => n.id === grouped.sourceNoteId);
        if (!sourceNote) return null;

        return (
          <div
            key={grouped.sourceNoteId}
            className="px-3 py-2 hover:bg-bg-hover cursor-pointer"
            onClick={() => openNote(sourceNote.id, sourceNote.title)}
          >
            <div className="flex items-center gap-2 text-sm text-text-primary">
              <FileText size={14} className="text-text-muted shrink-0" />
              <span className="truncate">{sourceNote.title}</span>
              {grouped.count > 1 && (
                <span className="text-xs text-text-muted">×{grouped.count}</span>
              )}
            </div>
            {grouped.context && (
              <p className="mt-1 text-xs text-text-muted line-clamp-2 pl-5">
                {grouped.context}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
