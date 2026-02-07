import type { ImportResult } from './obsidianImport';
import type { NoteFrontmatter } from '../../types';
import { parseFrontmatter } from '../parser/markdownParser';

/** Extract Bear-style inline tags (#tag, #tag/subtag) from markdown content. */
function extractBearTags(content: string): string[] {
  const tags = new Set<string>();
  // Match #tag or #tag/subtag, but not inside code blocks or headings
  // Bear tags: start with # followed by word chars, optionally /word chars
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Skip headings (# Title, ## Title, etc.)
    if (/^#{1,6}\s/.test(line.trimStart())) continue;

    // Match Bear-style tags: #word or #word/word (not preceded by &)
    const tagRegex = /(?:^|(?<=\s))#([\w][\w-]*(?:\/[\w][\w-]*)*)(?=\s|$|[.,;:!?)}\]])/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
      tags.add(match[1]);
    }
  }

  return Array.from(tags);
}

/** Convert Bear-specific syntax to standard markdown. */
function convertBearSyntax(content: string): string {
  let result = content;

  // Convert ::highlighted text:: to **highlighted text**
  result = result.replace(/::(.*?)::/g, '**$1**');

  // Convert -- (bare horizontal rule) to ---
  // Only match lines that are exactly -- (with optional whitespace)
  result = result.replace(/^--\s*$/gm, '---');

  return result;
}

/** Build folder entries from Bear tags. */
function buildFoldersFromTags(
  tags: string[],
  folders: Map<string, { name: string; path: string; parentPath: string | null }>
) {
  for (const tag of tags) {
    const parts = tag.split('/');
    for (let i = 0; i < parts.length; i++) {
      const folderPath = '/' + parts.slice(0, i + 1).join('/');
      if (!folders.has(folderPath)) {
        const parentPath = i === 0 ? null : '/' + parts.slice(0, i).join('/');
        folders.set(folderPath, {
          name: parts[i],
          path: folderPath,
          parentPath,
        });
      }
    }
  }
}

export async function parseBearExport(files: FileList): Promise<ImportResult> {
  const folders = new Map<string, { name: string; path: string; parentPath: string | null }>();
  const notes: ImportResult['notes'] = [];
  const skipped: ImportResult['skipped'] = [];

  for (const file of Array.from(files)) {
    const relativePath = file.webkitRelativePath;
    // Strip the root folder name (first segment)
    const parts = relativePath.split('/');
    const pathWithinExport = parts.slice(1).join('/');

    if (!pathWithinExport) continue;

    // Skip hidden files
    if (pathWithinExport.startsWith('.') || pathWithinExport.includes('/.')) {
      skipped.push({ path: pathWithinExport, reason: 'Hidden file' });
      continue;
    }

    // Only process .md files
    if (!file.name.endsWith('.md')) {
      skipped.push({ path: pathWithinExport, reason: 'Not a markdown file (attachment)' });
      continue;
    }

    const content = await file.text();
    const convertedContent = convertBearSyntax(content);

    // Extract title from first heading or filename
    const headingMatch = convertedContent.match(/^#\s+(.+)$/m);
    const title = headingMatch ? headingMatch[1].trim() : file.name.replace(/\.md$/, '');

    // Extract Bear tags and build folder structure from them
    const tags = extractBearTags(content);
    buildFoldersFromTags(tags, folders);

    // Determine which folder this note belongs to based on its first tag
    const primaryTag = tags[0] ?? null;
    const folderPath = primaryTag ? '/' + primaryTag : null;

    // Build frontmatter - include Bear tags
    const existingFrontmatter = parseFrontmatter(convertedContent) as NoteFrontmatter;
    const frontmatter: NoteFrontmatter = {
      ...existingFrontmatter,
      ...(tags.length > 0 ? { tags } : {}),
    };

    const notePath = folderPath
      ? folderPath + '/' + file.name.replace(/\.md$/, '')
      : '/' + file.name.replace(/\.md$/, '');

    notes.push({
      title,
      path: notePath,
      folderPath,
      content: convertedContent,
      frontmatter,
    });
  }

  // Sort folders by depth so parents come first
  const sortedFolders = Array.from(folders.values()).sort(
    (a, b) => a.path.split('/').length - b.path.split('/').length
  );

  return { folders: sortedFolders, notes, skipped };
}
