import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';

// Mock generateId to return predictable IDs
let idCounter = 0;
vi.mock('../utils/id', () => ({
  generateId: () => `tab-${++idCounter}`,
}));

function resetStore() {
  idCounter = 0;
  useWorkspaceStore.setState({
    tabs: [],
    activeTabId: null,
    editorScrollCallback: null,
  });
}

describe('workspaceStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('default state', () => {
    it('starts with empty tabs and no active tab', () => {
      const state = useWorkspaceStore.getState();
      expect(state.tabs).toEqual([]);
      expect(state.activeTabId).toBeNull();
    });
  });

  describe('openNote', () => {
    it('opens a new tab for a note', () => {
      useWorkspaceStore.getState().openNote('note-1', 'My Note');
      const state = useWorkspaceStore.getState();

      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].noteId).toBe('note-1');
      expect(state.tabs[0].title).toBe('My Note');
      expect(state.tabs[0].isDirty).toBe(false);
      expect(state.activeTabId).toBe(state.tabs[0].id);
    });

    it('replaces previous tab when opening a different note', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      useWorkspaceStore.getState().openNote('note-2', 'Note 2');

      const state = useWorkspaceStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].noteId).toBe('note-2');
      expect(state.activeTabId).toBe(state.tabs[0].id);
    });

    it('keeps existing tab when opening the same note', () => {
      useWorkspaceStore.getState().openNote('note-1', 'My Note');
      const firstTabId = useWorkspaceStore.getState().tabs[0].id;

      useWorkspaceStore.getState().openNote('note-1', 'My Note');
      expect(useWorkspaceStore.getState().tabs).toHaveLength(1);
      expect(useWorkspaceStore.getState().activeTabId).toBe(firstTabId);
    });
  });

  describe('closeTab', () => {
    it('removes the tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      const tabId = useWorkspaceStore.getState().tabs[0].id;

      useWorkspaceStore.getState().closeTab(tabId);
      expect(useWorkspaceStore.getState().tabs).toHaveLength(0);
    });

    it('sets activeTabId to null when closing the last tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      const tabId = useWorkspaceStore.getState().tabs[0].id;

      useWorkspaceStore.getState().closeTab(tabId);
      expect(useWorkspaceStore.getState().activeTabId).toBeNull();
    });
  });

  describe('setActiveTab', () => {
    it('sets the active tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      const tabId = useWorkspaceStore.getState().tabs[0].id;
      useWorkspaceStore.getState().setActiveTab(tabId);
      expect(useWorkspaceStore.getState().activeTabId).toBe(tabId);
    });
  });

  describe('updateTabTitle', () => {
    it('updates the title of a specific tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Old Title');
      const tabId = useWorkspaceStore.getState().tabs[0].id;

      useWorkspaceStore.getState().updateTabTitle(tabId, 'New Title');
      expect(useWorkspaceStore.getState().tabs[0].title).toBe('New Title');
    });
  });

  describe('setTabDirty', () => {
    it('marks a tab as dirty', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      const tabId = useWorkspaceStore.getState().tabs[0].id;

      useWorkspaceStore.getState().setTabDirty(tabId, true);
      expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(true);
    });

    it('marks a tab as not dirty', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      const tabId = useWorkspaceStore.getState().tabs[0].id;

      useWorkspaceStore.getState().setTabDirty(tabId, true);
      useWorkspaceStore.getState().setTabDirty(tabId, false);
      expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(false);
    });
  });

  describe('getActiveTab', () => {
    it('returns undefined when no tabs are open', () => {
      expect(useWorkspaceStore.getState().getActiveTab()).toBeUndefined();
    });

    it('returns the active tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      const tab = useWorkspaceStore.getState().getActiveTab();
      expect(tab).toBeDefined();
      expect(tab!.noteId).toBe('note-1');
    });
  });

  describe('getTabByNoteId', () => {
    it('returns undefined for non-existent note', () => {
      expect(useWorkspaceStore.getState().getTabByNoteId('note-999')).toBeUndefined();
    });

    it('finds tab by note ID', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      const tab = useWorkspaceStore.getState().getTabByNoteId('note-1');
      expect(tab).toBeDefined();
      expect(tab!.title).toBe('Note 1');
    });
  });

  describe('scrollToPosition', () => {
    it('calls the scroll callback with position', () => {
      const callback = vi.fn();
      useWorkspaceStore.getState().setEditorScrollCallback(callback);
      useWorkspaceStore.getState().scrollToPosition(100);
      expect(callback).toHaveBeenCalledWith(100);
    });

    it('does nothing when no callback is set', () => {
      // Should not throw
      useWorkspaceStore.getState().scrollToPosition(100);
    });
  });
});
