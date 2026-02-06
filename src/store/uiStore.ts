import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  rightPanelVisible: boolean;
  rightPanelWidth: number;
  quickSwitcherOpen: boolean;
  settingsOpen: boolean;
  graphViewOpen: boolean;

  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  toggleRightPanel: () => void;
  setRightPanelWidth: (width: number) => void;
  openQuickSwitcher: () => void;
  closeQuickSwitcher: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openGraphView: () => void;
  closeGraphView: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarVisible: true,
      sidebarWidth: 260,
      rightPanelVisible: true,
      rightPanelWidth: 280,
      quickSwitcherOpen: false,
      settingsOpen: false,
      graphViewOpen: false,

      toggleSidebar: () => set(state => ({ sidebarVisible: !state.sidebarVisible })),
      setSidebarWidth: (width: number) => set({ sidebarWidth: Math.max(200, Math.min(400, width)) }),
      toggleRightPanel: () => set(state => ({ rightPanelVisible: !state.rightPanelVisible })),
      setRightPanelWidth: (width: number) => set({ rightPanelWidth: Math.max(200, Math.min(400, width)) }),
      openQuickSwitcher: () => set({ quickSwitcherOpen: true }),
      closeQuickSwitcher: () => set({ quickSwitcherOpen: false }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      openGraphView: () => set({ graphViewOpen: true }),
      closeGraphView: () => set({ graphViewOpen: false }),
    }),
    {
      name: 'noted-ui',
      partialize: (state) => ({
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        rightPanelVisible: state.rightPanelVisible,
        rightPanelWidth: state.rightPanelWidth,
      }),
    }
  )
);
