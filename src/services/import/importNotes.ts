import type { ImportResult } from './obsidianImport';
import { noteStorage } from '../storage/noteStorage';
import { folderStorage } from '../storage/folderStorage';
import { updateNoteMetadata } from '../parser/markdownParser';
import { useNoteStore } from '../../store/noteStore';

export interface ImportProgress {
  phase: 'folders' | 'notes';
  current: number;
  total: number;
  currentItem: string;
}

export async function importNotes(
  data: ImportResult,
  onProgress: (progress: ImportProgress) => void,
  parentFolderId?: string | null
): Promise<{ notesCreated: number; foldersCreated: number; skipped: number }> {
  const folderMap = new Map<string, string>(); // path → id
  let foldersCreated = 0;
  let notesCreated = 0;

  // Look up parent folder path prefix if importing into an existing folder
  let parentPathPrefix = '';
  if (parentFolderId) {
    const parentFolder = await folderStorage.getById(parentFolderId);
    if (parentFolder) {
      parentPathPrefix = parentFolder.path;
    }
  }

  // Phase 1: Create folders top-down
  for (let i = 0; i < data.folders.length; i++) {
    const folderDef = data.folders[i];
    onProgress({
      phase: 'folders',
      current: i + 1,
      total: data.folders.length,
      currentItem: folderDef.name,
    });

    let parentId: string | null;
    if (folderDef.parentPath) {
      parentId = folderMap.get(folderDef.parentPath) ?? null;
    } else {
      // Root-level imported folder: use parentFolderId if provided
      parentId = parentFolderId ?? null;
    }

    const folder = await folderStorage.create({
      name: folderDef.name,
      parentId,
      path: parentPathPrefix + folderDef.path,
    });
    folderMap.set(folderDef.path, folder.id);
    foldersCreated++;
  }

  // Phase 2: Create notes
  for (let i = 0; i < data.notes.length; i++) {
    const noteDef = data.notes[i];
    onProgress({
      phase: 'notes',
      current: i + 1,
      total: data.notes.length,
      currentItem: noteDef.title,
    });

    let folderId: string | null;
    if (noteDef.folderPath) {
      folderId = folderMap.get(noteDef.folderPath) ?? null;
    } else {
      // Root-level imported note: use parentFolderId if provided
      folderId = parentFolderId ?? null;
    }

    const note = await noteStorage.create({
      title: noteDef.title,
      content: noteDef.content,
      folderId,
      path: parentPathPrefix + noteDef.path,
    });

    // Update frontmatter and metadata
    const metadata = updateNoteMetadata(noteDef.content);
    await noteStorage.update(note.id, {
      frontmatter: noteDef.frontmatter,
      metadata,
    });

    notesCreated++;
  }

  // Refresh the store
  await useNoteStore.getState().loadFolders();
  await useNoteStore.getState().loadNotes();

  return { notesCreated, foldersCreated, skipped: data.skipped.length };
}
