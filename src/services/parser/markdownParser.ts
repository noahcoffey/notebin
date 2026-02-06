import type { HeadingInfo, NoteMetadata } from '../../types';
import { extractLinks } from './linkExtractor';

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/;
const TAG_REGEX = /#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
const BLOCK_ID_REGEX = /\^([a-zA-Z0-9-]+)$/gm;

export function parseMarkdown(content: string): Pick<NoteMetadata, 'wordCount' | 'headings' | 'blockIds' | 'inlineTags'> {
  const headings = extractHeadings(content);
  const wordCount = countWords(content);
  const blockIds = extractBlockIds(content);
  const inlineTags = extractTags(content);

  return {
    wordCount,
    headings,
    blockIds,
    inlineTags,
  };
}

function extractHeadings(content: string): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  let match;

  HEADING_REGEX.lastIndex = 0;
  while ((match = HEADING_REGEX.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      position: match.index,
    });
  }

  return headings;
}

function countWords(content: string): number {
  const textWithoutFrontmatter = content.replace(FRONTMATTER_REGEX, '');
  const words = textWithoutFrontmatter
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[\[[^\]]+\]\]/g, '') // Remove wiki links
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
    .match(/\b\w+\b/g);

  return words?.length || 0;
}

function extractBlockIds(content: string): string[] {
  const blockIds: string[] = [];
  let match;

  BLOCK_ID_REGEX.lastIndex = 0;
  while ((match = BLOCK_ID_REGEX.exec(content)) !== null) {
    blockIds.push(match[1]);
  }

  return blockIds;
}

function extractTags(content: string): string[] {
  const tags = new Set<string>();
  let match;

  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(content)) !== null) {
    tags.add(match[1]);
  }

  return Array.from(tags);
}

export function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return {};

  try {
    const yaml = match[1];
    const result: Record<string, unknown> = {};

    const lines = yaml.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        // Simple array detection
        if (value === '') {
          // Might be a multi-line array, skip for now
          continue;
        }

        // Try to parse as JSON for arrays/objects
        if ((value as string).startsWith('[') || (value as string).startsWith('{')) {
          try {
            value = JSON.parse(value as string);
          } catch {
            // Keep as string
          }
        }

        result[key] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
}

export function updateNoteMetadata(content: string): NoteMetadata {
  const parsed = parseMarkdown(content);
  const outgoingLinks = extractLinks(content);

  return {
    ...parsed,
    outgoingLinks,
  };
}
