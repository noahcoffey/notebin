import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatusBar } from './StatusBar';

const mockUseWorkspaceStore = vi.fn();
const mockUseNoteStore = vi.fn();

vi.mock('../../store', () => ({
  useWorkspaceStore: (...args: unknown[]) => mockUseWorkspaceStore(...args),
  useNoteStore: (...args: unknown[]) => mockUseNoteStore(...args),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

describe('StatusBar', () => {
  beforeEach(() => {
    mockUseWorkspaceStore.mockReset();
    mockUseNoteStore.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows "No note selected" when no active tab', () => {
    mockUseWorkspaceStore.mockReturnValue({
      activeTabId: null,
      tabs: [],
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => undefined),
    });

    render(<StatusBar />);
    expect(screen.getByText('No note selected')).toBeInTheDocument();
  });

  it('shows word and char counts for active note', () => {
    mockUseWorkspaceStore.mockReturnValue({
      activeTabId: 'tab-1',
      tabs: [{ id: 'tab-1', noteId: 'note-1', title: 'Test', isDirty: false }],
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => ({
        id: 'note-1',
        content: 'Hello world',
        metadata: {
          wordCount: 2,
          headings: [],
          outgoingLinks: [],
          blockIds: [],
          inlineTags: [],
        },
      })),
    });

    render(<StatusBar />);
    expect(screen.getByText('2 words')).toBeInTheDocument();
    expect(screen.getByText('11 chars')).toBeInTheDocument();
  });

  it('shows link count when note has outgoing links', () => {
    mockUseWorkspaceStore.mockReturnValue({
      activeTabId: 'tab-1',
      tabs: [{ id: 'tab-1', noteId: 'note-1', title: 'Test', isDirty: false }],
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => ({
        id: 'note-1',
        content: 'Hello world',
        metadata: {
          wordCount: 2,
          headings: [],
          outgoingLinks: [
            { target: 'other', type: 'wikilink', position: { start: 0, end: 5, line: 0 } },
            { target: 'another', type: 'wikilink', position: { start: 6, end: 12, line: 0 } },
          ],
          blockIds: [],
          inlineTags: [],
        },
      })),
    });

    render(<StatusBar />);
    expect(screen.getByText('2 links')).toBeInTheDocument();
  });

  it('does not show link count when note has no outgoing links', () => {
    mockUseWorkspaceStore.mockReturnValue({
      activeTabId: 'tab-1',
      tabs: [{ id: 'tab-1', noteId: 'note-1', title: 'Test', isDirty: false }],
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => ({
        id: 'note-1',
        content: 'Hello world',
        metadata: {
          wordCount: 2,
          headings: [],
          outgoingLinks: [],
          blockIds: [],
          inlineTags: [],
        },
      })),
    });

    render(<StatusBar />);
    expect(screen.queryByText(/\d+ links/)).not.toBeInTheDocument();
  });

  it('renders keyboard shortcut hints', () => {
    mockUseWorkspaceStore.mockReturnValue({
      activeTabId: null,
      tabs: [],
    });
    mockUseNoteStore.mockReturnValue({
      getNoteById: vi.fn(() => undefined),
    });

    const { container } = render(<StatusBar />);
    // Check shortcut labels exist in the footer
    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
    expect(footer!.textContent).toContain('Quick Open');
    expect(footer!.textContent).toContain('Graph');
    expect(footer!.textContent).toContain('Save');
    expect(footer!.textContent).toContain('Settings');
  });
});
