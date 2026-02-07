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

  // JIRA integration (persisted except apiToken)
  jiraInstanceUrl: string;
  jiraEmail: string;
  jiraApiToken: string; // kept in memory only, not persisted
  jiraBoardId: string;
  jiraFolderId: string | null;

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

  setJiraConfig: (config: {
    instanceUrl?: string;
    email?: string;
    apiToken?: string;
    boardId?: string;
    folderId?: string | null;
  }) => void;
  isJiraConfigured: () => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
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

      // JIRA integration defaults
      jiraInstanceUrl: '',
      jiraEmail: '',
      jiraApiToken: '',
      jiraBoardId: '',
      jiraFolderId: null,

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

      setJiraConfig: (config) => set({
        ...(config.instanceUrl !== undefined && { jiraInstanceUrl: config.instanceUrl }),
        ...(config.email !== undefined && { jiraEmail: config.email }),
        ...(config.apiToken !== undefined && { jiraApiToken: config.apiToken }),
        ...(config.boardId !== undefined && { jiraBoardId: config.boardId }),
        ...(config.folderId !== undefined && { jiraFolderId: config.folderId }),
      }),
      isJiraConfigured: () => {
        const { jiraInstanceUrl, jiraEmail, jiraApiToken, jiraBoardId } = get();
        return !!(jiraInstanceUrl && jiraEmail && jiraApiToken && jiraBoardId);
      },
    }),
    {
      name: 'noted-settings',
      partialize: (state) => {
        // Exclude jiraApiToken from persistence for security
        const { jiraApiToken: _, ...rest } = state;
        return rest;
      },
    }
  )
);
