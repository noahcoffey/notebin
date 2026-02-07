import { useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { RightPanel } from './RightPanel';
import { StatusBar } from './StatusBar';
import { QuickSwitcher } from '../sidebar/QuickSwitcher';
import { useNoteStore, useUIStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';

const SettingsModal = lazy(() =>
  import('../settings/SettingsModal').then(m => ({ default: m.SettingsModal }))
);

const ImportModal = lazy(() =>
  import('../settings/ImportModal').then(m => ({ default: m.ImportModal }))
);

export function AppShell() {
  const { loadNotes, loadFolders } = useNoteStore();
  const {
    sidebarVisible,
    rightPanelVisible,
    toggleSidebar,
    toggleRightPanel,
    quickSwitcherOpen,
    openQuickSwitcher,
    closeQuickSwitcher,
    graphViewOpen,
    openGraphView,
    closeGraphView,
    settingsOpen,
    openSettings,
    closeSettings,
    importModalOpen,
  } = useUIStore();

  const isMobile = useIsMobile();

  useEffect(() => {
    loadNotes();
    loadFolders();
  }, [loadNotes, loadFolders]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        if (quickSwitcherOpen) {
          closeQuickSwitcher();
        } else {
          openQuickSwitcher();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (graphViewOpen) {
          closeGraphView();
        } else {
          openGraphView();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        if (settingsOpen) {
          closeSettings();
        } else {
          openSettings();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSwitcherOpen, openQuickSwitcher, closeQuickSwitcher, graphViewOpen, openGraphView, closeGraphView, settingsOpen, openSettings, closeSettings]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {/* Mobile backdrop for sidebar */}
        {isMobile && sidebarVisible && (
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={toggleSidebar}
          />
        )}
        <MainContent />
        {/* Mobile backdrop for right panel */}
        {isMobile && rightPanelVisible && (
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={toggleRightPanel}
          />
        )}
        <RightPanel />
      </div>
      <StatusBar />
      {quickSwitcherOpen && <QuickSwitcher />}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal />
        </Suspense>
      )}
      {importModalOpen && (
        <Suspense fallback={null}>
          <ImportModal />
        </Suspense>
      )}
    </div>
  );
}
