import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseFrontmatter, updateNoteMetadata } from './markdownParser';

describe('parseMarkdown', () => {
  describe('headings', () => {
    it('extracts headings with correct levels', () => {
      const content = '# H1\n## H2\n### H3';
      const result = parseMarkdown(content);
      expect(result.headings).toHaveLength(3);
      expect(result.headings[0]).toMatchObject({ level: 1, text: 'H1' });
      expect(result.headings[1]).toMatchObject({ level: 2, text: 'H2' });
      expect(result.headings[2]).toMatchObject({ level: 3, text: 'H3' });
    });

    it('extracts all heading levels up to h6', () => {
      const content = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
      const result = parseMarkdown(content);
      expect(result.headings).toHaveLength(6);
      expect(result.headings[5]).toMatchObject({ level: 6, text: 'H6' });
    });

    it('trims whitespace from heading text', () => {
      const content = '##   Spaced Heading  ';
      const result = parseMarkdown(content);
      expect(result.headings[0].text).toBe('Spaced Heading');
    });

    it('returns correct position for headings', () => {
      const content = '# First\n\n## Second';
      const result = parseMarkdown(content);
      expect(result.headings[0].position).toBe(0);
      expect(result.headings[1].position).toBe(9);
    });

    it('returns empty headings for content with no headings', () => {
      const result = parseMarkdown('Just a paragraph.');
      expect(result.headings).toEqual([]);
    });

    it('does not extract headings without space after hash', () => {
      const content = '#NoSpace';
      const result = parseMarkdown(content);
      expect(result.headings).toEqual([]);
    });
  });

  describe('wordCount', () => {
    it('counts words in plain text', () => {
      const result = parseMarkdown('Hello world foo bar');
      expect(result.wordCount).toBe(4);
    });

    it('excludes frontmatter from word count', () => {
      const content = '---\ntitle: My Note\n---\nHello world';
      const result = parseMarkdown(content);
      expect(result.wordCount).toBe(2);
    });

    it('excludes code blocks from word count', () => {
      const content = 'Before\n```\ncode inside block\n```\nAfter';
      const result = parseMarkdown(content);
      expect(result.wordCount).toBe(2); // Before, After
    });

    it('excludes inline code from word count', () => {
      const content = 'Use `someFunction` here';
      const result = parseMarkdown(content);
      expect(result.wordCount).toBe(2); // Use, here
    });

    it('excludes wikilinks from word count', () => {
      const content = 'See [[my note]] for details';
      const result = parseMarkdown(content);
      expect(result.wordCount).toBe(3); // See, for, details
    });

    it('excludes markdown images from word count', () => {
      const content = 'Text ![alt](image.png) more';
      const result = parseMarkdown(content);
      expect(result.wordCount).toBe(2); // Text, more
    });

    it('excludes markdown links from word count', () => {
      const content = 'Text [click here](url) more';
      const result = parseMarkdown(content);
      expect(result.wordCount).toBe(2); // Text, more
    });

    it('returns 0 for empty content', () => {
      expect(parseMarkdown('').wordCount).toBe(0);
    });

    it('returns 0 for content with only syntax', () => {
      expect(parseMarkdown('```\ncode\n```').wordCount).toBe(0);
    });
  });

  describe('blockIds', () => {
    it('extracts block IDs', () => {
      const content = 'Some paragraph ^block-1\nAnother paragraph ^block-2';
      const result = parseMarkdown(content);
      expect(result.blockIds).toContain('block-1');
      expect(result.blockIds).toContain('block-2');
    });

    it('returns empty array when no block IDs', () => {
      const result = parseMarkdown('No block IDs here');
      expect(result.blockIds).toEqual([]);
    });
  });

  describe('inlineTags', () => {
    it('extracts simple tags', () => {
      const result = parseMarkdown('Content with #tag1 and #tag2');
      expect(result.inlineTags).toContain('tag1');
      expect(result.inlineTags).toContain('tag2');
    });

    it('extracts tags with slashes (nested tags)', () => {
      const result = parseMarkdown('#parent/child tag');
      expect(result.inlineTags).toContain('parent/child');
    });

    it('extracts tags with hyphens and underscores', () => {
      const result = parseMarkdown('#my-tag #my_tag');
      expect(result.inlineTags).toContain('my-tag');
      expect(result.inlineTags).toContain('my_tag');
    });

    it('deduplicates tags', () => {
      const result = parseMarkdown('#tag1 some text #tag1');
      expect(result.inlineTags).toHaveLength(1);
      expect(result.inlineTags[0]).toBe('tag1');
    });

    it('does not extract tags starting with a number', () => {
      // TAG_REGEX requires first char to be [a-zA-Z]
      const result = parseMarkdown('#123invalid');
      expect(result.inlineTags).toEqual([]);
    });

    it('returns empty array when no tags', () => {
      expect(parseMarkdown('No tags here').inlineTags).toEqual([]);
    });
  });
});

describe('parseFrontmatter', () => {
  it('parses simple key-value pairs', () => {
    const content = '---\ntitle: My Note\nauthor: Noah\n---\nBody';
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({ title: 'My Note', author: 'Noah' });
  });

  it('returns empty object when no frontmatter', () => {
    expect(parseFrontmatter('Just content')).toEqual({});
  });

  it('returns empty object for empty string', () => {
    expect(parseFrontmatter('')).toEqual({});
  });

  it('parses JSON array values', () => {
    const content = '---\ntags: ["a", "b", "c"]\n---\nBody';
    const fm = parseFrontmatter(content);
    expect(fm.tags).toEqual(['a', 'b', 'c']);
  });

  it('parses JSON object values', () => {
    const content = '---\nconfig: {"key": "value"}\n---\nBody';
    const fm = parseFrontmatter(content);
    expect(fm.config).toEqual({ key: 'value' });
  });

  it('keeps malformed JSON as string', () => {
    const content = '---\nbad: [not valid json\n---\nBody';
    const fm = parseFrontmatter(content);
    expect(fm.bad).toBe('[not valid json');
  });

  it('skips keys with empty values (multi-line arrays)', () => {
    const content = '---\ntitle: Test\nitems:\n---\nBody';
    const fm = parseFrontmatter(content);
    expect(fm.title).toBe('Test');
    expect(fm).not.toHaveProperty('items');
  });

  it('does not match frontmatter that is not at the start', () => {
    const content = 'Some text\n---\ntitle: Not frontmatter\n---';
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({});
  });

  it('handles colons in values', () => {
    const content = '---\nurl: http://example.com:8080/path\n---\n';
    const fm = parseFrontmatter(content);
    expect(fm.url).toBe('http://example.com:8080/path');
  });
});

describe('updateNoteMetadata', () => {
  it('returns combined metadata including outgoing links', () => {
    const content = '# My Note\n\nSee [[other note]] for info.\n\n#tag1';
    const metadata = updateNoteMetadata(content);

    expect(metadata.headings).toHaveLength(1);
    expect(metadata.headings[0].text).toBe('My Note');
    expect(metadata.outgoingLinks).toHaveLength(1);
    expect(metadata.outgoingLinks[0].target).toBe('other note');
    expect(metadata.inlineTags).toContain('tag1');
    expect(metadata.wordCount).toBeGreaterThan(0);
  });

  it('handles empty content', () => {
    const metadata = updateNoteMetadata('');
    expect(metadata.headings).toEqual([]);
    expect(metadata.outgoingLinks).toEqual([]);
    expect(metadata.blockIds).toEqual([]);
    expect(metadata.inlineTags).toEqual([]);
    expect(metadata.wordCount).toBe(0);
  });
});
