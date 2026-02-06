import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SearchPanel } from './SearchPanel';

vi.mock('../../store', () => ({
  useNoteStore: vi.fn(() => ({
    notes: [],
  })),
  useWorkspaceStore: vi.fn(() => ({
    openNote: vi.fn(),
  })),
}));

vi.mock('../../services/search', () => ({
  searchService: {
    indexNotes: vi.fn(),
    search: vi.fn(() => []),
  },
}));

vi.mock('../../utils', () => ({
  debounce: (fn: (...args: string[]) => void) => fn,
}));

describe('SearchPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders search input with placeholder', () => {
    render(<SearchPanel />);
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
  });

  it('renders filter usage hints', () => {
    const { container } = render(<SearchPanel />);
    const hintText = container.textContent;
    expect(hintText).toContain('tag:');
    expect(hintText).toContain('path:');
  });

  it('shows default message when no query entered', () => {
    const { container } = render(<SearchPanel />);
    expect(container.textContent).toContain('Search your notes');
  });

  it('allows typing into the search field', async () => {
    const user = userEvent.setup();
    render(<SearchPanel />);

    const input = screen.getByPlaceholderText('Search notes...');
    await user.type(input, 'test query');
    expect(input).toHaveValue('test query');
  });

  it('shows "No results found" when search returns empty', async () => {
    const user = userEvent.setup();
    render(<SearchPanel />);

    const input = screen.getByPlaceholderText('Search notes...');
    await user.type(input, 'nonexistent');

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });
});
