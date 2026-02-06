import { describe, it, expect } from 'vitest';
import { extractLinks, getContextForLink, parseWikiLink } from './linkExtractor';

describe('extractLinks', () => {
  describe('wikilinks', () => {
    it('extracts a simple wikilink', () => {
      const links = extractLinks('See [[my note]] for details');
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        target: 'my note',
        type: 'wikilink',
        displayText: undefined,
        heading: undefined,
      });
    });

    it('extracts a wikilink with alias', () => {
      const links = extractLinks('See [[my note|alias text]] here');
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        target: 'my note',
        displayText: 'alias text',
        type: 'wikilink',
      });
    });

    it('extracts a wikilink with heading', () => {
      const links = extractLinks('See [[my note#section]] here');
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        target: 'my note',
        heading: 'section',
        type: 'wikilink',
      });
    });

    it('extracts a wikilink with heading and alias', () => {
      const links = extractLinks('See [[my note#section|display]] here');
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        target: 'my note',
        heading: 'section',
        displayText: 'display',
        type: 'wikilink',
      });
    });

    it('extracts multiple wikilinks on the same line', () => {
      const links = extractLinks('Link to [[note1]] and [[note2]]');
      expect(links).toHaveLength(2);
      expect(links[0].target).toBe('note1');
      expect(links[1].target).toBe('note2');
    });

    it('extracts wikilinks across multiple lines', () => {
      const links = extractLinks('Line one [[note1]]\nLine two [[note2]]');
      expect(links).toHaveLength(2);
      expect(links[0].position.line).toBe(0);
      expect(links[1].position.line).toBe(1);
    });

    it('computes correct character positions', () => {
      const content = 'Hello [[world]]';
      const links = extractLinks(content);
      expect(links[0].position.start).toBe(6);
      expect(links[0].position.end).toBe(15);
    });

    it('computes correct positions on second line', () => {
      const content = 'First line\n[[second]]';
      const links = extractLinks(content);
      // charOffset for line 1 = 10 + 1 = 11, match.index = 0
      expect(links[0].position.start).toBe(11);
      expect(links[0].position.end).toBe(21);
      expect(links[0].position.line).toBe(1);
    });
  });

  describe('embeds', () => {
    it('extracts a simple embed (also matched as wikilink)', () => {
      const links = extractLinks('![[embedded note]]');
      // The wikilink regex also matches inside ![[...]], so we get both
      const embed = links.find(l => l.type === 'embed');
      const wikilink = links.find(l => l.type === 'wikilink');
      expect(embed).toBeDefined();
      expect(embed).toMatchObject({
        target: 'embedded note',
        type: 'embed',
      });
      expect(wikilink).toBeDefined();
      expect(wikilink!.target).toBe('embedded note');
    });

    it('extracts an embed with block ID', () => {
      const links = extractLinks('![[note#block-123]]');
      const embed = links.find(l => l.type === 'embed');
      expect(embed).toBeDefined();
      expect(embed).toMatchObject({
        target: 'note',
        blockId: 'block-123',
        type: 'embed',
      });
    });

    it('extracts an embed with alias', () => {
      const links = extractLinks('![[note|300]]');
      const embed = links.find(l => l.type === 'embed');
      expect(embed).toBeDefined();
      expect(embed).toMatchObject({
        target: 'note',
        displayText: '300',
        type: 'embed',
      });
    });
  });

  describe('markdown links', () => {
    it('extracts a local markdown link', () => {
      const links = extractLinks('[click here](./my-file.md)');
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        target: './my-file.md',
        displayText: 'click here',
        type: 'markdown',
      });
    });

    it('ignores http links', () => {
      const links = extractLinks('[Google](http://google.com)');
      expect(links).toHaveLength(0);
    });

    it('ignores https links', () => {
      const links = extractLinks('[Google](https://google.com)');
      expect(links).toHaveLength(0);
    });

    it('ignores anchor-only links', () => {
      const links = extractLinks('[section](#heading)');
      expect(links).toHaveLength(0);
    });

    it('extracts relative path links', () => {
      const links = extractLinks('[file](notes/file.md)');
      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('notes/file.md');
    });
  });

  describe('mixed link types', () => {
    it('extracts wikilinks and markdown links from the same content', () => {
      const content = '[[wiki note]] and [md link](local.md)';
      const links = extractLinks(content);
      expect(links).toHaveLength(2);
      expect(links.find(l => l.type === 'wikilink')).toBeDefined();
      expect(links.find(l => l.type === 'markdown')).toBeDefined();
    });

    it('extracts wikilinks and embeds from the same line', () => {
      const content = '[[note]] and ![[image]]';
      const links = extractLinks(content);
      const wikilink = links.find(l => l.type === 'wikilink');
      const embed = links.find(l => l.type === 'embed');
      expect(wikilink).toBeDefined();
      expect(embed).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty string', () => {
      expect(extractLinks('')).toEqual([]);
    });

    it('returns empty array for content with no links', () => {
      expect(extractLinks('Just plain text with no links')).toEqual([]);
    });

    it('handles escaped brackets', () => {
      // The function unescapes \[ and \] before parsing
      const content = '\\[\\[escaped note\\]\\]';
      const links = extractLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('escaped note');
    });

    it('handles content with only newlines', () => {
      expect(extractLinks('\n\n\n')).toEqual([]);
    });

    it('does not match incomplete wikilinks', () => {
      expect(extractLinks('[[incomplete')).toEqual([]);
      expect(extractLinks('incomplete]]')).toEqual([]);
    });
  });
});

describe('getContextForLink', () => {
  it('returns the full line when shorter than contextLength', () => {
    const content = 'See [[note]] for info';
    const links = extractLinks(content);
    const context = getContextForLink(content, links[0]);
    expect(context).toBe('See [[note]] for info');
  });

  it('truncates long lines with ellipsis', () => {
    const longLine = 'A'.repeat(200) + ' [[note]] end';
    const links = extractLinks(longLine);
    const context = getContextForLink(longLine, links[0], 50);
    expect(context).toHaveLength(53); // 50 chars + '...'
    expect(context.endsWith('...')).toBe(true);
  });

  it('returns the correct line for multi-line content', () => {
    const content = 'Line 0\nLine 1 has [[link]]\nLine 2';
    const links = extractLinks(content);
    const context = getContextForLink(content, links[0]);
    expect(context).toBe('Line 1 has [[link]]');
  });

  it('returns empty string for out-of-bounds line', () => {
    const content = 'Only one line [[here]]';
    const links = extractLinks(content);
    // Fabricate a link with an out-of-bounds line
    const fakeLink = { ...links[0], position: { ...links[0].position, line: 99 } };
    const context = getContextForLink(content, fakeLink);
    expect(context).toBe('');
  });

  it('handles escaped brackets in context', () => {
    const content = 'Before \\[\\[note\\]\\] after';
    const links = extractLinks(content);
    // getContextForLink also unescapes
    const context = getContextForLink(content, links[0]);
    expect(context).toBe('Before [[note]] after');
  });
});

describe('parseWikiLink', () => {
  it('parses a simple wikilink', () => {
    expect(parseWikiLink('[[my note]]')).toEqual({
      target: 'my note',
      heading: undefined,
      displayText: undefined,
    });
  });

  it('parses a wikilink with heading', () => {
    expect(parseWikiLink('[[note#section]]')).toEqual({
      target: 'note',
      heading: 'section',
      displayText: undefined,
    });
  });

  it('parses a wikilink with alias', () => {
    expect(parseWikiLink('[[note|display text]]')).toEqual({
      target: 'note',
      heading: undefined,
      displayText: 'display text',
    });
  });

  it('parses a wikilink with heading and alias', () => {
    expect(parseWikiLink('[[note#heading|display]]')).toEqual({
      target: 'note',
      heading: 'heading',
      displayText: 'display',
    });
  });

  it('returns null for non-wikilink text', () => {
    expect(parseWikiLink('plain text')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseWikiLink('')).toBeNull();
  });

  it('returns null for partial wikilink', () => {
    expect(parseWikiLink('[[incomplete')).toBeNull();
    expect(parseWikiLink('incomplete]]')).toBeNull();
  });

  it('returns null if there is surrounding text', () => {
    // The regex anchors ^ and $ require exact match
    expect(parseWikiLink('before [[note]] after')).toBeNull();
  });

  it('handles special characters in target', () => {
    const result = parseWikiLink('[[folder/sub-note]]');
    expect(result).toEqual({
      target: 'folder/sub-note',
      heading: undefined,
      displayText: undefined,
    });
  });
});
