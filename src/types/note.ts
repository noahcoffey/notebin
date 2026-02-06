export interface NoteMetadata {
  wordCount: number;
  headings: HeadingInfo[];
  outgoingLinks: Link[];
  blockIds: string[];
  inlineTags: string[];
}

export interface HeadingInfo {
  level: number;
  text: string;
  position: number;
}

export interface Link {
  target: string;
  displayText?: string;
  type: 'wikilink' | 'markdown' | 'embed' | 'blockRef';
  heading?: string;
  blockId?: string;
  position: {
    start: number;
    end: number;
    line: number;
  };
}

export interface Backlink {
  sourceNoteId: string;
  targetNoteId: string;
  link: Link;
  context: string;
}

export interface NoteFrontmatter {
  [key: string]: unknown;
  tags?: string[];
  aliases?: string[];
  cssclass?: string;
}

export interface Note {
  id: string;
  title: string;
  path: string;
  folderId: string | null;
  content: string;
  frontmatter: NoteFrontmatter;
  metadata: NoteMetadata;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Folder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  isExpanded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  type: 'note' | 'folder';
  children?: FileTreeItem[];
  isExpanded?: boolean;
}
