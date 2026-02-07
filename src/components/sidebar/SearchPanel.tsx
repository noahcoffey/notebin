import { useState, useEffect, useRef, useMemo } from 'react';
import { useNoteStore, useWorkspaceStore, useUIStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';
import { searchService } from '../../services/search';
import type { SearchResult } from '../../services/search';
import { Search, FileText, X, Hash, Folder } from 'lucide-react';
import { debounce } from '../../utils';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { notes } = useNoteStore();
  const { openNote } = useWorkspaceStore();
  const { sidebarVisible, toggleSidebar } = useUIStore();
  const isMobile = useIsMobile();

  // Index notes when they change
  useEffect(() => {
    searchService.indexNotes(notes);
  }, [notes]);

  // Debounced search function
  const performSearch = useMemo(
    () => debounce((searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      const searchResults = searchService.search(searchQuery, notes);
      setResults(searchResults);
      setIsSearching(false);
    }, 200),
    [notes]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsSearching(true);
    performSearch(value);
  };

  const handleResultClick = (result: SearchResult) => {
    openNote(result.id, result.title);
    if (isMobile && sidebarVisible) toggleSidebar();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-bg-tertiary border border-border-primary rounded-lg focus:outline-none focus:border-accent"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-bg-hover text-text-muted"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="mt-1 px-1 text-xs text-text-faint">
          Use <code className="bg-bg-tertiary px-1 rounded">tag:</code> or{' '}
          <code className="bg-bg-tertiary px-1 rounded">path:</code> to filter
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {isSearching && (
          <div className="px-3 py-4 text-sm text-text-muted text-center">
            Searching...
          </div>
        )}

        {!isSearching && query && results.length === 0 && (
          <div className="px-3 py-4 text-sm text-text-muted text-center">
            No results found
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-xs text-text-muted">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
            {results.map(result => (
              <SearchResultItem
                key={result.id}
                result={result}
                onClick={() => handleResultClick(result)}
              />
            ))}
          </div>
        )}

        {!query && (
          <div className="px-3 py-4 text-sm text-text-muted text-center">
            <p>Search your notes</p>
            <p className="mt-2 text-xs text-text-faint">
              Type to search by title, content, or tags
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  return (
    <div
      onClick={onClick}
      className="px-2 py-2 rounded-lg hover:bg-bg-hover cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-text-muted shrink-0" />
        <span className="text-sm text-text-primary truncate">{result.title}</span>
      </div>
      <div className="flex items-center gap-1 mt-1 ml-5 text-xs text-text-muted">
        <Folder size={10} />
        <span className="truncate">{result.path}</span>
      </div>
      {result.context && (
        <div className="mt-1 ml-5 text-xs text-text-secondary line-clamp-2">
          {result.context}
        </div>
      )}
      {result.match.field === 'tags' && (
        <div className="flex items-center gap-1 mt-1 ml-5">
          <Hash size={10} className="text-accent" />
          <span className="text-xs text-accent">{result.match.terms.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
