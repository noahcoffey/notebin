-- Notebin Supabase Schema
-- Run this in your Supabase SQL Editor

-- Drop existing tables if migrating
drop table if exists shared_notes;
drop table if exists notes;
drop table if exists folders;

-- Folders table
create table folders (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  path text not null,
  parent_id uuid references folders(id) on delete cascade,
  is_expanded boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Notes table
create table notes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  path text not null,
  folder_id uuid references folders(id) on delete set null,
  content text not null default '',
  frontmatter jsonb default '{}',
  metadata jsonb default '{}',
  is_public boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);

-- Backlinks table
create table backlinks (
  id uuid default gen_random_uuid() primary key,
  source_note_id uuid references notes(id) on delete cascade,
  target_note_id uuid references notes(id) on delete cascade,
  link jsonb not null,
  context text not null default ''
);

-- Indexes for performance
create index idx_notes_folder_id on notes(folder_id);
create index idx_notes_is_public on notes(is_public);
create index idx_notes_deleted_at on notes(deleted_at);
create index idx_folders_parent_id on folders(parent_id);
create index idx_backlinks_source on backlinks(source_note_id);
create index idx_backlinks_target on backlinks(target_note_id);

-- Enable Row Level Security
alter table notes enable row level security;
alter table folders enable row level security;
alter table backlinks enable row level security;

-- Public access policies (no auth for now - single user)
-- Notes: anyone can CRUD, public notes can be read by anyone
create policy "Full access to notes" on notes for all using (true);

-- Folders: full access
create policy "Full access to folders" on folders for all using (true);

-- Backlinks: full access
create policy "Full access to backlinks" on backlinks for all using (true);

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger notes_updated_at
  before update on notes
  for each row
  execute function update_updated_at();

create trigger folders_updated_at
  before update on folders
  for each row
  execute function update_updated_at();
