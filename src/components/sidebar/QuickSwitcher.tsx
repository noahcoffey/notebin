import { useState, useEffect, useRef, useMemo } from 'react';
import { useNoteStore, useWorkspaceStore, useUIStore } from '../../store';
import { File, Plus } from 'lucide-react';

export function QuickSwitcher() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { notes, createNote } = useNoteStore();
  const { openNote } = useWorkspaceStore();
  const { closeQuickSwitcher } = useUIStore();

  const filteredNotes = useMemo(() => {
    if (!query.trim()) {
      return notes.slice(0, 10);
    }
    const lowerQuery = query.toLowerCase();
    return notes
      .filter(note => note.title.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [notes, query]);

  const showCreateOption = query.trim() && !filteredNotes.some(
    n => n.title.toLowerCase() === query.toLowerCase()
  );

  const totalItems = filteredNotes.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, totalItems - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (showCreateOption && selectedIndex === filteredNotes.length) {
          const note = await createNote(query.trim());
          openNote(note.id, note.title);
          closeQuickSwitcher();
        } else if (filteredNotes[selectedIndex]) {
          const note = filteredNotes[selectedIndex];
          openNote(note.id, note.title);
          closeQuickSwitcher();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeQuickSwitcher();
        break;
    }
  };

  const handleSelect = (noteId: string, title: string) => {
    openNote(noteId, title);
    closeQuickSwitcher();
  };

  const handleCreate = async () => {
    const note = await createNote(query.trim());
    openNote(note.id, note.title);
    closeQuickSwitcher();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50"
      onClick={closeQuickSwitcher}
    >
      <div
        className="w-full max-w-lg bg-bg-secondary border border-border-primary rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find or create a note..."
          className="w-full px-4 py-3 text-lg bg-transparent border-b border-border-primary focus:outline-none"
        />
        <div className="max-h-80 overflow-y-auto">
          {filteredNotes.map((note, index) => (
            <div
              key={note.id}
              className={`
                flex items-center gap-3 px-4 py-2 cursor-pointer
                ${index === selectedIndex ? 'bg-bg-hover' : 'hover:bg-bg-hover'}
              `}
              onClick={() => handleSelect(note.id, note.title)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <File size={18} className="text-text-muted shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-text-primary">{note.title}</div>
                <div className="text-xs text-text-muted truncate">{note.path}</div>
              </div>
            </div>
          ))}
          {showCreateOption && (
            <div
              className={`
                flex items-center gap-3 px-4 py-2 cursor-pointer
                ${selectedIndex === filteredNotes.length ? 'bg-bg-hover' : 'hover:bg-bg-hover'}
              `}
              onClick={handleCreate}
              onMouseEnter={() => setSelectedIndex(filteredNotes.length)}
            >
              <Plus size={18} className="text-accent shrink-0" />
              <div className="text-text-primary">
                Create "<span className="text-accent">{query.trim()}</span>"
              </div>
            </div>
          )}
          {filteredNotes.length === 0 && !showCreateOption && (
            <div className="px-4 py-8 text-center text-text-muted">
              No notes found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
