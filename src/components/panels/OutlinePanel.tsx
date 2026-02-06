import { useMemo } from 'react';
import { useWorkspaceStore, useNoteStore } from '../../store';
import { List, Hash } from 'lucide-react';
import type { HeadingInfo } from '../../types';

export function OutlinePanel() {
  const { tabs, activeTabId, scrollToPosition } = useWorkspaceStore();
  const { getNoteById } = useNoteStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeNote = activeTab ? getNoteById(activeTab.noteId) : undefined;

  const headings = useMemo(() => {
    if (!activeNote) return [];
    return activeNote.metadata?.headings || [];
  }, [activeNote]);

  if (!activeNote) {
    return (
      <div className="p-4 text-sm text-text-muted">
        Select a note to see outline
      </div>
    );
  }

  if (headings.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
          <List size={14} />
          <span>No headings</span>
        </div>
        <p className="text-xs text-text-faint">
          Add headings (# Heading) to create an outline
        </p>
      </div>
    );
  }

  const handleClick = (heading: HeadingInfo) => {
    scrollToPosition(heading.position);
  };

  // Find min heading level to calculate indentation
  const minLevel = Math.min(...headings.map(h => h.level));

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs text-text-muted flex items-center gap-1">
        <List size={12} />
        <span>Outline</span>
      </div>
      <nav className="mt-1">
        {headings.map((heading, index) => {
          const indent = (heading.level - minLevel) * 12;

          return (
            <button
              key={`${heading.position}-${index}`}
              onClick={() => handleClick(heading)}
              className="w-full text-left px-3 py-1.5 hover:bg-bg-hover transition-colors group flex items-center gap-2"
              style={{ paddingLeft: 12 + indent }}
            >
              <Hash
                size={12}
                className="text-text-faint group-hover:text-text-muted shrink-0"
              />
              <span
                className={`truncate text-sm ${
                  heading.level === 1
                    ? 'text-text-primary font-medium'
                    : heading.level === 2
                    ? 'text-text-primary'
                    : 'text-text-secondary'
                }`}
              >
                {heading.text}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
