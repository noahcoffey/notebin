import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutlinePanel } from './OutlinePanel';

const mockScrollToPosition = vi.fn();
const mockUseWorkspaceStore = vi.fn();
const mockUseNoteStore = vi.fn();

vi.mock('../../store', () => ({
  useWorkspaceStore: (...args: unknown[]) => mockUseWorkspaceStore(...args),
  useNoteStore: (...args: unknown[]) => mockUseNoteStore(...args),
}));

describe('OutlinePanel', () => {
  beforeEach(() => {
    mockScrollToPosition.mockReset();
    mockUseWorkspaceStore.mockReset();
    mockUseNoteStore.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows message when no note is selected', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [],
      activeTabId: null,
      scrollToPosition: mockScrollToPosition,
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => undefined),
    });

    render(<OutlinePanel />);
    expect(screen.getByText('Select a note to see outline')).toBeInTheDocument();
  });

  it('shows empty state when note has no headings', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [{ id: 'tab-1', noteId: 'note-1', title: 'Test', isDirty: false }],
      activeTabId: 'tab-1',
      scrollToPosition: mockScrollToPosition,
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => ({
        id: 'note-1',
        content: 'No headings here',
        metadata: {
          wordCount: 3,
          headings: [],
          outgoingLinks: [],
          blockIds: [],
          inlineTags: [],
        },
      })),
    });

    render(<OutlinePanel />);
    expect(screen.getByText('No headings')).toBeInTheDocument();
    expect(screen.getByText('Add headings (# Heading) to create an outline')).toBeInTheDocument();
  });

  it('renders headings from note content', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [{ id: 'tab-1', noteId: 'note-1', title: 'Test', isDirty: false }],
      activeTabId: 'tab-1',
      scrollToPosition: mockScrollToPosition,
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => ({
        id: 'note-1',
        content: '# Intro\n## Section A\n## Section B',
        metadata: {
          wordCount: 5,
          headings: [
            { level: 1, text: 'Intro', position: 0 },
            { level: 2, text: 'Section A', position: 8 },
            { level: 2, text: 'Section B', position: 20 },
          ],
          outgoingLinks: [],
          blockIds: [],
          inlineTags: [],
        },
      })),
    });

    render(<OutlinePanel />);
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Section A')).toBeInTheDocument();
    expect(screen.getByText('Section B')).toBeInTheDocument();
    expect(screen.getByText('Outline')).toBeInTheDocument();
  });

  it('calls scrollToPosition when a heading is clicked', () => {
    mockUseWorkspaceStore.mockReturnValue({
      tabs: [{ id: 'tab-1', noteId: 'note-1', title: 'Test', isDirty: false }],
      activeTabId: 'tab-1',
      scrollToPosition: mockScrollToPosition,
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => ({
        id: 'note-1',
        content: '# Intro\n## Details',
        metadata: {
          wordCount: 2,
          headings: [
            { level: 1, text: 'Intro', position: 0 },
            { level: 2, text: 'Details', position: 8 },
          ],
          outgoingLinks: [],
          blockIds: [],
          inlineTags: [],
        },
      })),
    });

    render(<OutlinePanel />);
    fireEvent.click(screen.getByText('Details'));
    expect(mockScrollToPosition).toHaveBeenCalledWith(8);
  });
});
