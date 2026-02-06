import { useEffect, useCallback, useMemo, useRef } from 'react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { clipboard } from '@milkdown/plugin-clipboard';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { replaceAll, getMarkdown } from '@milkdown/utils';
import { nord } from '@milkdown/theme-nord';
import { $prose } from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { Note } from '../../types';
import { useNoteStore, useWorkspaceStore, useSettingsStore } from '../../store';
import { updateNoteMetadata } from '../../services/parser';
import { debounce } from '../../utils';
import '@milkdown/theme-nord/style.css';
import './milkdown.css';

// Helper to convert lines to task list format in markdown
function convertLinesToTaskList(markdown: string, fromLine: number, toLine: number): string {
  const lines = markdown.split('\n');

  for (let i = fromLine; i <= toLine && i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Already a task list item - toggle it off to plain bullet
    if (/^[-*+]\s*\[[ xX]\]\s*/.test(trimmed)) {
      lines[i] = line.replace(/^(\s*)([-*+])\s*\[[ xX]\]\s*/, '$1$2 ');
    }
    // Bullet list item - convert to task
    else if (/^[-*+]\s+/.test(trimmed)) {
      lines[i] = line.replace(/^(\s*)([-*+])\s+/, '$1$2 [ ] ');
    }
    // Numbered list item - convert to task
    else if (/^\d+\.\s+/.test(trimmed)) {
      lines[i] = line.replace(/^(\s*)\d+\.\s+/, '$1- [ ] ');
    }
    // Plain text - add task prefix
    else if (trimmed.length > 0) {
      const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
      lines[i] = leadingWhitespace + '- [ ] ' + trimmed;
    }
  }

  return lines.join('\n');
}

// Store for accessing editor instance from plugin
let editorInstanceForPlugin: Editor | null = null;

// Custom plugin for keyboard shortcuts and task list click handling
const taskListPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('taskListPlugin'),
    props: {
      handleKeyDown(view, event) {
        // Ctrl+Shift+T or Cmd+Shift+T to convert to task list
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 't') {
          event.preventDefault();

          if (!editorInstanceForPlugin) return false;

          const { state } = view;
          const { selection, doc } = state;
          const { from, to } = selection;

          // Get current markdown
          const currentMarkdown = editorInstanceForPlugin.action(getMarkdown());

          // Calculate line numbers from position
          const textBeforeFrom = doc.textBetween(0, from, '\n');
          const textBeforeTo = doc.textBetween(0, to, '\n');
          const fromLine = (textBeforeFrom.match(/\n/g) || []).length;
          const toLine = (textBeforeTo.match(/\n/g) || []).length;

          // Convert the lines
          const newMarkdown = convertLinesToTaskList(currentMarkdown, fromLine, toLine);

          if (newMarkdown !== currentMarkdown) {
            editorInstanceForPlugin.action(replaceAll(newMarkdown));
          }

          return true;
        }
        return false;
      },

    },
  });
});

interface MilkdownEditorProps {
  note: Note;
}

function MilkdownEditorInner({ note }: MilkdownEditorProps) {
  const { updateNote } = useNoteStore();
  const { setTabDirty, tabs, activeTabId } = useWorkspaceStore();
  const { autoSave, autoSaveInterval } = useSettingsStore();
  const [loading, getInstance] = useInstance();

  const activeTab = tabs.find(t => t.id === activeTabId);

  const saveNote = useCallback(
    async (content: string) => {
      const metadata = updateNoteMetadata(content);
      await updateNote(note.id, { content, metadata });
      if (activeTab) {
        setTabDirty(activeTab.id, false);
      }
    },
    [note.id, updateNote, activeTab, setTabDirty]
  );

  const debouncedSave = useMemo(
    () => debounce((content: string) => {
      if (autoSave) {
        saveNote(content);
      }
    }, autoSaveInterval),
    [saveNote, autoSave, autoSaveInterval]
  );

  const handleMarkdownChange = useCallback((markdown: string) => {
    if (activeTab) {
      setTabDirty(activeTab.id, true);
    }
    debouncedSave(markdown);
  }, [activeTab, setTabDirty, debouncedSave]);

  const { get } = useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, note.content);
      })
      .config(nord)
      .config((ctx) => {
        ctx.get(listenerCtx)
          .markdownUpdated((_ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown) {
              handleMarkdownChange(markdown);
            }
          })
          .mounted((ctx) => {
            // Focus editor on mount
            const view = ctx.get(editorViewCtx);
            view.focus();
          });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(clipboard)
      .use(taskListPlugin);
  }, [note.id]); // Recreate editor when note changes

  // Update editor instance for plugin access
  useEffect(() => {
    const editor = get();
    if (editor) {
      editorInstanceForPlugin = editor;
    }
    return () => {
      editorInstanceForPlugin = null;
    };
  }, [get]);

  // Update content when note content changes externally
  useEffect(() => {
    const editor = getInstance();
    if (!editor || loading) return;

    const currentMarkdown = editor.action(getMarkdown());
    if (currentMarkdown !== note.content) {
      editor.action(replaceAll(note.content));
    }
  }, [note.content, getInstance, loading]);

  // Handle Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const editor = getInstance();
        if (editor) {
          const markdown = editor.action(getMarkdown());
          saveNote(markdown);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getInstance, saveNote]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle task checkbox clicks
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const listItem = target.closest('li[data-item-type="task"]') as HTMLElement;

      if (!listItem) return;

      // Check if click is in the checkbox area (left 30px)
      const rect = listItem.getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      if (clickX > 30) return;

      e.preventDefault();
      e.stopPropagation();

      const editor = getInstance();
      if (!editor) return;

      // Find which task item this is
      const allTaskItems = Array.from(
        wrapper.querySelectorAll('li[data-item-type="task"]')
      );
      const taskIndex = allTaskItems.indexOf(listItem);

      if (taskIndex === -1) return;

      const isChecked = listItem.getAttribute('data-checked') === 'true';
      const currentMarkdown = editor.action(getMarkdown());
      const lines = currentMarkdown.split('\n');

      let taskCount = 0;
      for (let i = 0; i < lines.length; i++) {
        // Match task lists with -, *, or + bullets
        if (/^\s*[-*+]\s*\[[ xX]\]/.test(lines[i])) {
          if (taskCount === taskIndex) {
            if (isChecked) {
              lines[i] = lines[i].replace(/\[x\]/i, '[ ]');
            } else {
              lines[i] = lines[i].replace(/\[ \]/, '[x]');
            }
            break;
          }
          taskCount++;
        }
      }

      const newMarkdown = lines.join('\n');
      if (newMarkdown !== currentMarkdown) {
        editor.action(replaceAll(newMarkdown));
      }
    };

    wrapper.addEventListener('click', handleClick);
    return () => wrapper.removeEventListener('click', handleClick);
  }, [getInstance]);

  return (
    <div ref={wrapperRef} className="milkdown-editor-wrapper h-full w-full overflow-auto">
      <Milkdown />
    </div>
  );
}

export function MilkdownEditor({ note }: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner note={note} />
    </MilkdownProvider>
  );
}
