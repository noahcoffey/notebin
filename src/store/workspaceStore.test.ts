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

    it('activates existing tab if note is already open', () => {
      useWorkspaceStore.getState().openNote('note-1', 'My Note');
      const firstTabId = useWorkspaceStore.getState().tabs[0].id;

      // Open a second note
      useWorkspaceStore.getState().openNote('note-2', 'Another Note');
      expect(useWorkspaceStore.getState().activeTabId).not.toBe(firstTabId);

      // Open the first note again - should just switch to existing tab
      useWorkspaceStore.getState().openNote('note-1', 'My Note');
      expect(useWorkspaceStore.getState().tabs).toHaveLength(2);
      expect(useWorkspaceStore.getState().activeTabId).toBe(firstTabId);
    });

    it('opens multiple tabs for different notes', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      useWorkspaceStore.getState().openNote('note-2', 'Note 2');
      useWorkspaceStore.getState().openNote('note-3', 'Note 3');

      const state = useWorkspaceStore.getState();
      expect(state.tabs).toHaveLength(3);
      // Last opened note should be active
      expect(state.activeTabId).toBe(state.tabs[2].id);
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

    it('activates adjacent tab when closing active tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      useWorkspaceStore.getState().openNote('note-2', 'Note 2');
      useWorkspaceStore.getState().openNote('note-3', 'Note 3');

      const tabs = useWorkspaceStore.getState().tabs;
      // Close the last (active) tab - should activate the one before it
      useWorkspaceStore.getState().closeTab(tabs[2].id);
      expect(useWorkspaceStore.getState().activeTabId).toBe(tabs[1].id);
    });

    it('activates next tab when closing first active tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      useWorkspaceStore.getState().openNote('note-2', 'Note 2');

      const tabs = useWorkspaceStore.getState().tabs;
      // Set first tab as active
      useWorkspaceStore.getState().setActiveTab(tabs[0].id);

      // Close first tab - should activate the next
      useWorkspaceStore.getState().closeTab(tabs[0].id);
      expect(useWorkspaceStore.getState().activeTabId).toBe(tabs[1].id);
    });

    it('does not change active tab when closing a non-active tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      useWorkspaceStore.getState().openNote('note-2', 'Note 2');

      const tabs = useWorkspaceStore.getState().tabs;
      const activeTabId = useWorkspaceStore.getState().activeTabId;

      // Close the first (non-active) tab
      useWorkspaceStore.getState().closeTab(tabs[0].id);
      expect(useWorkspaceStore.getState().activeTabId).toBe(activeTabId);
    });
  });

  describe('setActiveTab', () => {
    it('sets the active tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      useWorkspaceStore.getState().openNote('note-2', 'Note 2');

      const tabs = useWorkspaceStore.getState().tabs;
      useWorkspaceStore.getState().setActiveTab(tabs[0].id);
      expect(useWorkspaceStore.getState().activeTabId).toBe(tabs[0].id);
    });
  });

  describe('updateTabTitle', () => {
    it('updates the title of a specific tab', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Old Title');
      const tabId = useWorkspaceStore.getState().tabs[0].id;

      useWorkspaceStore.getState().updateTabTitle(tabId, 'New Title');
      expect(useWorkspaceStore.getState().tabs[0].title).toBe('New Title');
    });

    it('does not affect other tabs', () => {
      useWorkspaceStore.getState().openNote('note-1', 'Note 1');
      useWorkspaceStore.getState().openNote('note-2', 'Note 2');

      const tabs = useWorkspaceStore.getState().tabs;
      useWorkspaceStore.getState().updateTabTitle(tabs[0].id, 'Updated');
      expect(useWorkspaceStore.getState().tabs[1].title).toBe('Note 2');
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
