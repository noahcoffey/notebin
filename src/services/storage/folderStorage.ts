import { supabase, type DbFolder } from './supabase';
import type { Folder } from '../../types';

// Convert database row to Folder type
function dbToFolder(row: DbFolder): Folder {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    parentId: row.parent_id,
    isExpanded: row.is_expanded,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const folderStorage = {
  async create(data: {
    name: string;
    parentId?: string | null;
    path?: string;
  }): Promise<Folder> {
    const userId = await getUserId();
    const { data: row, error } = await supabase
      .from('folders')
      .insert({
        name: data.name,
        path: data.path || `/${data.name}`,
        parent_id: data.parentId ?? null,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return dbToFolder(row);
  },

  async getById(id: string): Promise<Folder | undefined> {
    const { data: row, error } = await supabase
      .from('folders')
      .select()
      .eq('id', id)
      .single();

    if (error || !row) return undefined;
    return dbToFolder(row);
  },

  async getAll(): Promise<Folder[]> {
    const { data: rows, error } = await supabase
      .from('folders')
      .select()
      .order('name');

    if (error) throw error;
    return (rows || []).map(dbToFolder);
  },

  async getByParent(parentId: string | null): Promise<Folder[]> {
    let query = supabase.from('folders').select();

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data: rows, error } = await query;

    if (error) throw error;
    return (rows || []).map(dbToFolder);
  },

  async update(id: string, data: Partial<Omit<Folder, 'id' | 'createdAt'>>): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.path !== undefined) updateData.path = data.path;
    if (data.parentId !== undefined) updateData.parent_id = data.parentId;
    if (data.isExpanded !== undefined) updateData.is_expanded = data.isExpanded;

    const { error } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getChildren(parentId: string | null): Promise<Folder[]> {
    return this.getByParent(parentId);
  },

  async setExpanded(id: string, isExpanded: boolean): Promise<void> {
    const { error } = await supabase
      .from('folders')
      .update({ is_expanded: isExpanded })
      .eq('id', id);

    if (error) throw error;
  },
};
