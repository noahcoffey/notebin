import { useWorkspaceStore } from '../../store';
import { X } from 'lucide-react';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useWorkspaceStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center h-[38px] bg-bg-secondary border-b border-border-primary overflow-x-auto scrollbar-thin">
      {tabs.map(tab => (
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
              ${tab.id === activeTabId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
