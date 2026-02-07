import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const isMobileDevice =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 767px)').matches;

interface UIState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  rightPanelVisible: boolean;
  rightPanelWidth: number;
  quickSwitcherOpen: boolean;
  settingsOpen: boolean;
  graphViewOpen: boolean;
  tasksViewOpen: boolean;
  trashViewOpen: boolean;
  importModalOpen: boolean;
  presentationMode: boolean;
  prePresentationState: { sidebarVisible: boolean; rightPanelVisible: boolean } | null;

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
  openTasksView: () => void;
  closeTasksView: () => void;
  openTrashView: () => void;
  closeTrashView: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  togglePresentationMode: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarVisible: !isMobileDevice,
      sidebarWidth: 260,
      rightPanelVisible: !isMobileDevice,
      rightPanelWidth: 280,
      quickSwitcherOpen: false,
      settingsOpen: false,
      graphViewOpen: false,
      tasksViewOpen: false,
      trashViewOpen: false,
      importModalOpen: false,
      presentationMode: false,
      prePresentationState: null,

      toggleSidebar: () => set(state => ({ sidebarVisible: !state.sidebarVisible })),
      setSidebarWidth: (width: number) => set({ sidebarWidth: Math.max(200, Math.min(400, width)) }),
      toggleRightPanel: () => set(state => ({ rightPanelVisible: !state.rightPanelVisible })),
      setRightPanelWidth: (width: number) => set({ rightPanelWidth: Math.max(200, Math.min(400, width)) }),
      openQuickSwitcher: () => set({ quickSwitcherOpen: true }),
      closeQuickSwitcher: () => set({ quickSwitcherOpen: false }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      openGraphView: () => set({ graphViewOpen: true, tasksViewOpen: false, trashViewOpen: false }),
      closeGraphView: () => set({ graphViewOpen: false }),
      openTasksView: () => set({ tasksViewOpen: true, graphViewOpen: false, trashViewOpen: false }),
      closeTasksView: () => set({ tasksViewOpen: false }),
      openTrashView: () => set({ trashViewOpen: true, graphViewOpen: false, tasksViewOpen: false }),
      closeTrashView: () => set({ trashViewOpen: false }),
      openImportModal: () => set({ importModalOpen: true }),
      closeImportModal: () => set({ importModalOpen: false }),
      togglePresentationMode: () => set(state => {
        if (state.presentationMode) {
          // Exiting: restore previous state
          const prev = state.prePresentationState;
          return {
            presentationMode: false,
            prePresentationState: null,
            sidebarVisible: prev?.sidebarVisible ?? state.sidebarVisible,
            rightPanelVisible: prev?.rightPanelVisible ?? state.rightPanelVisible,
          };
        } else {
          // Entering: save state and hide panels
          return {
            presentationMode: true,
            prePresentationState: {
              sidebarVisible: state.sidebarVisible,
              rightPanelVisible: state.rightPanelVisible,
            },
            sidebarVisible: false,
            rightPanelVisible: false,
          };
        }
      }),
    }),
    {
      name: 'noted-ui',
      partialize: (state) => ({
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        rightPanelVisible: state.rightPanelVisible,
        rightPanelWidth: state.rightPanelWidth,
      }),
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as Partial<UIState>) };
        // On mobile, always start with panels closed regardless of persisted state
        if (isMobileDevice) {
          merged.sidebarVisible = false;
          merged.rightPanelVisible = false;
        }
        return merged;
      },
    }
  )
);
