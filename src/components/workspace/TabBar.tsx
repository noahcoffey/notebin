import { useWorkspaceStore, useUIStore } from '../../store';
import { X } from 'lucide-react';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useWorkspaceStore();
  const { presentationMode } = useUIStore();

  if (tabs.length === 0) {
    return null;
  }

  const visibleTabs = presentationMode ? tabs.filter(t => t.id === activeTabId) : tabs;

  return (
    <div className="flex items-center overflow-hidden" style={{ height: 'calc(100% + 1px)' }}>
      {visibleTabs.map(tab => (
        <div
          key={tab.id}
          className={`
            group flex items-center gap-2 px-3 h-full text-sm cursor-pointer
            border-r border-border-secondary min-w-0
            ${tab.id === activeTabId
              ? 'bg-bg-primary text-text-primary'
              : 'text-text-secondary hover:bg-bg-hover'
            }
          `}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="truncate max-w-[150px]">
            {tab.isDirty && <span className="text-accent mr-1">●</span>}
            {tab.title}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className={`
              p-0.5 rounded hover:bg-bg-active
              ${tab.id === activeTabId ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}
            `}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
