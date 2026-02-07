import { useMemo, useState } from 'react';
import { useNoteStore } from '../../store';
import { useWorkspaceStore } from '../../store';
import { useUIStore } from '../../store';
import { X, ChevronDown, ChevronRight, CheckSquare, FileText, ExternalLink, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

interface TaskItem {
  noteId: string;
  noteTitle: string;
  lineIndex: number;
  charOffset: number;
  text: string;
  type: 'checkbox' | 'tag';
}

interface TaskGroup {
  noteId: string;
  noteTitle: string;
  tasks: TaskItem[];
}

interface TasksViewProps {
  onClose: () => void;
}

const CHECKBOX_RE = /^(\s*[-*+]\s*)\[ \](.*)$/;
const TAG_RE = /#(ACTION|TODO)\b/i;
const STRIKETHROUGH_RE = /^~~.*~~$/;

function extractTasks(notes: { id: string; title: string; content: string }[]): TaskGroup[] {
  const groups: TaskGroup[] = [];

  for (const note of notes) {
    const tasks: TaskItem[] = [];
    const lines = note.content.split('\n');
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for unchecked checkboxes
      if (CHECKBOX_RE.test(line)) {
        const text = line.replace(CHECKBOX_RE, '$2').trim();
        if (text) {
          tasks.push({
            noteId: note.id,
            noteTitle: note.title,
            lineIndex: i,
            charOffset,
            text,
            type: 'checkbox',
          });
        }
      }
      // Check for #ACTION / #TODO tags (not struck through)
      else if (TAG_RE.test(line)) {
        const trimmed = line.trim();
        if (!STRIKETHROUGH_RE.test(trimmed)) {
          tasks.push({
            noteId: note.id,
            noteTitle: note.title,
            lineIndex: i,
            charOffset,
            text: trimmed,
            type: 'tag',
          });
        }
      }

      charOffset += line.length + 1; // +1 for newline
    }

    if (tasks.length > 0) {
      groups.push({ noteId: note.id, noteTitle: note.title, tasks });
    }
  }

  return groups;
}

export function TasksView({ onClose }: TasksViewProps) {
  const { notes, updateNote, getNoteById } = useNoteStore();
  const { openNote, scrollToPosition } = useWorkspaceStore();
  const { closeTasksView } = useUIStore();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const taskGroups = useMemo(() => extractTasks(notes), [notes]);
  const totalTasks = useMemo(() => taskGroups.reduce((sum, g) => sum + g.tasks.length, 0), [taskGroups]);

  const toggleGroup = (noteId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const completeTask = async (task: TaskItem) => {
    const note = getNoteById(task.noteId);
    if (!note) return;

    const lines = note.content.split('\n');
    const line = lines[task.lineIndex];
    if (!line) return;

    if (task.type === 'checkbox') {
      lines[task.lineIndex] = line.replace('[ ]', '[x]');
    } else {
      // Wrap in strikethrough
      lines[task.lineIndex] = `~~${line.trimStart()}~~`;
      // Preserve leading whitespace
      const leadingWhitespace = line.match(/^(\s*)/)?.[1] ?? '';
      if (leadingWhitespace) {
        lines[task.lineIndex] = leadingWhitespace + lines[task.lineIndex];
      }
    }

    await updateNote(task.noteId, { content: lines.join('\n') });
  };

  const viewTask = (task: TaskItem) => {
    openNote(task.noteId, task.noteTitle);
    closeTasksView();
    // Wait for editor to mount and register its scroll callback
    setTimeout(() => scrollToPosition(task.charOffset), 100);
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-secondary">
        <span className="text-sm font-medium text-text-primary">
          Tasks
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted mr-1">
            {totalTasks} {totalTasks === 1 ? 'item' : 'items'}
          </span>
          {taskGroups.length > 0 && (
            <>
              <button
                onClick={() => setCollapsedGroups(new Set())}
                className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Expand all"
              >
                <ChevronsUpDown size={16} />
              </button>
              <button
                onClick={() => setCollapsedGroups(new Set(taskGroups.map(g => g.noteId)))}
                className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Collapse all"
              >
                <ChevronsDownUp size={16} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
            title="Close tasks"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {taskGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <CheckSquare size={48} strokeWidth={1} className="mb-4 opacity-50" />
            <p className="text-lg">No open tasks</p>
            <p className="text-sm mt-2 text-center px-8">
              Tasks are collected from unchecked checkboxes (<code className="text-xs bg-bg-tertiary px-1 py-0.5 rounded">- [ ]</code>) and <code className="text-xs bg-bg-tertiary px-1 py-0.5 rounded">#TODO</code> / <code className="text-xs bg-bg-tertiary px-1 py-0.5 rounded">#ACTION</code> tags
            </p>
          </div>
        ) : (
          <div className="py-2">
            {taskGroups.map(group => {
              const isCollapsed = collapsedGroups.has(group.noteId);
              return (
                <div key={group.noteId} className="mb-1">
                  <button
                    onClick={() => toggleGroup(group.noteId)}
                    className="flex items-center gap-1.5 w-full px-3 py-1.5 text-left hover:bg-bg-hover transition-colors group"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={14} className="text-text-faint shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="text-text-faint shrink-0" />
                    )}
                    <FileText size={14} className="text-text-muted shrink-0" />
                    <span
                      className="text-sm font-medium text-text-primary truncate hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNote(group.noteId, group.noteTitle);
                        onClose();
                      }}
                    >
                      {group.noteTitle}
                    </span>
                    <span className="text-xs text-text-faint ml-auto shrink-0">
                      {group.tasks.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="ml-5">
                      {group.tasks.map((task) => (
                        <div
                          key={`${task.noteId}-${task.lineIndex}`}
                          className="flex items-start gap-2 px-3 py-1.5 hover:bg-bg-hover transition-colors group"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-accent cursor-pointer shrink-0"
                            onChange={() => completeTask(task)}
                          />
                          <span className="text-sm text-text-secondary group-hover:text-text-primary leading-snug break-words min-w-0 flex-1">
                            {task.type === 'tag' ? (
                              <span>
                                {task.text.split(TAG_RE).map((part, i) => {
                                  if (/^(ACTION|TODO)$/i.test(part)) {
                                    return (
                                      <span key={i} className="text-xs font-mono bg-accent/15 text-accent px-1 py-0.5 rounded mr-1">
                                        #{part.toUpperCase()}
                                      </span>
                                    );
                                  }
                                  return <span key={i}>{part}</span>;
                                })}
                              </span>
                            ) : (
                              task.text
                            )}
                          </span>
                          <button
                            onClick={() => viewTask(task)}
                            className="shrink-0 text-xs text-text-faint hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                            title="View in note"
                          >
                            <ExternalLink size={12} />
                            <span>View</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
