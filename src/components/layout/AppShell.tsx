import { useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { RightPanel } from './RightPanel';
import { StatusBar } from './StatusBar';
import { QuickSwitcher } from '../sidebar/QuickSwitcher';
import { useNoteStore, useUIStore } from '../../store';

const SettingsModal = lazy(() =>
  import('../settings/SettingsModal').then(m => ({ default: m.SettingsModal }))
);

export function AppShell() {
  const { loadNotes, loadFolders } = useNoteStore();
  const {
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
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent />
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
