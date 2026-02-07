import { supabase, type DbNote } from './supabase';
import type { Note, NoteMetadata, NoteFrontmatter } from '../../types';

const defaultMetadata: NoteMetadata = {
  wordCount: 0,
  headings: [],
  outgoingLinks: [],
  blockIds: [],
  inlineTags: [],
};

const defaultFrontmatter: NoteFrontmatter = {};

// Convert database row to Note type
function dbToNote(row: DbNote): Note {
  return {
    id: row.id,
    title: row.title,
    path: row.path,
    folderId: row.folder_id,
    content: row.content,
    frontmatter: { ...defaultFrontmatter, ...(row.frontmatter as NoteFrontmatter || {}) },
    metadata: { ...defaultMetadata, ...(row.metadata as Partial<NoteMetadata> || {}) },
    isPublic: row.is_public,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const noteStorage = {
  async create(data: {
    title: string;
    content?: string;
    folderId?: string | null;
    path?: string;
  }): Promise<Note> {
    const userId = await getUserId();
    const { data: row, error } = await supabase
      .from('notes')
      .insert({
        title: data.title,
        path: data.path || `/${data.title}`,
        folder_id: data.folderId ?? null,
        content: data.content || '',
        frontmatter: defaultFrontmatter,
        metadata: defaultMetadata,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return dbToNote(row);
  },

  async getById(id: string): Promise<Note | undefined> {
    const { data: row, error } = await supabase
      .from('notes')
      .select()
      .eq('id', id)
      .single();

    if (error || !row) return undefined;
    return dbToNote(row);
  },

  async getByIdPublic(id: string): Promise<Note | undefined> {
    const { data: row, error } = await supabase
      .from('notes')
      .select()
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (error || !row) return undefined;
    return dbToNote(row);
  },

  async getByTitle(title: string): Promise<Note | undefined> {
    const { data: row, error } = await supabase
      .from('notes')
      .select()
      .eq('title', title)
      .is('deleted_at', null)
      .single();

    if (error || !row) return undefined;
    return dbToNote(row);
  },

  async getByPath(path: string): Promise<Note | undefined> {
    const { data: row, error } = await supabase
      .from('notes')
      .select()
      .eq('path', path)
      .is('deleted_at', null)
      .single();

    if (error || !row) return undefined;
    return dbToNote(row);
  },

  async getAll(): Promise<Note[]> {
    const { data: rows, error } = await supabase
      .from('notes')
      .select()
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (rows || []).map(dbToNote);
  },

  async getByFolder(folderId: string | null): Promise<Note[]> {
    let query = supabase
      .from('notes')
      .select()
      .is('deleted_at', null);

    if (folderId === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', folderId);
    }

    const { data: rows, error } = await query;

    if (error) throw error;
    return (rows || []).map(dbToNote);
  },

  async update(id: string, data: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.path !== undefined) updateData.path = data.path;
    if (data.folderId !== undefined) updateData.folder_id = data.folderId;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.frontmatter !== undefined) updateData.frontmatter = data.frontmatter;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic;
    if (data.deletedAt !== undefined) updateData.deleted_at = data.deletedAt?.toISOString();

    const { error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async search(query: string): Promise<Note[]> {
    const { data: rows, error } = await supabase
      .from('notes')
      .select()
      .is('deleted_at', null)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

    if (error) throw error;
    return (rows || []).map(dbToNote);
  },

  async getAllTitles(): Promise<{ id: string; title: string; path: string }[]> {
    const { data: rows, error } = await supabase
      .from('notes')
      .select('id, title, path')
      .is('deleted_at', null);

    if (error) throw error;
    return rows || [];
  },

  async setPublic(id: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .update({ is_public: isPublic })
      .eq('id', id);

    if (error) throw error;
  },

  async getTrash(): Promise<Note[]> {
    const { data: rows, error } = await supabase
      .from('notes')
      .select()
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return (rows || []).map(dbToNote);
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  },
};
