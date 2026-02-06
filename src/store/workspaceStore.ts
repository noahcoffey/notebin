import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab } from '../types';
import { generateId } from '../utils/id';

interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string | null;
  editorScrollCallback: ((position: number) => void) | null;

  openNote: (noteId: string, title: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;
  getActiveTab: () => Tab | undefined;
  getTabByNoteId: (noteId: string) => Tab | undefined;
  setEditorScrollCallback: (callback: ((position: number) => void) | null) => void;
  scrollToPosition: (position: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      editorScrollCallback: null,

  openNote: (noteId: string, title: string) => {
    const { tabs } = get();
    const existingTab = tabs.find(t => t.noteId === noteId);

    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const newTab: Tab = {
      id: generateId(),
      noteId,
      title,
      isDirty: false,
    };

    set({
      tabs: [...tabs, newTab],
      activeTabId: newTab.id,
    });
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);

    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(index, newTabs.length - 1);
        newActiveTabId = newTabs[newIndex].id;
      } else {
        newActiveTabId = null;
      }
    }

    set({
      tabs: newTabs,
      activeTabId: newActiveTabId,
    });
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  updateTabTitle: (tabId: string, title: string) => {
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === tabId ? { ...t, title } : t
      ),
    }));
  },

  setTabDirty: (tabId: string, isDirty: boolean) => {
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === tabId ? { ...t, isDirty } : t
      ),
    }));
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find(t => t.id === activeTabId);
  },

  getTabByNoteId: (noteId: string) => {
    const { tabs } = get();
    return tabs.find(t => t.noteId === noteId);
  },

  setEditorScrollCallback: (callback) => {
    set({ editorScrollCallback: callback });
  },

  scrollToPosition: (position: number) => {
      const { editorScrollCallback } = get();
      if (editorScrollCallback) {
        editorScrollCallback(position);
      }
    },
    }),
    {
      name: 'noted-workspace',
      partialize: (state) => ({
        tabs: state.tabs.map(t => ({ ...t, isDirty: false })),
        activeTabId: state.activeTabId,
      }),
    }
  )
);
