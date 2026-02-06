export interface Tab {
  id: string;
  noteId: string;
  title: string;
  isDirty: boolean;
}

export interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string | null;
}

export interface UIState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  rightPanelVisible: boolean;
  rightPanelWidth: number;
  quickSwitcherOpen: boolean;
  settingsOpen: boolean;
}
