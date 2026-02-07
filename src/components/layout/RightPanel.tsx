import { useState } from 'react';
import { useUIStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';
import { BacklinksPanel } from '../panels/BacklinksPanel';
import { OutlinePanel } from '../panels/OutlinePanel';
import { PanelRightClose, Link2, List } from 'lucide-react';

type PanelTab = 'backlinks' | 'outline';

export function RightPanel() {
  const { rightPanelVisible, rightPanelWidth, toggleRightPanel } = useUIStore();
  const [activeTab, setActiveTab] = useState<PanelTab>('backlinks');
  const isMobile = useIsMobile();

  if (!rightPanelVisible) {
    return null;
  }

  return (
    <aside
      className={
        isMobile
          ? 'fixed inset-y-0 right-0 z-40 flex flex-col bg-bg-secondary border-l border-border-primary w-[85vw] max-w-[320px]'
          : 'flex flex-col bg-bg-secondary border-l border-border-primary h-full'
      }
      style={isMobile ? undefined : { width: rightPanelWidth }}
    >
      <div className="flex items-center justify-between h-[38px] px-2 border-b border-border-primary">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('backlinks')}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
              activeTab === 'backlinks'
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
            title="Backlinks"
          >
            <Link2 size={12} />
            <span>Backlinks</span>
          </button>
          <button
            onClick={() => setActiveTab('outline')}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
              activeTab === 'outline'
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
            title="Outline"
          >
            <List size={12} />
            <span>Outline</span>
          </button>
        </div>
        <button
          onClick={toggleRightPanel}
          className="p-2.5 md:p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          title="Close panel"
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'backlinks' ? (
          <BacklinksPanel />
        ) : (
          <OutlinePanel />
        )}
      </div>
    </aside>
  );
}
