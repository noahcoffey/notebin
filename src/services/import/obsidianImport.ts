import type { NoteFrontmatter } from '../../types';
import { parseFrontmatter } from '../parser/markdownParser';

export interface ImportResult {
  folders: { name: string; path: string; parentPath: string | null }[];
  notes: { title: string; path: string; folderPath: string | null; content: string; frontmatter: NoteFrontmatter }[];
  skipped: { path: string; reason: string }[];
}

const IGNORED_PATTERNS = [
  /^\.obsidian\//,
  /^\.trash\//,
  /^\./,
  /\/\./,
];

export async function parseObsidianVault(files: FileList): Promise<ImportResult> {
  const folders = new Map<string, { name: string; path: string; parentPath: string | null }>();
  const notes: ImportResult['notes'] = [];
  const skipped: ImportResult['skipped'] = [];

  for (const file of Array.from(files)) {
    const relativePath = file.webkitRelativePath;
    // Strip the vault root folder name (first segment)
    const parts = relativePath.split('/');
    const pathWithinVault = parts.slice(1).join('/');

    if (!pathWithinVault) continue;

    // Skip ignored patterns
    if (IGNORED_PATTERNS.some(p => p.test(pathWithinVault))) {
      skipped.push({ path: pathWithinVault, reason: 'Hidden or config file' });
      continue;
    }

    // Only process .md files
    if (!file.name.endsWith('.md')) {
      skipped.push({ path: pathWithinVault, reason: 'Not a markdown file' });
      continue;
    }

    // Build folder entries from the file's directory path
    const dirParts = pathWithinVault.split('/').slice(0, -1);
    for (let i = 0; i < dirParts.length; i++) {
      const folderPath = '/' + dirParts.slice(0, i + 1).join('/');
      if (!folders.has(folderPath)) {
        const parentPath = i === 0 ? null : '/' + dirParts.slice(0, i).join('/');
        folders.set(folderPath, {
          name: dirParts[i],
          path: folderPath,
          parentPath,
        });
      }
    }

    // Read and parse the file
    const content = await file.text();
    const title = file.name.replace(/\.md$/, '');
    const folderPath = dirParts.length > 0 ? '/' + dirParts.join('/') : null;
    const notePath = '/' + pathWithinVault.replace(/\.md$/, '');
    const frontmatter = parseFrontmatter(content) as NoteFrontmatter;

    notes.push({ title, path: notePath, folderPath, content, frontmatter });
  }

  // Sort folders by depth so parents come first
  const sortedFolders = Array.from(folders.values()).sort(
    (a, b) => a.path.split('/').length - b.path.split('/').length
  );

  return { folders: sortedFolders, notes, skipped };
}
