import type { Link } from '../../types';

const WIKILINK_REGEX = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const EMBED_REGEX = /!\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function extractLinks(content: string): Link[] {
  const links: Link[] = [];
  const lines = content.split('\n');
  let charOffset = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Extract wiki links
    let match;
    WIKILINK_REGEX.lastIndex = 0;
    while ((match = WIKILINK_REGEX.exec(line)) !== null) {
      const [fullMatch, target, heading, displayText] = match;
      links.push({
        target,
        displayText: displayText || undefined,
        type: 'wikilink',
        heading: heading || undefined,
        position: {
          start: charOffset + match.index,
          end: charOffset + match.index + fullMatch.length,
          line: lineIndex,
        },
      });
    }

    // Extract embeds
    EMBED_REGEX.lastIndex = 0;
    while ((match = EMBED_REGEX.exec(line)) !== null) {
      const [fullMatch, target, blockId, displayText] = match;
      links.push({
        target,
        displayText: displayText || undefined,
        type: 'embed',
        blockId: blockId || undefined,
        position: {
          start: charOffset + match.index,
          end: charOffset + match.index + fullMatch.length,
          line: lineIndex,
        },
      });
    }

    // Extract markdown links
    MARKDOWN_LINK_REGEX.lastIndex = 0;
    while ((match = MARKDOWN_LINK_REGEX.exec(line)) !== null) {
      const [fullMatch, displayText, target] = match;
      if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('#')) {
        links.push({
          target,
          displayText,
          type: 'markdown',
          position: {
            start: charOffset + match.index,
            end: charOffset + match.index + fullMatch.length,
            line: lineIndex,
          },
        });
      }
    }

    charOffset += line.length + 1; // +1 for newline
  }

  return links;
}

export function getContextForLink(content: string, link: Link, contextLength = 100): string {
  const lines = content.split('\n');
  const line = lines[link.position.line] || '';
  return line.length > contextLength
    ? line.slice(0, contextLength) + '...'
    : line;
}

export function parseWikiLink(text: string): { target: string; heading?: string; displayText?: string } | null {
  const match = text.match(/^\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]$/);
  if (!match) return null;

  return {
    target: match[1],
    heading: match[2] || undefined,
    displayText: match[3] || undefined,
  };
}
