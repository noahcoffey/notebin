-- Add user_id to tables for ownership

-- Add user_id column to notes
ALTER TABLE notes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to folders
ALTER TABLE folders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to backlinks
ALTER TABLE backlinks ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for user_id lookups
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_backlinks_user_id ON backlinks(user_id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Full access to notes" ON notes;
DROP POLICY IF EXISTS "Full access to folders" ON folders;
DROP POLICY IF EXISTS "Full access to backlinks" ON backlinks;

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

-- Public notes can be viewed by anyone
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
