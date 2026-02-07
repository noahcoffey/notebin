import { useEffect } from 'react';
import { useWorkspaceStore, useNoteStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';

export function StatusBar() {
  const { activeTabId, tabs } = useWorkspaceStore();
  const { getNoteById } = useNoteStore();

  const isMobile = useIsMobile();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeNote = activeTab ? getNoteById(activeTab.noteId) : undefined;
  const isDirty = activeTab?.isDirty ?? false;
  const anyDirty = tabs.some(t => t.isDirty);

  const wordCount = activeNote?.metadata?.wordCount || 0;
  const charCount = activeNote?.content.length || 0;
  const linkCount = activeNote?.metadata?.outgoingLinks?.length || 0;

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!anyDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [anyDirty]);

  return (
    <footer className="flex items-center justify-between px-4 py-1 bg-bg-secondary border-t border-border-primary text-xs text-text-muted">
      <div className="flex items-center gap-4">
        {activeNote ? (
          <>
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
            {linkCount > 0 && <span>{linkCount} links</span>}
          </>
        ) : (
          <span>No note selected</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {activeNote && (
          <span className={isDirty ? 'text-text-muted' : 'text-text-faint'}>
            {isDirty ? 'Unsaved' : 'Saved'}
          </span>
        )}
        {!isMobile && (
          <div className="flex items-center gap-3">
            <ShortcutHint keys={['⌘', 'O']} label="Quick Open" />
            <ShortcutHint keys={['⌘', 'G']} label="Graph" />
            <ShortcutHint keys={['⌘', 'S']} label="Save" />
            <ShortcutHint keys={['⌘', ',']} label="Settings" />
          </div>
        )}
      </div>
    </footer>
  );
}

function ShortcutHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1 text-text-faint">
      <span className="flex items-center gap-0.5">
        {keys.map((key, i) => (
          <kbd key={i} className="px-1 py-0.5 bg-bg-tertiary rounded text-[10px]">
            {key}
          </kbd>
        ))}
      </span>
      <span className="text-[10px]">{label}</span>
    </span>
  );
}
