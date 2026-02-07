import { create } from 'zustand';
import type { Note, Folder, FileTreeItem } from '../types';
import { noteStorage, folderStorage } from '../services/storage';

interface NoteState {
  notes: Note[];
  folders: Folder[];
  loading: boolean;
  error: string | null;
  expandedFolders: Set<string>;

  loadNotes: () => Promise<void>;
  loadFolders: () => Promise<void>;
  createNote: (title: string, folderId?: string | null) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  renameNote: (id: string, newTitle: string) => Promise<void>;
  moveNote: (noteId: string, targetFolderId: string | null) => Promise<void>;
  moveFolder: (folderId: string, targetParentId: string | null) => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  renameFolder: (id: string, newName: string) => Promise<void>;
  toggleFolder: (folderId: string) => void;
  getFileTree: () => FileTreeItem[];
  getNoteById: (id: string) => Note | undefined;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  folders: [],
  loading: false,
  error: null,
  expandedFolders: new Set<string>(),

  loadNotes: async () => {
    set({ loading: true, error: null });
    try {
      const notes = await noteStorage.getAll();
      set({ notes, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  loadFolders: async () => {
    try {
      const folders = await folderStorage.getAll();
      set({ folders });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createNote: async (title: string, folderId?: string | null) => {
    const { folders } = get();
    let path = `/${title}`;

    if (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        path = `${folder.path}/${title}`;
      }
    }

    const note = await noteStorage.create({ title, folderId, path });
    set(state => ({ notes: [...state.notes, note] }));
    return note;
  },

  updateNote: async (id: string, data: Partial<Note>) => {
    await noteStorage.update(id, data);
    set(state => ({
      notes: state.notes.map(n => n.id === id ? { ...n, ...data, updatedAt: new Date() } : n),
    }));
  },

  deleteNote: async (id: string) => {
    await noteStorage.delete(id);
    set(state => ({
      notes: state.notes.filter(n => n.id !== id),
    }));
  },

  renameNote: async (id: string, newTitle: string) => {
    const { notes, folders } = get();
    const note = notes.find(n => n.id === id);
    if (!note) return;

    let newPath = `/${newTitle}`;
    if (note.folderId) {
      const folder = folders.find(f => f.id === note.folderId);
      if (folder) {
        newPath = `${folder.path}/${newTitle}`;
      }
    }

    await noteStorage.update(id, { title: newTitle, path: newPath });
    set(state => ({
      notes: state.notes.map(n =>
        n.id === id ? { ...n, title: newTitle, path: newPath, updatedAt: new Date() } : n
      ),
    }));
  },

  moveNote: async (noteId: string, targetFolderId: string | null) => {
    const { notes, folders } = get();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    let newPath = `/${note.title}`;
    if (targetFolderId) {
      const folder = folders.find(f => f.id === targetFolderId);
      if (folder) {
        newPath = `${folder.path}/${note.title}`;
      }
    }

    await noteStorage.update(noteId, { folderId: targetFolderId, path: newPath });
    set(state => ({
      notes: state.notes.map(n =>
        n.id === noteId ? { ...n, folderId: targetFolderId, path: newPath, updatedAt: new Date() } : n
      ),
    }));
  },

  moveFolder: async (folderId: string, targetParentId: string | null) => {
    const { folders, notes } = get();
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    // Don't move into itself
    if (targetParentId === folderId) return;

    // Don't move into a descendant
    const isDescendant = (parentId: string | null): boolean => {
      if (!parentId) return false;
      if (parentId === folderId) return true;
      const parent = folders.find(f => f.id === parentId);
      return parent ? isDescendant(parent.parentId) : false;
    };
    if (isDescendant(targetParentId)) return;

    // Don't move if already in the target
    if (folder.parentId === targetParentId) return;

    // Compute new path
    let newPath = `/${folder.name}`;
    if (targetParentId) {
      const parent = folders.find(f => f.id === targetParentId);
      if (parent) {
        newPath = `${parent.path}/${folder.name}`;
      }
    }

    const oldPath = folder.path;

    await folderStorage.update(folderId, { parentId: targetParentId, path: newPath });

    // Update paths of all descendant folders and their notes
    const updatedFolders = folders.map(f => {
      if (f.id === folderId) {
        return { ...f, parentId: targetParentId, path: newPath, updatedAt: new Date() };
      }
      if (f.path.startsWith(oldPath + '/')) {
        const updatedPath = newPath + f.path.slice(oldPath.length);
        folderStorage.update(f.id, { path: updatedPath });
        return { ...f, path: updatedPath, updatedAt: new Date() };
      }
      return f;
    });

    // Update paths of notes inside the moved folder tree
    const updatedNotes = notes.map(n => {
      if (n.path.startsWith(oldPath + '/')) {
        const updatedPath = newPath + n.path.slice(oldPath.length);
        noteStorage.update(n.id, { path: updatedPath });
        return { ...n, path: updatedPath, updatedAt: new Date() };
      }
      return n;
    });

    set({ folders: updatedFolders, notes: updatedNotes });
  },

  createFolder: async (name: string, parentId?: string | null) => {
    const { folders } = get();
    let path = `/${name}`;

    if (parentId) {
      const parent = folders.find(f => f.id === parentId);
      if (parent) {
        path = `${parent.path}/${name}`;
      }
    }

    const folder = await folderStorage.create({ name, parentId, path });
    set(state => ({ folders: [...state.folders, folder] }));
    return folder;
  },

  deleteFolder: async (id: string) => {
    await folderStorage.delete(id);
    set(state => ({
      folders: state.folders.filter(f => f.id !== id),
    }));
  },

  renameFolder: async (id: string, newName: string) => {
    const { folders } = get();
    const folder = folders.find(f => f.id === id);
    if (!folder) return;

    let newPath = `/${newName}`;
    if (folder.parentId) {
      const parent = folders.find(f => f.id === folder.parentId);
      if (parent) {
        newPath = `${parent.path}/${newName}`;
      }
    }

    await folderStorage.update(id, { name: newName, path: newPath });
    set(state => ({
      folders: state.folders.map(f =>
        f.id === id ? { ...f, name: newName, path: newPath, updatedAt: new Date() } : f
      ),
    }));
  },

  toggleFolder: (folderId: string) => {
    set(state => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return { expandedFolders: newExpanded };
    });
  },

  getFileTree: () => {
    const { notes, folders, expandedFolders } = get();

    const buildTree = (parentId: string | null): FileTreeItem[] => {
      const items: FileTreeItem[] = [];

      // Handle both null and undefined for root-level items
      const isRootLevel = parentId === null;

      const childFolders = folders
        .filter(f => isRootLevel ? (f.parentId === null || f.parentId === undefined) : f.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const folder of childFolders) {
        items.push({
          id: folder.id,
          name: folder.name,
          path: folder.path,
          type: 'folder',
          children: buildTree(folder.id),
          isExpanded: expandedFolders.has(folder.id),
        });
      }

      const childNotes = notes
        .filter(n => isRootLevel ? (n.folderId === null || n.folderId === undefined) : n.folderId === parentId)
        .sort((a, b) => a.title.localeCompare(b.title));

      for (const note of childNotes) {
        items.push({
          id: note.id,
          name: note.title,
          path: note.path,
          type: 'note',
        });
      }

      return items;
    };

    return buildTree(null);
  },

  getNoteById: (id: string) => {
    return get().notes.find(n => n.id === id);
  },
}));
