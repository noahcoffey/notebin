import { useEffect, useRef, lazy, Suspense } from 'react';
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
  } = useUIStore();

  const isMobile = useIsMobile();
  const prevIsMobileRef = useRef(isMobile);

  useEffect(() => {
    loadNotes();
    loadFolders();
  }, [loadNotes, loadFolders]);

  // Auto-close panels when entering mobile mode
  useEffect(() => {
    if (isMobile && !prevIsMobileRef.current) {
      if (sidebarVisible) toggleSidebar();
      if (rightPanelVisible) toggleRightPanel();
    }
    prevIsMobileRef.current = isMobile;
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // On first mount, close panels if already mobile (handles persisted localStorage state)
  useEffect(() => {
    if (isMobile) {
      if (sidebarVisible) toggleSidebar();
      if (rightPanelVisible) toggleRightPanel();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="flex flex-col h-screen w-screen overflow-hidden">
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
    </div>
  );
}
