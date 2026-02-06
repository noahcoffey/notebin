import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

const initialState = {
  sidebarVisible: true,
  sidebarWidth: 260,
  rightPanelVisible: true,
  rightPanelWidth: 280,
  quickSwitcherOpen: false,
  settingsOpen: false,
  graphViewOpen: false,
};

function resetStore() {
  useUIStore.setState(initialState);
}

describe('uiStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('default state', () => {
    it('has correct defaults', () => {
      const state = useUIStore.getState();
      expect(state.sidebarVisible).toBe(true);
      expect(state.sidebarWidth).toBe(260);
      expect(state.rightPanelVisible).toBe(true);
      expect(state.rightPanelWidth).toBe(280);
      expect(state.quickSwitcherOpen).toBe(false);
      expect(state.settingsOpen).toBe(false);
      expect(state.graphViewOpen).toBe(false);
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar from visible to hidden', () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarVisible).toBe(false);
    });

    it('toggles sidebar back to visible', () => {
      useUIStore.getState().toggleSidebar();
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarVisible).toBe(true);
    });
  });

  describe('setSidebarWidth', () => {
    it('sets sidebar width within bounds', () => {
      useUIStore.getState().setSidebarWidth(300);
      expect(useUIStore.getState().sidebarWidth).toBe(300);
    });

    it('clamps width to minimum of 200', () => {
      useUIStore.getState().setSidebarWidth(100);
      expect(useUIStore.getState().sidebarWidth).toBe(200);
    });

    it('clamps width to maximum of 400', () => {
      useUIStore.getState().setSidebarWidth(500);
      expect(useUIStore.getState().sidebarWidth).toBe(400);
    });
  });

  describe('toggleRightPanel', () => {
    it('toggles right panel from visible to hidden', () => {
      useUIStore.getState().toggleRightPanel();
      expect(useUIStore.getState().rightPanelVisible).toBe(false);
    });

    it('toggles right panel back to visible', () => {
      useUIStore.getState().toggleRightPanel();
      useUIStore.getState().toggleRightPanel();
      expect(useUIStore.getState().rightPanelVisible).toBe(true);
    });
  });

  describe('setRightPanelWidth', () => {
    it('sets right panel width within bounds', () => {
      useUIStore.getState().setRightPanelWidth(350);
      expect(useUIStore.getState().rightPanelWidth).toBe(350);
    });

    it('clamps width to minimum of 200', () => {
      useUIStore.getState().setRightPanelWidth(50);
      expect(useUIStore.getState().rightPanelWidth).toBe(200);
    });

    it('clamps width to maximum of 400', () => {
      useUIStore.getState().setRightPanelWidth(600);
      expect(useUIStore.getState().rightPanelWidth).toBe(400);
    });
  });

  describe('quick switcher', () => {
    it('opens quick switcher', () => {
      useUIStore.getState().openQuickSwitcher();
      expect(useUIStore.getState().quickSwitcherOpen).toBe(true);
    });

    it('closes quick switcher', () => {
      useUIStore.getState().openQuickSwitcher();
      useUIStore.getState().closeQuickSwitcher();
      expect(useUIStore.getState().quickSwitcherOpen).toBe(false);
    });
  });

  describe('settings', () => {
    it('opens settings', () => {
      useUIStore.getState().openSettings();
      expect(useUIStore.getState().settingsOpen).toBe(true);
    });

    it('closes settings', () => {
      useUIStore.getState().openSettings();
      useUIStore.getState().closeSettings();
      expect(useUIStore.getState().settingsOpen).toBe(false);
    });
  });

  describe('graph view', () => {
    it('opens graph view', () => {
      useUIStore.getState().openGraphView();
      expect(useUIStore.getState().graphViewOpen).toBe(true);
    });

    it('closes graph view', () => {
      useUIStore.getState().openGraphView();
      useUIStore.getState().closeGraphView();
      expect(useUIStore.getState().graphViewOpen).toBe(false);
    });
  });
});
