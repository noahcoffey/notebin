import MiniSearch from 'minisearch';
import type { Note } from '../../types';

export interface SearchResult {
  id: string;
  title: string;
  path: string;
  score: number;
  match: {
    field: string;
    terms: string[];
  };
  context?: string;
}

interface IndexedNote {
  id: string;
  title: string;
  path: string;
  content: string;
  tags: string;
}

class SearchService {
  private miniSearch: MiniSearch<IndexedNote>;
  private initialized = false;

  constructor() {
    this.miniSearch = new MiniSearch<IndexedNote>({
      fields: ['title', 'content', 'tags', 'path'],
      storeFields: ['title', 'path'],
      searchOptions: {
        boost: { title: 3, tags: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
      tokenize: (text) => text.toLowerCase().split(/[\s\-_/]+/),
    });
  }

  indexNotes(notes: Note[]): void {
    // Clear existing index
    this.miniSearch.removeAll();

    // Index all notes
    const documents: IndexedNote[] = notes.map(note => ({
      id: note.id,
      title: note.title,
      path: note.path,
      content: this.stripMarkdown(note.content),
      tags: (note.metadata?.inlineTags || []).join(' '),
    }));

    this.miniSearch.addAll(documents);
    this.initialized = true;
  }

  addNote(note: Note): void {
    const doc: IndexedNote = {
      id: note.id,
      title: note.title,
      path: note.path,
      content: this.stripMarkdown(note.content),
      tags: (note.metadata?.inlineTags || []).join(' '),
    };

    // Remove existing if present, then add
    try {
      this.miniSearch.discard(note.id);
    } catch {
      // Note wasn't in index
    }
    this.miniSearch.add(doc);
  }

  removeNote(noteId: string): void {
    try {
      this.miniSearch.discard(noteId);
    } catch {
      // Note wasn't in index
    }
  }

  updateNote(note: Note): void {
    this.addNote(note);
  }

  search(query: string, notes: Note[]): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    // Parse search operators
    const { cleanQuery, filters } = this.parseSearchQuery(query);

    // Get raw search results
    let results = this.miniSearch.search(cleanQuery, {
      combineWith: 'AND',
    });

    // Apply filters
    if (filters.tag) {
      results = results.filter(r => {
        const note = notes.find(n => n.id === r.id);
        return note?.metadata?.inlineTags?.some(t =>
          t.toLowerCase().includes(filters.tag!.toLowerCase())
        );
      });
    }

    if (filters.path) {
      results = results.filter(r => {
        const note = notes.find(n => n.id === r.id);
        return note?.path.toLowerCase().includes(filters.path!.toLowerCase());
      });
    }

    // Map to SearchResult with context
    return results.slice(0, 20).map(result => {
      const note = notes.find(n => n.id === result.id);
      const context = note ? this.getMatchContext(note.content, cleanQuery) : undefined;

      return {
        id: result.id,
        title: result.title || '',
        path: result.path || '',
        score: result.score,
        match: {
          field: Object.keys(result.match)[0] || 'content',
          terms: result.terms,
        },
        context,
      };
    });
  }

  private parseSearchQuery(query: string): { cleanQuery: string; filters: { tag?: string; path?: string } } {
    const filters: { tag?: string; path?: string } = {};
    let cleanQuery = query;

    // Extract tag: filter
    const tagMatch = query.match(/tag:(\S+)/i);
    if (tagMatch) {
      filters.tag = tagMatch[1];
      cleanQuery = cleanQuery.replace(tagMatch[0], '').trim();
    }

    // Extract path: filter
    const pathMatch = query.match(/path:(\S+)/i);
    if (pathMatch) {
      filters.path = pathMatch[1];
      cleanQuery = cleanQuery.replace(pathMatch[0], '').trim();
    }

    return { cleanQuery: cleanQuery || '*', filters };
  }

  private getMatchContext(content: string, query: string): string | undefined {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t && t !== '*');
    if (terms.length === 0) return undefined;

    const lines = content.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      for (const term of terms) {
        if (lowerLine.includes(term)) {
          // Return trimmed context around the match
          const index = lowerLine.indexOf(term);
          const start = Math.max(0, index - 40);
          const end = Math.min(line.length, index + term.length + 60);
          let context = line.slice(start, end);

          if (start > 0) context = '...' + context;
          if (end < line.length) context = context + '...';

          return context;
        }
      }
    }

    return undefined;
  }

  private stripMarkdown(content: string): string {
    return content
      .replace(/^---\n[\s\S]*?\n---/g, '') // Remove frontmatter
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2 $1') // Wiki links
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links
      .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
      .replace(/[*_~`]/g, ''); // Remove formatting markers
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const searchService = new SearchService();
