import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  editorFontSize: number;
  editorLineHeight: number;
  showLineNumbers: boolean;
  vimMode: boolean;
  spellCheck: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showRecentNotes: boolean;
  favoriteNoteIds: string[];
  recentCollapsed: boolean;
  favoritesCollapsed: boolean;
  notesCollapsed: boolean;

  setEditorFontSize: (size: number) => void;
  setEditorLineHeight: (height: number) => void;
  setShowLineNumbers: (show: boolean) => void;
  setVimMode: (enabled: boolean) => void;
  setSpellCheck: (enabled: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setShowRecentNotes: (show: boolean) => void;
  toggleFavorite: (noteId: string) => void;
  setRecentCollapsed: (collapsed: boolean) => void;
  setFavoritesCollapsed: (collapsed: boolean) => void;
  setNotesCollapsed: (collapsed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editorFontSize: 16,
      editorLineHeight: 1.6,
      showLineNumbers: false,
      vimMode: false,
      spellCheck: true,
      autoSave: true,
      autoSaveInterval: 5000,
      showRecentNotes: true,
      favoriteNoteIds: [],
      recentCollapsed: false,
      favoritesCollapsed: false,
      notesCollapsed: false,

      setEditorFontSize: (size: number) => set({ editorFontSize: Math.max(12, Math.min(24, size)) }),
      setEditorLineHeight: (height: number) => set({ editorLineHeight: Math.max(1.2, Math.min(2.4, height)) }),
      setShowLineNumbers: (show: boolean) => set({ showLineNumbers: show }),
      setVimMode: (enabled: boolean) => set({ vimMode: enabled }),
      setSpellCheck: (enabled: boolean) => set({ spellCheck: enabled }),
      setAutoSave: (enabled: boolean) => set({ autoSave: enabled }),
      setAutoSaveInterval: (interval: number) => set({ autoSaveInterval: Math.max(1000, Math.min(60000, interval)) }),
      setShowRecentNotes: (show: boolean) => set({ showRecentNotes: show }),
      toggleFavorite: (noteId: string) => set((state) => ({
        favoriteNoteIds: state.favoriteNoteIds.includes(noteId)
          ? state.favoriteNoteIds.filter(id => id !== noteId)
          : [...state.favoriteNoteIds, noteId],
      })),
      setRecentCollapsed: (collapsed: boolean) => set({ recentCollapsed: collapsed }),
      setFavoritesCollapsed: (collapsed: boolean) => set({ favoritesCollapsed: collapsed }),
      setNotesCollapsed: (collapsed: boolean) => set({ notesCollapsed: collapsed }),
    }),
    {
      name: 'noted-settings',
    }
  )
);
