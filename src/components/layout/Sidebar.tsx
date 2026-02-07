import { useState } from 'react';
import { useUIStore, useAuthStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileExplorer } from '../sidebar/FileExplorer';
import { SearchPanel } from '../sidebar/SearchPanel';
import { PanelLeftClose, Search, Settings, GitBranch, FolderTree, LogOut, Trash2 } from 'lucide-react';

type SidebarTab = 'files' | 'search';

export function Sidebar() {
  const { sidebarVisible, sidebarWidth, toggleSidebar, openSettings, openGraphView, openTrashView } = useUIStore();
  const { signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');
  const isMobile = useIsMobile();

  if (!sidebarVisible) {
    return null;
  }

  return (
    <aside
      className={
        isMobile
          ? 'fixed inset-y-0 left-0 z-40 flex flex-col bg-bg-secondary border-r border-border-primary w-[85vw] max-w-[320px]'
          : 'flex flex-col bg-bg-secondary border-r border-border-primary h-full'
      }
      style={isMobile ? undefined : { width: sidebarWidth }}
    >
      <div className="flex items-center justify-between h-[38px] px-2 border-b border-border-primary">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('files')}
            className={`p-2.5 md:p-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'files'
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
            title="Files"
          >
            <FolderTree size={16} />
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`p-2.5 md:p-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'search'
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
            title="Search"
          >
            <Search size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openGraphView}
            className="p-2.5 md:p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Graph view (Cmd+G)"
          >
            <GitBranch size={16} />
          </button>
          <button
            onClick={toggleSidebar}
            className="p-2.5 md:p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Close sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'files' ? <FileExplorer /> : <SearchPanel />}
      </div>
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border-primary">
        <button
          onClick={openSettings}
          className="p-2.5 md:p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          title="Settings (Cmd+,)"
        >
          <Settings size={16} />
        </button>
        <button
          onClick={openTrashView}
          className="p-2.5 md:p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          title="Trash"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={signOut}
          className="p-2.5 md:p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
