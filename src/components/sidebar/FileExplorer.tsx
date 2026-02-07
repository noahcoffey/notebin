import { useState, useCallback, useRef } from 'react';
import { useNoteStore, useWorkspaceStore, useSettingsStore, useUIStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { FileTreeItem } from '../../types';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FilePlus, FolderPlus, Pencil, Trash2, Clock, FileText, X, Star } from 'lucide-react';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';
import { DeleteFolderModal } from './DeleteFolderModal';

interface ContextMenuState {
  x: number;
  y: number;
  item: FileTreeItem;
}

export function FileExplorer() {
  const { notes, folders, getFileTree, createNote, createFolder, toggleFolder, moveNote, moveFolder, deleteNote, deleteFolder, renameNote, renameFolder } = useNoteStore();
  const { openNote, closeTab, setActiveTab, tabs, activeTabId } = useWorkspaceStore();
  const { showRecentNotes, favoriteNoteIds, recentCollapsed, favoritesCollapsed, notesCollapsed, toggleFavorite, setRecentCollapsed, setFavoritesCollapsed, setNotesCollapsed } = useSettingsStore();
  const { sidebarVisible, toggleSidebar } = useUIStore();
  const isMobile = useIsMobile();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeNoteId = activeTab?.noteId || null;

  // Get the 5 most recently modified notes
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const favoriteNotes = favoriteNoteIds
    .map(id => notes.find(n => n.id === id))
    .filter((n): n is NonNullable<typeof n> => n != null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParent, setNewItemParent] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameItem, setRenameItem] = useState<FileTreeItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);

  const tree = getFileTree();

  // Collect all folder IDs nested under a given folder (inclusive)
  const getDescendantFolderIds = useCallback((folderId: string): string[] => {
    const ids = [folderId];
    for (const f of folders) {
      if (f.parentId === folderId) {
        ids.push(...getDescendantFolderIds(f.id));
      }
    }
    return ids;
  }, [folders]);

  // Get all notes inside a folder and its subfolders
  const getNotesInFolder = useCallback((folderId: string) => {
    const folderIds = new Set(getDescendantFolderIds(folderId));
    return notes.filter(n => n.folderId && folderIds.has(n.folderId));
  }, [notes, getDescendantFolderIds]);

  const handleOpenNote = useCallback((id: string, title: string) => {
    openNote(id, title);
    if (isMobile && sidebarVisible) toggleSidebar();
  }, [openNote, isMobile, sidebarVisible, toggleSidebar]);

  const handleCreateNote = async () => {
    if (newItemName.trim()) {
      const note = await createNote(newItemName.trim(), newItemParent);
      handleOpenNote(note.id, note.title);
      setNewItemName('');
      setShowNewNote(false);
      setNewItemParent(null);
    }
  };

  const handleCreateFolder = async () => {
    if (newItemName.trim()) {
      await createFolder(newItemName.trim(), newItemParent);
      setNewItemName('');
      setShowNewFolder(false);
      setNewItemParent(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'note' | 'folder') => {
    if (e.key === 'Enter') {
      if (type === 'note') { handleCreateNote(); } else { handleCreateFolder(); }
    } else if (e.key === 'Escape') {
      setNewItemName('');
      setShowNewNote(false);
      setShowNewFolder(false);
      setNewItemParent(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'note' | 'folder') => {
    e.dataTransfer.setData('application/x-item-id', id);
    e.dataTransfer.setData('application/x-item-type', type);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverFolderId(undefined);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(undefined);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('application/x-item-id');
    const type = e.dataTransfer.getData('application/x-item-type');
    if (id) {
      if (type === 'folder') {
        await moveFolder(id, targetFolderId);
      } else {
        await moveNote(id, targetFolderId);
      }
    }
    setDragOverFolderId(undefined);
    setIsDragging(false);
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileTreeItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  // Long-press handler for mobile context menu
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (e: React.TouchEvent, item: FileTreeItem) => {
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY, item });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRename = (item: FileTreeItem) => {
    setRenameItem(item);
    setRenameValue(item.name);
    setContextMenu(null);
  };

  const handleRenameSubmit = async () => {
    if (renameItem && renameValue.trim() && renameValue !== renameItem.name) {
      if (renameItem.type === 'note') {
        await renameNote(renameItem.id, renameValue.trim());
        // Update tab title if open
        const tab = tabs.find(t => t.noteId === renameItem.id);
        if (tab) {
          // Tab title will be updated on next render since it reads from note
        }
      } else {
        await renameFolder(renameItem.id, renameValue.trim());
      }
    }
    setRenameItem(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameItem(null);
      setRenameValue('');
    }
  };

  const handleDelete = async (item: FileTreeItem) => {
    setContextMenu(null);
    if (item.type === 'note') {
      const tab = tabs.find(t => t.noteId === item.id);
      if (tab) {
        closeTab(tab.id);
      }
      await deleteNote(item.id);
    } else {
      const containedNotes = getNotesInFolder(item.id);
      if (containedNotes.length > 0) {
        setDeleteFolderTarget({ id: item.id, name: item.name });
      } else {
        // Delete subfolders then this folder
        const descendantIds = getDescendantFolderIds(item.id);
        for (const id of descendantIds.reverse()) {
          await deleteFolder(id);
        }
      }
    }
  };

  const handleDeleteFolderAll = async () => {
    if (!deleteFolderTarget) return;
    const containedNotes = getNotesInFolder(deleteFolderTarget.id);
    // Close tabs and delete notes
    for (const note of containedNotes) {
      const tab = tabs.find(t => t.noteId === note.id);
      if (tab) closeTab(tab.id);
      await deleteNote(note.id);
    }
    // Delete subfolders then this folder
    const descendantIds = getDescendantFolderIds(deleteFolderTarget.id);
    for (const id of descendantIds.reverse()) {
      await deleteFolder(id);
    }
    setDeleteFolderTarget(null);
  };

  const handleMoveAndDeleteFolder = async (targetFolderId: string | null) => {
    if (!deleteFolderTarget) return;
    const containedNotes = getNotesInFolder(deleteFolderTarget.id);
    // Move all notes to the target folder
    for (const note of containedNotes) {
      await moveNote(note.id, targetFolderId);
    }
    // Delete subfolders then this folder
    const descendantIds = getDescendantFolderIds(deleteFolderTarget.id);
    for (const id of descendantIds.reverse()) {
      await deleteFolder(id);
    }
    setDeleteFolderTarget(null);
  };

  const getContextMenuItems = (item: FileTreeItem): ContextMenuItem[] => [
    {
      label: 'Rename',
      icon: <Pencil size={14} />,
      onClick: () => handleRename(item),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => handleDelete(item),
      danger: true,
    },
  ];

  const handleSwitchTab = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobile && sidebarVisible) toggleSidebar();
  };

  return (
    <div className="py-2">
      {/* Open Notes Section - mobile only */}
      {isMobile && tabs.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted uppercase tracking-wider">
            <FileText size={12} />
            <span className="leading-none py-1">Open</span>
          </div>
          <div>
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`group flex items-center gap-1 px-2 py-2 text-sm cursor-pointer hover:bg-bg-hover ${
                  tab.id === activeTabId ? 'bg-bg-hover text-accent' : 'text-text-primary'
                }`}
                style={{ paddingLeft: 28 }}
                onClick={() => handleSwitchTab(tab.id)}
              >
                <File size={16} className={`shrink-0 ${tab.id === activeTabId ? 'text-accent' : 'text-text-muted'}`} />
                <span className="truncate flex-1">
                  {tab.isDirty && <span className="text-accent mr-1">●</span>}
                  {tab.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded hover:bg-bg-active opacity-0 group-hover:opacity-100 active:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Notes Section */}
      {showRecentNotes && recentNotes.length > 0 && (
        <div className="mb-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary"
            onClick={() => setRecentCollapsed(!recentCollapsed)}
          >
            {recentCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            <Clock size={12} />
            <span className="leading-none py-1 font-semibold">Recent</span>
          </div>
          {!recentCollapsed && (
            <div>
              {recentNotes.map(note => {
                const isFavorited = favoriteNoteIds.includes(note.id);
                return (
                  <div
                    key={note.id}
                    className={`group flex items-center gap-1 px-2 py-2 md:py-1 text-sm cursor-pointer hover:bg-bg-hover ${
                      note.id === activeNoteId ? 'bg-bg-hover text-accent' : 'text-text-primary'
                    }`}
                    style={{ paddingLeft: 28 }}
                    onClick={() => handleOpenNote(note.id, note.title)}
                  >
                    <File size={16} className={`shrink-0 ${note.id === activeNoteId ? 'text-accent' : 'text-text-muted'}`} />
                    <span className="truncate flex-1">{note.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(note.id); }}
                      className={`p-0.5 rounded hover:bg-bg-active shrink-0 ${
                        isFavorited ? 'text-accent' : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary'
                      }`}
                      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star size={14} fill={isFavorited ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Favorites Section */}
      {favoriteNotes.length > 0 && (
        <div className="mb-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary"
            onClick={() => setFavoritesCollapsed(!favoritesCollapsed)}
          >
            {favoritesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            <Star size={12} />
            <span className="leading-none py-1 font-semibold">Favorites</span>
          </div>
          {!favoritesCollapsed && (
            <div>
              {favoriteNotes.map(note => (
                <div
                  key={note.id}
                  className={`group flex items-center gap-1 px-2 py-2 md:py-1 text-sm cursor-pointer hover:bg-bg-hover ${
                    note.id === activeNoteId ? 'bg-bg-hover text-accent' : 'text-text-primary'
                  }`}
                  style={{ paddingLeft: 28 }}
                  onClick={() => handleOpenNote(note.id, note.title)}
                >
                  <File size={16} className={`shrink-0 ${note.id === activeNoteId ? 'text-accent' : 'text-text-muted'}`} />
                  <span className="truncate flex-1">{note.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(note.id); }}
                    className="p-0.5 rounded hover:bg-bg-active shrink-0 text-accent"
                    title="Remove from favorites"
                  >
                    <Star size={14} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Notes Section */}
      <div className="flex items-center justify-between px-2 py-1.5 text-xs text-text-muted uppercase tracking-wider">
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:text-text-secondary"
          onClick={() => setNotesCollapsed(!notesCollapsed)}
        >
          {notesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <FileText size={12} />
          <span className="leading-none py-1 font-semibold">Notes</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setShowNewNote(true);
              setNewItemParent(null);
              if (notesCollapsed) setNotesCollapsed(false);
            }}
            className="p-2.5 md:p-1.5 rounded hover:bg-bg-hover cursor-pointer text-text-muted hover:text-text-primary transition-colors"
            title="New note"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={() => {
              setShowNewFolder(true);
              setNewItemParent(null);
              if (notesCollapsed) setNotesCollapsed(false);
            }}
            className="p-2.5 md:p-1.5 rounded hover:bg-bg-hover cursor-pointer text-text-muted hover:text-text-primary transition-colors"
            title="New folder"
          >
            <FolderPlus size={16} />
          </button>
        </div>
      </div>

      {!notesCollapsed && (
        <>
          {showNewNote && newItemParent === null && (
            <div className="px-2 py-1">
              <input
                type="text"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => handleKeyDown(e, 'note')}
                onBlur={() => {
                  if (!newItemName.trim()) {
                    setShowNewNote(false);
                  }
                }}
                placeholder="Note name..."
                className="w-full px-2 py-1 text-sm bg-bg-tertiary border border-border-primary rounded focus:outline-none focus:border-accent"
                autoFocus
              />
            </div>
          )}

          {showNewFolder && newItemParent === null && (
            <div className="px-2 py-1">
              <input
                type="text"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => handleKeyDown(e, 'folder')}
                onBlur={() => {
                  if (!newItemName.trim()) {
                    setShowNewFolder(false);
                  }
                }}
                placeholder="Folder name..."
                className="w-full px-2 py-1 text-sm bg-bg-tertiary border border-border-primary rounded focus:outline-none focus:border-accent"
                autoFocus
              />
            </div>
          )}

          {/* Root drop zone - always in DOM, visibility controlled by CSS */}
          <div
            className={`mx-2 px-3 border-2 border-dashed rounded text-xs text-center transition-all ${
              isDragging ? 'opacity-100 py-2 mb-2' : 'hidden'
            } ${
              dragOverFolderId === null
                ? 'border-accent bg-accent/20 text-text-primary'
                : 'border-border-primary text-text-muted'
            }`}
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            Drop here to move to root
          </div>

          <div
            className="mt-1"
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            {tree.map(item => (
              <FileTreeNode
                key={item.id}
                item={item}
                depth={0}
                onToggle={toggleFolder}
                onOpenNote={handleOpenNote}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                dragOverFolderId={dragOverFolderId}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                renameItem={renameItem}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onRenameKeyDown={handleRenameKeyDown}
                activeNoteId={activeNoteId}
                favoriteNoteIds={favoriteNoteIds}
                onToggleFavorite={toggleFavorite}
              />
            ))}
            {tree.length === 0 && !showNewNote && !showNewFolder && (
              <p className="px-4 py-2 text-sm text-text-muted italic">No notes yet</p>
            )}
          </div>
        </>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.item)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {deleteFolderTarget && (
        <DeleteFolderModal
          folder={deleteFolderTarget}
          noteCount={getNotesInFolder(deleteFolderTarget.id).length}
          otherFolders={folders.filter(f => {
            // Exclude the folder being deleted and its descendants
            const excludeIds = new Set(getDescendantFolderIds(deleteFolderTarget.id));
            return !excludeIds.has(f.id);
          })}
          onDeleteAll={handleDeleteFolderAll}
          onMoveAndDelete={handleMoveAndDeleteFolder}
          onClose={() => setDeleteFolderTarget(null)}
        />
      )}
    </div>
  );
}

interface FileTreeNodeProps {
  item: FileTreeItem;
  depth: number;
  onToggle: (folderId: string) => void;
  onOpenNote: (noteId: string, title: string) => void;
  onDragStart: (e: React.DragEvent, id: string, type: 'note' | 'folder') => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
  dragOverFolderId: string | null | undefined;
  onContextMenu: (e: React.MouseEvent, item: FileTreeItem) => void;
  onTouchStart: (e: React.TouchEvent, item: FileTreeItem) => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  renameItem: FileTreeItem | null;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameKeyDown: (e: React.KeyboardEvent) => void;
  activeNoteId: string | null;
  favoriteNoteIds: string[];
  onToggleFavorite: (noteId: string) => void;
}

function FileTreeNode({
  item,
  depth,
  onToggle,
  onOpenNote,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverFolderId,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  renameItem,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameKeyDown,
  activeNoteId,
  favoriteNoteIds,
  onToggleFavorite,
}: FileTreeNodeProps) {
  const paddingLeft = 8 + depth * 16;
  const isRenaming = renameItem?.id === item.id;
  const isActive = item.type === 'note' && item.id === activeNoteId;

  if (item.type === 'folder') {
    const isDragOver = dragOverFolderId === item.id;

    return (
      <div>
        <div
          className={`flex items-center gap-1 px-2 py-2 md:py-1 text-sm cursor-pointer hover:bg-bg-hover text-text-secondary transition-colors ${
            isDragOver ? 'bg-accent/20 outline outline-1 outline-accent' : ''
          }`}
          style={{ paddingLeft }}
          onClick={() => onToggle(item.id)}
          onContextMenu={(e) => onContextMenu(e, item)}
          onTouchStart={(e) => onTouchStart(e, item)}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
          draggable={!isRenaming}
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart(e, item.id, 'folder');
          }}
          onDragEnd={onDragEnd}
          onDragOver={(e) => {
            e.stopPropagation();
            onDragOver(e, item.id);
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            onDragLeave();
          }}
          onDrop={(e) => {
            e.stopPropagation();
            onDrop(e, item.id);
          }}
        >
          {item.isExpanded ? (
            <ChevronDown size={16} className="text-text-muted shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-text-muted shrink-0" />
          )}
          {item.isExpanded ? (
            <FolderOpen size={16} className="text-text-muted shrink-0" />
          ) : (
            <Folder size={16} className="text-text-muted shrink-0" />
          )}
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={onRenameKeyDown}
              onBlur={onRenameSubmit}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0 text-sm bg-bg-tertiary border border-accent rounded focus:outline-none"
              autoFocus
            />
          ) : (
            <span className="truncate">{item.name}</span>
          )}
        </div>
        {item.isExpanded && item.children && (
          <div>
            {item.children.map(child => (
              <FileTreeNode
                key={child.id}
                item={child}
                depth={depth + 1}
                onToggle={onToggle}
                onOpenNote={onOpenNote}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                dragOverFolderId={dragOverFolderId}
                onContextMenu={onContextMenu}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchMove}
                renameItem={renameItem}
                renameValue={renameValue}
                onRenameChange={onRenameChange}
                onRenameSubmit={onRenameSubmit}
                onRenameKeyDown={onRenameKeyDown}
                activeNoteId={activeNoteId}
                favoriteNoteIds={favoriteNoteIds}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isFavorited = item.type === 'note' && favoriteNoteIds.includes(item.id);

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-2 md:py-1 text-sm cursor-pointer hover:bg-bg-hover text-text-primary ${
        isActive ? 'bg-bg-hover text-accent' : ''
      }`}
      style={{ paddingLeft: paddingLeft + 20 }}
      onClick={() => !isRenaming && onOpenNote(item.id, item.name)}
      onContextMenu={(e) => onContextMenu(e, item)}
      onTouchStart={(e) => onTouchStart(e, item)}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      draggable={!isRenaming}
      onDragStart={(e) => onDragStart(e, item.id, 'note')}
      onDragEnd={onDragEnd}
    >
      <File size={16} className={`shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
      {isRenaming ? (
        <input
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={onRenameKeyDown}
          onBlur={onRenameSubmit}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-1 py-0 text-sm bg-bg-tertiary border border-accent rounded focus:outline-none"
          autoFocus
        />
      ) : (
        <>
          <span className="truncate flex-1">{item.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            className={`p-0.5 rounded hover:bg-bg-active shrink-0 ${
              isFavorited ? 'text-accent' : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary'
            }`}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={14} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
        </>
      )}
    </div>
  );
}
