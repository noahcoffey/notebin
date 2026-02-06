import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Note, Folder } from '../types';

const now = new Date('2025-01-01T00:00:00Z');

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Test Note',
    path: '/Test Note',
    folderId: null,
    content: '',
    frontmatter: {},
    metadata: { wordCount: 0, headings: [], outgoingLinks: [], blockIds: [], inlineTags: [] },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeFolder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: 'folder-1',
    name: 'Test Folder',
    path: '/Test Folder',
    parentId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Mock storage services before importing the store
vi.mock('../services/storage', () => ({
  noteStorage: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  folderStorage: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocking
import { useNoteStore } from './noteStore';
import { noteStorage, folderStorage } from '../services/storage';

const mockedNoteStorage = vi.mocked(noteStorage);
const mockedFolderStorage = vi.mocked(folderStorage);

function resetStore() {
  useNoteStore.setState({
    notes: [],
    folders: [],
    loading: false,
    error: null,
    expandedFolders: new Set<string>(),
  });
}

describe('noteStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe('default state', () => {
    it('has correct defaults', () => {
      const state = useNoteStore.getState();
      expect(state.notes).toEqual([]);
      expect(state.folders).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.expandedFolders.size).toBe(0);
    });
  });

  describe('loadNotes', () => {
    it('loads notes from storage', async () => {
      const notes = [makeNote({ id: 'n1', title: 'Note 1' }), makeNote({ id: 'n2', title: 'Note 2' })];
      mockedNoteStorage.getAll.mockResolvedValue(notes);

      await useNoteStore.getState().loadNotes();

      const state = useNoteStore.getState();
      expect(state.notes).toEqual(notes);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets loading to true while loading', async () => {
      let resolvePromise: (value: Note[]) => void;
      mockedNoteStorage.getAll.mockReturnValue(
        new Promise((resolve) => { resolvePromise = resolve; })
      );

      const promise = useNoteStore.getState().loadNotes();
      expect(useNoteStore.getState().loading).toBe(true);

      resolvePromise!([]);
      await promise;
      expect(useNoteStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockedNoteStorage.getAll.mockRejectedValue(new Error('Network error'));

      await useNoteStore.getState().loadNotes();

      const state = useNoteStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });
  });

  describe('loadFolders', () => {
    it('loads folders from storage', async () => {
      const folders = [makeFolder({ id: 'f1', name: 'Folder 1' })];
      mockedFolderStorage.getAll.mockResolvedValue(folders);

      await useNoteStore.getState().loadFolders();
      expect(useNoteStore.getState().folders).toEqual(folders);
    });

    it('sets error on failure', async () => {
      mockedFolderStorage.getAll.mockRejectedValue(new Error('Load failed'));

      await useNoteStore.getState().loadFolders();
      expect(useNoteStore.getState().error).toBe('Load failed');
    });
  });

  describe('createNote', () => {
    it('creates a note and adds it to state', async () => {
      const newNote = makeNote({ id: 'new-1', title: 'New Note', path: '/New Note' });
      mockedNoteStorage.create.mockResolvedValue(newNote);

      const result = await useNoteStore.getState().createNote('New Note');

      expect(result).toEqual(newNote);
      expect(useNoteStore.getState().notes).toContainEqual(newNote);
      expect(mockedNoteStorage.create).toHaveBeenCalledWith({
        title: 'New Note',
        folderId: undefined,
        path: '/New Note',
      });
    });

    it('creates a note inside a folder', async () => {
      const folder = makeFolder({ id: 'f1', name: 'Docs', path: '/Docs' });
      useNoteStore.setState({ folders: [folder] });

      const newNote = makeNote({ id: 'new-2', title: 'Note', path: '/Docs/Note', folderId: 'f1' });
      mockedNoteStorage.create.mockResolvedValue(newNote);

      await useNoteStore.getState().createNote('Note', 'f1');

      expect(mockedNoteStorage.create).toHaveBeenCalledWith({
        title: 'Note',
        folderId: 'f1',
        path: '/Docs/Note',
      });
    });
  });

  describe('updateNote', () => {
    it('updates a note in storage and state', async () => {
      const note = makeNote({ id: 'n1', title: 'Old Title' });
      useNoteStore.setState({ notes: [note] });
      mockedNoteStorage.update.mockResolvedValue(undefined);

      await useNoteStore.getState().updateNote('n1', { title: 'New Title' });

      const updated = useNoteStore.getState().notes.find(n => n.id === 'n1');
      expect(updated!.title).toBe('New Title');
      expect(mockedNoteStorage.update).toHaveBeenCalledWith('n1', { title: 'New Title' });
    });
  });

  describe('deleteNote', () => {
    it('deletes a note from storage and state', async () => {
      const note = makeNote({ id: 'n1' });
      useNoteStore.setState({ notes: [note] });
      mockedNoteStorage.delete.mockResolvedValue(undefined);

      await useNoteStore.getState().deleteNote('n1');

      expect(useNoteStore.getState().notes).toHaveLength(0);
      expect(mockedNoteStorage.delete).toHaveBeenCalledWith('n1');
    });
  });

  describe('renameNote', () => {
    it('renames a note at root level', async () => {
      const note = makeNote({ id: 'n1', title: 'Old', path: '/Old', folderId: null });
      useNoteStore.setState({ notes: [note] });
      mockedNoteStorage.update.mockResolvedValue(undefined);

      await useNoteStore.getState().renameNote('n1', 'New');

      const renamed = useNoteStore.getState().notes.find(n => n.id === 'n1');
      expect(renamed!.title).toBe('New');
      expect(renamed!.path).toBe('/New');
      expect(mockedNoteStorage.update).toHaveBeenCalledWith('n1', { title: 'New', path: '/New' });
    });

    it('renames a note inside a folder', async () => {
      const folder = makeFolder({ id: 'f1', name: 'Docs', path: '/Docs' });
      const note = makeNote({ id: 'n1', title: 'Old', path: '/Docs/Old', folderId: 'f1' });
      useNoteStore.setState({ notes: [note], folders: [folder] });
      mockedNoteStorage.update.mockResolvedValue(undefined);

      await useNoteStore.getState().renameNote('n1', 'New');

      const renamed = useNoteStore.getState().notes.find(n => n.id === 'n1');
      expect(renamed!.path).toBe('/Docs/New');
    });

    it('does nothing for non-existent note', async () => {
      await useNoteStore.getState().renameNote('nonexistent', 'New');
      expect(mockedNoteStorage.update).not.toHaveBeenCalled();
    });
  });

  describe('moveNote', () => {
    it('moves a note to a folder', async () => {
      const folder = makeFolder({ id: 'f1', name: 'Docs', path: '/Docs' });
      const note = makeNote({ id: 'n1', title: 'Note', path: '/Note', folderId: null });
      useNoteStore.setState({ notes: [note], folders: [folder] });
      mockedNoteStorage.update.mockResolvedValue(undefined);

      await useNoteStore.getState().moveNote('n1', 'f1');

      const moved = useNoteStore.getState().notes.find(n => n.id === 'n1');
      expect(moved!.folderId).toBe('f1');
      expect(moved!.path).toBe('/Docs/Note');
    });

    it('moves a note to root', async () => {
      const note = makeNote({ id: 'n1', title: 'Note', path: '/Docs/Note', folderId: 'f1' });
      useNoteStore.setState({ notes: [note] });
      mockedNoteStorage.update.mockResolvedValue(undefined);

      await useNoteStore.getState().moveNote('n1', null);

      const moved = useNoteStore.getState().notes.find(n => n.id === 'n1');
      expect(moved!.folderId).toBeNull();
      expect(moved!.path).toBe('/Note');
    });

    it('does nothing for non-existent note', async () => {
      await useNoteStore.getState().moveNote('nonexistent', 'f1');
      expect(mockedNoteStorage.update).not.toHaveBeenCalled();
    });
  });

  describe('createFolder', () => {
    it('creates a folder at root level', async () => {
      const newFolder = makeFolder({ id: 'f-new', name: 'New Folder', path: '/New Folder' });
      mockedFolderStorage.create.mockResolvedValue(newFolder);

      const result = await useNoteStore.getState().createFolder('New Folder');

      expect(result).toEqual(newFolder);
      expect(useNoteStore.getState().folders).toContainEqual(newFolder);
      expect(mockedFolderStorage.create).toHaveBeenCalledWith({
        name: 'New Folder',
        parentId: undefined,
        path: '/New Folder',
      });
    });

    it('creates a nested folder', async () => {
      const parent = makeFolder({ id: 'f-parent', name: 'Parent', path: '/Parent' });
      useNoteStore.setState({ folders: [parent] });

      const child = makeFolder({ id: 'f-child', name: 'Child', path: '/Parent/Child', parentId: 'f-parent' });
      mockedFolderStorage.create.mockResolvedValue(child);

      await useNoteStore.getState().createFolder('Child', 'f-parent');

      expect(mockedFolderStorage.create).toHaveBeenCalledWith({
        name: 'Child',
        parentId: 'f-parent',
        path: '/Parent/Child',
      });
    });
  });

  describe('deleteFolder', () => {
    it('deletes a folder from storage and state', async () => {
      const folder = makeFolder({ id: 'f1' });
      useNoteStore.setState({ folders: [folder] });
      mockedFolderStorage.delete.mockResolvedValue(undefined);

      await useNoteStore.getState().deleteFolder('f1');

      expect(useNoteStore.getState().folders).toHaveLength(0);
      expect(mockedFolderStorage.delete).toHaveBeenCalledWith('f1');
    });
  });

  describe('renameFolder', () => {
    it('renames a folder at root level', async () => {
      const folder = makeFolder({ id: 'f1', name: 'Old', path: '/Old', parentId: null });
      useNoteStore.setState({ folders: [folder] });
      mockedFolderStorage.update.mockResolvedValue(undefined);

      await useNoteStore.getState().renameFolder('f1', 'New');

      const renamed = useNoteStore.getState().folders.find(f => f.id === 'f1');
      expect(renamed!.name).toBe('New');
      expect(renamed!.path).toBe('/New');
    });

    it('renames a nested folder', async () => {
      const parent = makeFolder({ id: 'f-parent', name: 'Parent', path: '/Parent' });
      const child = makeFolder({ id: 'f-child', name: 'Old', path: '/Parent/Old', parentId: 'f-parent' });
      useNoteStore.setState({ folders: [parent, child] });
      mockedFolderStorage.update.mockResolvedValue(undefined);

      await useNoteStore.getState().renameFolder('f-child', 'New');

      const renamed = useNoteStore.getState().folders.find(f => f.id === 'f-child');
      expect(renamed!.path).toBe('/Parent/New');
    });

    it('does nothing for non-existent folder', async () => {
      await useNoteStore.getState().renameFolder('nonexistent', 'New');
      expect(mockedFolderStorage.update).not.toHaveBeenCalled();
    });
  });

  describe('toggleFolder', () => {
    it('expands a collapsed folder', () => {
      useNoteStore.getState().toggleFolder('f1');
      expect(useNoteStore.getState().expandedFolders.has('f1')).toBe(true);
    });

    it('collapses an expanded folder', () => {
      useNoteStore.getState().toggleFolder('f1');
      useNoteStore.getState().toggleFolder('f1');
      expect(useNoteStore.getState().expandedFolders.has('f1')).toBe(false);
    });
  });

  describe('getNoteById', () => {
    it('returns the note if found', () => {
      const note = makeNote({ id: 'n1', title: 'Found' });
      useNoteStore.setState({ notes: [note] });

      expect(useNoteStore.getState().getNoteById('n1')).toEqual(note);
    });

    it('returns undefined if not found', () => {
      expect(useNoteStore.getState().getNoteById('nonexistent')).toBeUndefined();
    });
  });

  describe('getFileTree', () => {
    it('returns empty array when no notes or folders', () => {
      expect(useNoteStore.getState().getFileTree()).toEqual([]);
    });

    it('returns root-level notes sorted alphabetically', () => {
      useNoteStore.setState({
        notes: [
          makeNote({ id: 'n2', title: 'Zebra', path: '/Zebra', folderId: null }),
          makeNote({ id: 'n1', title: 'Apple', path: '/Apple', folderId: null }),
        ],
      });

      const tree = useNoteStore.getState().getFileTree();
      expect(tree).toHaveLength(2);
      expect(tree[0].name).toBe('Apple');
      expect(tree[1].name).toBe('Zebra');
      expect(tree[0].type).toBe('note');
    });

    it('returns folders before notes, each sorted alphabetically', () => {
      useNoteStore.setState({
        notes: [makeNote({ id: 'n1', title: 'Note', path: '/Note', folderId: null })],
        folders: [makeFolder({ id: 'f1', name: 'Folder', path: '/Folder', parentId: null })],
      });

      const tree = useNoteStore.getState().getFileTree();
      expect(tree).toHaveLength(2);
      expect(tree[0].type).toBe('folder');
      expect(tree[1].type).toBe('note');
    });

    it('nests notes inside folders', () => {
      useNoteStore.setState({
        notes: [makeNote({ id: 'n1', title: 'Child Note', path: '/Folder/Child Note', folderId: 'f1' })],
        folders: [makeFolder({ id: 'f1', name: 'Folder', path: '/Folder' })],
      });

      const tree = useNoteStore.getState().getFileTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].type).toBe('folder');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children![0].name).toBe('Child Note');
    });

    it('includes isExpanded state for folders', () => {
      useNoteStore.setState({
        folders: [makeFolder({ id: 'f1', name: 'Folder', path: '/Folder' })],
        expandedFolders: new Set(['f1']),
      });

      const tree = useNoteStore.getState().getFileTree();
      expect(tree[0].isExpanded).toBe(true);
    });
  });
});
