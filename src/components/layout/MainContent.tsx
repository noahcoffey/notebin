import { useState, lazy, Suspense } from 'react';
import { TabBar } from '../workspace/TabBar';
import { MilkdownEditor } from '../editor/MilkdownEditor';
import { ShareModal } from '../share/ShareModal';
import { useWorkspaceStore, useNoteStore, useUIStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileText, PanelLeft, PanelRight, Share2, Loader2 } from 'lucide-react';

const GraphView = lazy(() =>
  import('../graph/GraphView').then(m => ({ default: m.GraphView }))
);

export function MainContent() {
  const { tabs, activeTabId } = useWorkspaceStore();
  const { getNoteById, initialized } = useNoteStore();
  const { sidebarVisible, rightPanelVisible, toggleSidebar, toggleRightPanel, graphViewOpen, closeGraphView } = useUIStore();
  const [showShareModal, setShowShareModal] = useState(false);
  const isMobile = useIsMobile();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeNote = activeTab ? getNoteById(activeTab.noteId) : undefined;

  // Show graph view if open
  if (graphViewOpen) {
    return (
      <main className="flex flex-col flex-1 min-w-0 h-full bg-bg-primary">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-accent" />
          </div>
        }>
          <GraphView onClose={closeGraphView} />
        </Suspense>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 min-w-0 h-full bg-bg-primary">
      <div className="flex items-stretch h-[38px] bg-bg-secondary border-b border-border-primary">
        {(!sidebarVisible || isMobile) && (
          <button
            onClick={toggleSidebar}
            className="self-center p-2.5 md:p-1.5 m-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Show sidebar"
          >
            <PanelLeft size={16} />
          </button>
        )}
        {!isMobile ? (
          <div className="flex-1 min-w-0 h-full">
            <TabBar />
          </div>
        ) : activeNote ? (
          <div className="flex-1 min-w-0 px-2 text-sm text-text-primary truncate">
            {activeNote.title}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex items-center ml-auto self-center">
          {activeNote && (
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2.5 md:p-1.5 m-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Share note"
            >
              <Share2 size={16} />
            </button>
          )}
          {(!rightPanelVisible || isMobile) && (
            <button
              onClick={toggleRightPanel}
              className="p-2.5 md:p-1.5 m-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Show backlinks panel"
            >
              <PanelRight size={16} />
            </button>
          )}
        </div>
      </div>

      {showShareModal && activeNote && (
        <ShareModal note={activeNote} onClose={() => setShowShareModal(false)} />
      )}
      <div className="flex-1 overflow-hidden">
        {activeNote ? (
          <MilkdownEditor note={activeNote} />
        ) : initialized ? (
          <EmptyState />
        ) : null}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-text-muted">
      <FileText size={48} strokeWidth={1} className="mb-4 opacity-50" />
      <p className="text-lg">No note selected</p>
      <p className="text-sm mt-2">
        Create a new note or open an existing one from the sidebar
      </p>
      <p className="text-xs mt-4 text-text-faint">
        Press <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Cmd+O</kbd> to quick switch
      </p>
    </div>
  );
}
