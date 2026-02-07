import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TabBar } from './TabBar';

const mockSetActiveTab = vi.fn();
const mockCloseTab = vi.fn();
const mockUseWorkspaceStore = vi.fn();

vi.mock('../../store', () => ({
  useWorkspaceStore: (...args: unknown[]) => mockUseWorkspaceStore(...args),
  useUIStore: () => ({ presentationMode: false }),
}));

describe('TabBar', () => {
  beforeEach(() => {
    mockSetActiveTab.mockReset();
    mockCloseTab.mockReset();
    mockUseWorkspaceStore.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when there are no tabs', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [],
      activeTabId: null,
      setActiveTab: mockSetActiveTab,
      closeTab: mockCloseTab,
    });

    const { container } = render(<TabBar />);
    expect(container.innerHTML).toBe('');
  });

  it('renders open tabs with titles', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [
        { id: 'tab-1', noteId: 'note-1', title: 'First Note', isDirty: false },
        { id: 'tab-2', noteId: 'note-2', title: 'Second Note', isDirty: false },
      ],
      activeTabId: 'tab-1',
      setActiveTab: mockSetActiveTab,
      closeTab: mockCloseTab,
    });

    render(<TabBar />);
    expect(screen.getByText('First Note')).toBeInTheDocument();
    expect(screen.getByText('Second Note')).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [
        { id: 'tab-1', noteId: 'note-1', title: 'Active Tab', isDirty: false },
        { id: 'tab-2', noteId: 'note-2', title: 'Inactive Tab', isDirty: false },
      ],
      activeTabId: 'tab-1',
      setActiveTab: mockSetActiveTab,
      closeTab: mockCloseTab,
    });

    render(<TabBar />);
    const activeTab = screen.getByText('Active Tab').closest('[class*="bg-bg-primary"]');
    expect(activeTab).toBeInTheDocument();
  });

  it('calls setActiveTab when a tab is clicked', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [
        { id: 'tab-1', noteId: 'note-1', title: 'First', isDirty: false },
        { id: 'tab-2', noteId: 'note-2', title: 'Second', isDirty: false },
      ],
      activeTabId: 'tab-1',
      setActiveTab: mockSetActiveTab,
      closeTab: mockCloseTab,
    });

    render(<TabBar />);
    fireEvent.click(screen.getByText('Second'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('tab-2');
  });

  it('shows dirty indicator for unsaved tabs', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [
        { id: 'tab-1', noteId: 'note-1', title: 'Dirty Note', isDirty: true },
      ],
      activeTabId: 'tab-1',
      setActiveTab: mockSetActiveTab,
      closeTab: mockCloseTab,
    });

    render(<TabBar />);
    expect(screen.getByText('●')).toBeInTheDocument();
  });

  it('calls closeTab when close button is clicked', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [
        { id: 'tab-1', noteId: 'note-1', title: 'My Note', isDirty: false },
      ],
      activeTabId: 'tab-1',
      setActiveTab: mockSetActiveTab,
      closeTab: mockCloseTab,
    });

    render(<TabBar />);
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(mockCloseTab).toHaveBeenCalledWith('tab-1');
    expect(mockSetActiveTab).not.toHaveBeenCalled();
  });
});
