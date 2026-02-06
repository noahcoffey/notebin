import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  path: string;
}

interface WikilinkAutocompleteProps {
  notes: Note[];
  query: string;
  position: { top: number; left: number };
  onSelect: (title: string) => void;
  onClose: () => void;
}

export function WikilinkAutocomplete({
  notes,
  query,
  position,
  onSelect,
  onClose,
}: WikilinkAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Filter notes based on query
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10);

  // Reset selection when query changes
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(i => Math.min(i + 1, filteredNotes.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (filteredNotes[selectedIndex]) {
          onSelect(filteredNotes[selectedIndex].title);
        } else if (query.trim()) {
          onSelect(query.trim());
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        e.stopPropagation();
        if (filteredNotes[selectedIndex]) {
          onSelect(filteredNotes[selectedIndex].title);
        }
        break;
    }
  }, [filteredNotes, selectedIndex, onSelect, onClose, query]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-bg-secondary border border-border-primary rounded-lg shadow-xl overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '280px',
        maxWidth: '400px',
        maxHeight: '300px',
      }}
    >
      <div className="overflow-y-auto max-h-[250px]">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note, index) => (
            <div
              key={note.id}
              ref={index === selectedIndex ? selectedRef : null}
              className={`px-3 py-2 cursor-pointer flex items-start gap-2 ${
                index === selectedIndex
                  ? 'bg-accent/20 text-text-primary'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
              onClick={() => onSelect(note.title)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <FileText size={16} className="mt-0.5 shrink-0 text-text-muted" />
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {highlightMatch(note.title, query)}
                </div>
                {note.path && note.path !== `/${note.title}` && (
                  <div className="text-xs text-text-muted truncate">
                    {note.path.replace(`/${note.title}`, '').replace(/^\//, '') || '/'}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : query.trim() ? (
          <div
            className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
              selectedIndex === 0
                ? 'bg-accent/20 text-text-primary'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
            onClick={() => onSelect(query.trim())}
          >
            <FileText size={16} className="text-text-muted" />
            <span>Create "{query.trim()}"</span>
          </div>
        ) : (
          <div className="px-3 py-2 text-text-muted text-sm">
            Type to search notes...
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-border-primary bg-bg-tertiary text-xs text-text-muted flex gap-4">
        <span><kbd className="font-mono">↑↓</kbd> navigate</span>
        <span><kbd className="font-mono">↵</kbd> select</span>
        <span><kbd className="font-mono">esc</kbd> close</span>
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <span className="text-accent font-semibold">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}
