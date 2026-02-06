-- Add user_id to tables for ownership
-- NOTE: After running this migration, enable rate limiting in the Supabase dashboard:
--   Settings > API > Rate limiting

-- Add user_id column to notes (IF NOT EXISTS for idempotent re-runs)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to folders
ALTER TABLE folders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to backlinks
ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rows: assign all data to the first (only) user
-- This is a single-user app, so all existing data belongs to the sole user
DO $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF _user_id IS NOT NULL THEN
    UPDATE notes SET user_id = _user_id WHERE user_id IS NULL;
    UPDATE folders SET user_id = _user_id WHERE user_id IS NULL;
    UPDATE backlinks SET user_id = _user_id WHERE user_id IS NULL;
  END IF;
END $$;

-- Make user_id NOT NULL now that existing rows are backfilled
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE folders ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE backlinks ALTER COLUMN user_id SET NOT NULL;

-- Create indexes for user_id lookups
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_user_id ON backlinks(user_id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Full access to notes" ON notes;
DROP POLICY IF EXISTS "Full access to folders" ON folders;
DROP POLICY IF EXISTS "Full access to backlinks" ON backlinks;

-- Drop new policies too (idempotent re-run)
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can create own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
DROP POLICY IF EXISTS "Public notes are viewable" ON notes;
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
DROP POLICY IF EXISTS "Users can create own folders" ON folders;
DROP POLICY IF EXISTS "Users can update own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON folders;
DROP POLICY IF EXISTS "Users can view own backlinks" ON backlinks;
DROP POLICY IF EXISTS "Users can create own backlinks" ON backlinks;
DROP POLICY IF EXISTS "Users can update own backlinks" ON backlinks;
DROP POLICY IF EXISTS "Users can delete own backlinks" ON backlinks;

-- New RLS policies - users can only access their own data

-- Notes: users can CRUD their own notes
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- Public notes can be viewed by anyone (for shared links)
CREATE POLICY "Public notes are viewable" ON notes
  FOR SELECT USING (is_public = true);

-- Folders: users can CRUD their own folders
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- Backlinks: users can CRUD their own backlinks
CREATE POLICY "Users can view own backlinks" ON backlinks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own backlinks" ON backlinks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backlinks" ON backlinks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backlinks" ON backlinks
  FOR DELETE USING (auth.uid() = user_id);
