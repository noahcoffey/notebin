import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions matching our schema
export interface DbNote {
  id: string;
  title: string;
  path: string;
  folder_id: string | null;
  content: string;
  frontmatter: Record<string, unknown>;
  metadata: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbFolder {
  id: string;
  name: string;
  path: string;
  parent_id: string | null;
  is_expanded: boolean;
  created_at: string;
  updated_at: string;
}
