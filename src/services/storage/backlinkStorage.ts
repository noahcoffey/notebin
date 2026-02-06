import { supabase } from './supabase';
import type { Backlink, Link } from '../../types';

interface DbBacklink {
  id: string;
  source_note_id: string;
  target_note_id: string;
  link: Link;
  context: string;
}

function dbToBacklink(row: DbBacklink): Backlink {
  return {
    sourceNoteId: row.source_note_id,
    targetNoteId: row.target_note_id,
    link: row.link,
    context: row.context,
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const backlinkStorage = {
  async create(backlink: Backlink): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('backlinks')
      .insert({
        source_note_id: backlink.sourceNoteId,
        target_note_id: backlink.targetNoteId,
        link: backlink.link,
        context: backlink.context,
        user_id: userId,
      });

    if (error) throw error;
  },

  async getByTarget(targetNoteId: string): Promise<Backlink[]> {
    const { data: rows, error } = await supabase
      .from('backlinks')
      .select()
      .eq('target_note_id', targetNoteId);

    if (error) throw error;
    return (rows || []).map(dbToBacklink);
  },

  async getBySource(sourceNoteId: string): Promise<Backlink[]> {
    const { data: rows, error } = await supabase
      .from('backlinks')
      .select()
      .eq('source_note_id', sourceNoteId);

    if (error) throw error;
    return (rows || []).map(dbToBacklink);
  },

  async deleteBySource(sourceNoteId: string): Promise<void> {
    const { error } = await supabase
      .from('backlinks')
      .delete()
      .eq('source_note_id', sourceNoteId);

    if (error) throw error;
  },

  async updateForNote(sourceNoteId: string, links: { targetNoteId: string; link: Link; context: string }[]): Promise<void> {
    await this.deleteBySource(sourceNoteId);

    if (links.length === 0) return;

    const userId = await getUserId();
    const backlinks = links.map(l => ({
      source_note_id: sourceNoteId,
      target_note_id: l.targetNoteId,
      link: l.link,
      context: l.context,
      user_id: userId,
    }));

    const { error } = await supabase
      .from('backlinks')
      .insert(backlinks);

    if (error) throw error;
  },
};
