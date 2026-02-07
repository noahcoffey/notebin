import { useState, useEffect, useRef, useMemo } from 'react';
import { useNoteStore, useWorkspaceStore, useUIStore } from '../../store';
import { File, Folder as FolderIcon, Plus } from 'lucide-react';
import type { Folder } from '../../types';

export function QuickSwitcher() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { notes, folders, createNote, createFolder } = useNoteStore();
  const { openNote } = useWorkspaceStore();
  const { closeQuickSwitcher } = useUIStore();

  // Parse query into folder path and note name
  const parsedQuery = useMemo(() => {
    const trimmed = query.trim();
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash === -1) {
      return { folderPath: null, noteName: trimmed, segments: [] as string[] };
    }
    const folderPath = trimmed.slice(0, lastSlash);
    const noteName = trimmed.slice(lastSlash + 1);
    const segments = folderPath.split('/').filter(Boolean);
    return { folderPath, noteName, segments };
  }, [query]);

  // Find matching folder (case-insensitive)
  const matchedFolder = useMemo((): Folder | null => {
    if (!parsedQuery.segments.length) return null;
    // Build the expected path and try to match
    let current: Folder | null = null;
    for (const segment of parsedQuery.segments) {
      const parentId: string | null = current ? current.id : null;
      const match: Folder | undefined = folders.find(
        f => f.name.toLowerCase() === segment.toLowerCase() && f.parentId === parentId
      );
      if (!match) return null;
      current = match;
    }
    return current;
  }, [parsedQuery.segments, folders]);

  const filteredNotes = useMemo(() => {
    if (!query.trim()) {
      return notes.slice(0, 10);
    }
    const searchName = parsedQuery.noteName.toLowerCase();
    if (parsedQuery.folderPath !== null) {
      // Filter by folder match + note name
      const folderId = matchedFolder?.id ?? null;
      return notes
        .filter(note => {
          if (folderId && note.folderId !== folderId) return false;
          if (!folderId && parsedQuery.segments.length > 0) {
            // No matching folder — match against full path
            const lowerPath = note.path.toLowerCase();
            return lowerPath.includes(query.trim().toLowerCase());
          }
          return note.title.toLowerCase().includes(searchName);
        })
        .slice(0, 10);
    }
    const lowerQuery = query.toLowerCase();
    return notes
      .filter(note => note.title.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [notes, query, parsedQuery, matchedFolder]);

  const showCreateOption = query.trim() && parsedQuery.noteName && !filteredNotes.some(
    n => n.title.toLowerCase() === parsedQuery.noteName.toLowerCase()
      && (parsedQuery.folderPath === null || n.folderId === matchedFolder?.id)
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

  // Create folders recursively if they don't exist, returns the leaf folder ID
  const ensureFolders = async (segments: string[]): Promise<string | null> => {
    if (segments.length === 0) return null;

    let parentId: string | null = null;
    for (const segment of segments) {
      // Case-insensitive lookup
      const existing = folders.find(
        f => f.name.toLowerCase() === segment.toLowerCase() && f.parentId === parentId
      );
      if (existing) {
        parentId = existing.id;
      } else {
        const newFolder = await createFolder(segment, parentId);
        parentId = newFolder.id;
      }
    }
    return parentId;
  };

  const handleCreateWithPath = async () => {
    const folderId = await ensureFolders(parsedQuery.segments);
    const note = await createNote(parsedQuery.noteName.trim(), folderId);
    openNote(note.id, note.title);
    closeQuickSwitcher();
  };

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
          await handleCreateWithPath();
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

  // Format the create label to show folder path
  const createLabel = parsedQuery.folderPath
    ? <>Create "<span className="text-accent">{parsedQuery.noteName}</span>" in <span className="text-text-secondary">{parsedQuery.folderPath}/</span></>
    : <>Create "<span className="text-accent">{query.trim()}</span>"</>;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[10vh] md:pt-[20vh] z-50"
      onClick={closeQuickSwitcher}
    >
      <div
        className="w-full max-w-lg mx-4 bg-bg-secondary border border-border-primary rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find or create a note..."
            className="w-full px-4 py-3 text-lg bg-transparent border-b border-border-primary focus:outline-none"
          />
          {parsedQuery.segments.length > 0 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs">
              <FolderIcon size={12} className={matchedFolder ? 'text-accent' : 'text-text-muted'} />
              <span className={matchedFolder ? 'text-accent' : 'text-text-muted'}>
                {matchedFolder ? matchedFolder.name : parsedQuery.segments.join('/')}
              </span>
            </div>
          )}
        </div>
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
              onClick={handleCreateWithPath}
              onMouseEnter={() => setSelectedIndex(filteredNotes.length)}
            >
              <Plus size={18} className="text-accent shrink-0" />
              <div className="text-text-primary">
                {createLabel}
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
