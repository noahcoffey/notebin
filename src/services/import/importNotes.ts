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
  onProgress: (progress: ImportProgress) => void
): Promise<{ notesCreated: number; foldersCreated: number; skipped: number }> {
  const folderMap = new Map<string, string>(); // path → id
  let foldersCreated = 0;
  let notesCreated = 0;

  // Phase 1: Create folders top-down
  for (let i = 0; i < data.folders.length; i++) {
    const folderDef = data.folders[i];
    onProgress({
      phase: 'folders',
      current: i + 1,
      total: data.folders.length,
      currentItem: folderDef.name,
    });

    const parentId = folderDef.parentPath ? folderMap.get(folderDef.parentPath) ?? null : null;
    const folder = await folderStorage.create({
      name: folderDef.name,
      parentId,
      path: folderDef.path,
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

    const folderId = noteDef.folderPath ? folderMap.get(noteDef.folderPath) ?? null : null;
    const note = await noteStorage.create({
      title: noteDef.title,
      content: noteDef.content,
      folderId,
      path: noteDef.path,
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
