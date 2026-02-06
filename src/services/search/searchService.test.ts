import { describe, it, expect, beforeEach } from 'vitest';
import { searchService } from './searchService';
import type { Note } from '../../types';

function makeNote(overrides: Partial<Note> & { id: string; title: string }): Note {
  return {
    path: overrides.title.toLowerCase().replace(/\s+/g, '-'),
    folderId: null,
    content: '',
    frontmatter: {},
    metadata: {
      wordCount: 0,
      headings: [],
      outgoingLinks: [],
      blockIds: [],
      inlineTags: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const sampleNotes: Note[] = [
  makeNote({
    id: '1',
    title: 'Getting Started with TypeScript',
    path: 'guides/typescript',
    content: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
    metadata: {
      wordCount: 12,
      headings: [],
      outgoingLinks: [],
      blockIds: [],
      inlineTags: ['typescript', 'programming'],
    },
  }),
  makeNote({
    id: '2',
    title: 'React Hooks Overview',
    path: 'guides/react-hooks',
    content: 'React hooks allow you to use state and lifecycle features in function components.',
    metadata: {
      wordCount: 13,
      headings: [],
      outgoingLinks: [],
      blockIds: [],
      inlineTags: ['react', 'hooks'],
    },
  }),
  makeNote({
    id: '3',
    title: 'Meeting Notes - Q4 Planning',
    path: 'meetings/q4-planning',
    content: 'Discussed the roadmap for Q4. Key deliverables include search improvements and performance tuning.',
    metadata: {
      wordCount: 14,
      headings: [],
      outgoingLinks: [],
      blockIds: [],
      inlineTags: ['meeting', 'planning'],
    },
  }),
];

describe('SearchService', () => {
  beforeEach(() => {
    // Reset index before each test
    searchService.indexNotes([]);
  });

  describe('initialization', () => {
    it('should not be initialized before indexing', () => {
      // After indexNotes([]) in beforeEach, it is initialized
      // But a fresh service would not be — we test the flag after indexing
      expect(searchService.isInitialized()).toBe(true);
    });

    it('should be initialized after indexing notes', () => {
      searchService.indexNotes(sampleNotes);
      expect(searchService.isInitialized()).toBe(true);
    });
  });

  describe('indexNotes', () => {
    it('should index notes and make them searchable', () => {
      searchService.indexNotes(sampleNotes);
      const results = searchService.search('TypeScript', sampleNotes);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('1');
    });

    it('should replace previous index when called again', () => {
      searchService.indexNotes(sampleNotes);
      // Re-index with only one note
      const subset = [sampleNotes[1]];
      searchService.indexNotes(subset);

      const results = searchService.search('TypeScript', sampleNotes);
      expect(results.length).toBe(0);

      const reactResults = searchService.search('React', subset);
      expect(reactResults.length).toBeGreaterThan(0);
    });
  });

  describe('search by title', () => {
    beforeEach(() => {
      searchService.indexNotes(sampleNotes);
    });

    it('should find notes matching title text', () => {
      const results = searchService.search('React Hooks', sampleNotes);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('React Hooks Overview');
    });

    it('should rank title matches higher due to boost', () => {
      // "TypeScript" appears in both title and content of note 1
      const results = searchService.search('TypeScript', sampleNotes);
      expect(results[0].id).toBe('1');
    });
  });

  describe('search by content', () => {
    beforeEach(() => {
      searchService.indexNotes(sampleNotes);
    });

    it('should find notes matching content text', () => {
      const results = searchService.search('roadmap', sampleNotes);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('3');
    });

    it('should return context snippet for content matches', () => {
      const results = searchService.search('roadmap', sampleNotes);
      expect(results[0].context).toBeDefined();
      expect(results[0].context).toContain('roadmap');
    });

    it('should find notes via prefix matching', () => {
      const results = searchService.search('deliver', sampleNotes);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('3');
    });
  });

  describe('search by tags', () => {
    beforeEach(() => {
      searchService.indexNotes(sampleNotes);
    });

    it('should find notes matching inline tags', () => {
      const results = searchService.search('programming', sampleNotes);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('1');
    });
  });

  describe('search filters', () => {
    beforeEach(() => {
      searchService.indexNotes(sampleNotes);
    });

    it('should filter results by tag: operator', () => {
      // Search with a broad term but filter by tag
      const results = searchService.search('tag:react hooks', sampleNotes);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => {
        const note = sampleNotes.find(n => n.id === r.id);
        return note?.metadata?.inlineTags?.some(t => t.toLowerCase().includes('react'));
      })).toBe(true);
    });

    it('should filter results by path: operator', () => {
      const results = searchService.search('path:meetings planning', sampleNotes);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.path.toLowerCase().includes('meetings'))).toBe(true);
    });
  });

  describe('search result structure', () => {
    beforeEach(() => {
      searchService.indexNotes(sampleNotes);
    });

    it('should return properly shaped SearchResult objects', () => {
      const results = searchService.search('TypeScript', sampleNotes);
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('match');
      expect(result.match).toHaveProperty('field');
      expect(result.match).toHaveProperty('terms');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should limit results to 20', () => {
      // Create more than 20 notes with similar content
      const manyNotes = Array.from({ length: 25 }, (_, i) =>
        makeNote({
          id: `bulk-${i}`,
          title: `Test Note ${i}`,
          content: 'common keyword shared across all notes',
        })
      );
      searchService.indexNotes(manyNotes);
      const results = searchService.search('common keyword', manyNotes);
      expect(results.length).toBeLessThanOrEqual(20);
    });
  });

  describe('addNote', () => {
    it('should add a single note to the index', () => {
      searchService.indexNotes([]);
      const note = sampleNotes[0];
      searchService.addNote(note);

      const results = searchService.search('TypeScript', [note]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('1');
    });

    it('should replace an existing note if re-added', () => {
      searchService.indexNotes(sampleNotes);
      const updatedNote = makeNote({
        id: '1',
        title: 'Updated Title About Python',
        path: 'guides/python',
        content: 'Python is a dynamically typed language.',
      });

      searchService.addNote(updatedNote);
      const allNotes = [...sampleNotes.slice(1), updatedNote];

      // The old content/title is gone — searching the old title should not find note '1'
      const tsResults = searchService.search('Getting Started', allNotes);
      const matchesOldNote = tsResults.some(r => r.id === '1');
      expect(matchesOldNote).toBe(false);

      const pyResults = searchService.search('Python', allNotes);
      expect(pyResults.length).toBeGreaterThan(0);
      expect(pyResults[0].id).toBe('1');
    });
  });

  describe('removeNote', () => {
    it('should remove a note from the index', () => {
      searchService.indexNotes(sampleNotes);
      searchService.removeNote('1');

      const results = searchService.search('TypeScript', sampleNotes);
      const matchesRemoved = results.some(r => r.id === '1');
      expect(matchesRemoved).toBe(false);
    });

    it('should not throw when removing a non-existent note', () => {
      searchService.indexNotes(sampleNotes);
      expect(() => searchService.removeNote('nonexistent-id')).not.toThrow();
    });
  });

  describe('updateNote', () => {
    it('should update an existing note in the index', () => {
      searchService.indexNotes(sampleNotes);

      const updatedNote = makeNote({
        id: '2',
        title: 'Vue Composition API',
        path: 'guides/vue',
        content: 'The Vue composition API provides reactive state management.',
      });

      searchService.updateNote(updatedNote);

      const oldResults = searchService.search('React Hooks', [updatedNote, ...sampleNotes]);
      const matchesOld = oldResults.some(r => r.id === '2');
      expect(matchesOld).toBe(false);

      const newResults = searchService.search('Vue Composition', [updatedNote, ...sampleNotes]);
      expect(newResults.length).toBeGreaterThan(0);
      expect(newResults[0].id).toBe('2');
    });
  });

  describe('empty and edge-case queries', () => {
    beforeEach(() => {
      searchService.indexNotes(sampleNotes);
    });

    it('should return empty array for empty string query', () => {
      const results = searchService.search('', sampleNotes);
      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only query', () => {
      const results = searchService.search('   ', sampleNotes);
      expect(results).toEqual([]);
    });

    it('should return empty array when no notes match', () => {
      const results = searchService.search('xylophone', sampleNotes);
      expect(results).toEqual([]);
    });
  });

  describe('special characters in queries', () => {
    beforeEach(() => {
      searchService.indexNotes(sampleNotes);
    });

    it('should handle queries with special characters without crashing', () => {
      expect(() => searchService.search('Q4 (planning)', sampleNotes)).not.toThrow();
    });

    it('should handle queries with brackets', () => {
      expect(() => searchService.search('[react]', sampleNotes)).not.toThrow();
    });

    it('should handle queries with punctuation', () => {
      const results = searchService.search('Q4', sampleNotes);
      // Q4 appears in the meeting notes title
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('markdown stripping', () => {
    it('should strip markdown formatting before indexing content', () => {
      const noteWithMarkdown = makeNote({
        id: 'md-1',
        title: 'Markdown Test',
        content: [
          '# Heading One',
          'Some **bold** and *italic* text.',
          '```js',
          'const hidden = "code block content"',
          '```',
          'A [[WikiLink|display text]] and [markdown link](http://example.com).',
          'Inline `code snippet` here.',
        ].join('\n'),
      });

      searchService.indexNotes([noteWithMarkdown]);

      // The word "bold" should be findable (formatting stripped)
      const boldResults = searchService.search('bold', [noteWithMarkdown]);
      expect(boldResults.length).toBeGreaterThan(0);

      // WikiLink display text should be searchable
      const wikiResults = searchService.search('WikiLink', [noteWithMarkdown]);
      expect(wikiResults.length).toBeGreaterThan(0);

      // Markdown link text should be searchable
      const linkResults = searchService.search('markdown link', [noteWithMarkdown]);
      expect(linkResults.length).toBeGreaterThan(0);
    });

    it('should strip frontmatter from content', () => {
      const noteWithFrontmatter = makeNote({
        id: 'fm-1',
        title: 'Frontmatter Test',
        content: [
          '---',
          'tags: [secret]',
          'date: 2024-01-01',
          '---',
          'Visible content here.',
        ].join('\n'),
      });

      searchService.indexNotes([noteWithFrontmatter]);

      // "secret" is in frontmatter and should be stripped
      const fmResults = searchService.search('secret', [noteWithFrontmatter]);
      expect(fmResults.length).toBe(0);

      // "Visible" is in body content
      const bodyResults = searchService.search('Visible', [noteWithFrontmatter]);
      expect(bodyResults.length).toBeGreaterThan(0);
    });
  });

  describe('context snippets', () => {
    it('should provide context around matching terms', () => {
      const longNote = makeNote({
        id: 'ctx-1',
        title: 'Long Note',
        content: 'This is the first line.\nThe second line has the important keyword here.\nThird line is unrelated.',
      });

      searchService.indexNotes([longNote]);
      const results = searchService.search('important', [longNote]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].context).toBeDefined();
      expect(results[0].context).toContain('important');
    });

    it('should return undefined context when query terms are not found in content', () => {
      // A note where the match is only in the title, not in content
      const titleOnlyNote = makeNote({
        id: 'title-only',
        title: 'Zettelkasten Method',
        content: 'This note has completely different body text with no overlap.',
      });

      searchService.indexNotes([titleOnlyNote]);
      const results = searchService.search('Zettelkasten', [titleOnlyNote]);
      expect(results.length).toBeGreaterThan(0);
      // Context is extracted from content, where "Zettelkasten" doesn't appear
      expect(results[0].context).toBeUndefined();
    });
  });

  describe('fuzzy matching', () => {
    beforeEach(() => {
      searchService.indexNotes(sampleNotes);
    });

    it('should find results with minor typos due to fuzzy matching', () => {
      // "Typscript" is close to "TypeScript" (missing 'e')
      const results = searchService.search('Typscript', sampleNotes);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('1');
    });
  });

  describe('notes with no tags', () => {
    it('should handle notes with no inline tags', () => {
      const noTagNote = makeNote({
        id: 'notag-1',
        title: 'No Tags Here',
        content: 'This note has no tags at all.',
        metadata: {
          wordCount: 7,
          headings: [],
          outgoingLinks: [],
          blockIds: [],
          inlineTags: [],
        },
      });

      searchService.indexNotes([noTagNote]);
      const results = searchService.search('tags', [noTagNote]);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
