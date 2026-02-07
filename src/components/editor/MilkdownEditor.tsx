import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
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
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { Node as ProsemirrorNode } from '@milkdown/prose/model';
import type { Note } from '../../types';
import { useNoteStore, useWorkspaceStore, useSettingsStore } from '../../store';
import { updateNoteMetadata, extractLinks, getContextForLink } from '../../services/parser';
import { backlinkStorage } from '../../services/storage';
import { debounce } from '../../utils';
import { WikilinkAutocomplete } from './WikilinkAutocomplete';
import '@milkdown/theme-nord/style.css';
import './milkdown.css';

// Wikilink callback - will be set by the component
let onWikilinkClick: ((noteTitle: string) => void) | null = null;

// Wikilink decoration plugin
const wikilinkPlugin = $prose(() => {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;

  return new Plugin({
    key: new PluginKey('wikilinkPlugin'),
    state: {
      init(_, { doc }) {
        return buildDecorations(doc);
      },
      apply(tr, old) {
        return tr.docChanged ? buildDecorations(tr.doc) : old;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
      handleClick(_view, _pos, event) {
        const target = event.target as HTMLElement;
        if (target.classList.contains('wikilink')) {
          const noteTitle = target.getAttribute('data-note-title');
          if (noteTitle && onWikilinkClick) {
            event.preventDefault();
            onWikilinkClick(noteTitle);
            return true;
          }
        }
        return false;
      },
    },
  });

  function buildDecorations(doc: ProsemirrorNode): DecorationSet {
    const decorations: Decoration[] = [];

    doc.descendants((node: ProsemirrorNode, pos: number) => {
      if (node.isText) {
        const text = node.text || '';
        let match;
        wikilinkRegex.lastIndex = 0;
        while ((match = wikilinkRegex.exec(text)) !== null) {
          const start = pos + match.index;
          const end = start + match[0].length;
          const noteTitle = match[1];

          decorations.push(
            Decoration.inline(start, end, {
              class: 'wikilink',
              'data-note-title': noteTitle,
            })
          );
        }
      }
    });

    return DecorationSet.create(doc, decorations);
  }
});

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

// Store for accessing ProseMirror view directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let editorViewForAutocomplete: any = null;

// Custom plugin for keyboard shortcuts and task list click handling
const taskListPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('taskListPlugin'),
    props: {
      handleKeyDown(view, event) {
        // Ctrl+Shift+T or Cmd+Shift+T to convert to task list
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 't') {
          event.preventDefault();

          if (!editorInstanceForPlugin || !editorViewForAutocomplete) return false;

          try {
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
          } catch {
            // Editor not fully ready
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
  const { updateNote, notes, createNote } = useNoteStore();
  const { openNote, setTabDirty, tabs, activeTabId } = useWorkspaceStore();
  const { autoSave, autoSaveInterval } = useSettingsStore();
  const [loading, getInstance] = useInstance();

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState<{
    show: boolean;
    query: string;
    position: { top: number; left: number };
    from: number;
    to: number;
  }>({ show: false, query: '', position: { top: 0, left: 0 }, from: 0, to: 0 });


  const saveNote = useCallback(
    async (content: string) => {
      const metadata = updateNoteMetadata(content);
      await updateNote(note.id, { content, metadata });

      // Update backlinks
      const links = extractLinks(content);
      const backlinkData = links
        .filter(link => link.type === 'wikilink')
        .map(link => {
          const targetNote = notes.find(
            n => n.title.toLowerCase() === link.target.toLowerCase()
          );
          if (!targetNote) return null;
          return {
            targetNoteId: targetNote.id,
            link,
            context: getContextForLink(content, link),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      try {
        await backlinkStorage.updateForNote(note.id, backlinkData);
      } catch (err) {
        console.error('Error saving backlinks:', err);
      }

      if (activeTab) {
        setTabDirty(activeTab.id, false);
      }
    },
    [note.id, notes, updateNote, activeTab, setTabDirty]
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
            // Focus editor on mount and store view reference
            const view = ctx.get(editorViewCtx);
            editorViewForAutocomplete = view;
            view.focus();
          });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(clipboard)
      .use(wikilinkPlugin)
      .use(taskListPlugin);
  }, [note.id]); // Recreate editor when note changes

  // Update editor instance for plugin access
  useEffect(() => {
    const editor = get();
    if (editor) {
      editorInstanceForPlugin = editor;
    }
  }, [get]);

  // Clean up on unmount only
  useEffect(() => {
    return () => {
      editorInstanceForPlugin = null;
      editorViewForAutocomplete = null;
    };
  }, []);

  // Autocomplete detection - watch for [[ pattern using DOM events
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const checkForAutocomplete = () => {
      const view = editorViewForAutocomplete;
      if (!view) return;

      try {
        const { state } = view;
        const { selection } = state;
        const { $from } = selection;

        // Get text before cursor on current line
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

        // Check for [[ pattern without closing ]]
        const match = textBefore.match(/\[\[([^\]]*?)$/);

        if (match) {
          const query = match[1];
          const from = $from.pos - query.length;
          const to = $from.pos;

          // Get cursor position for popup placement
          const coords = view.coordsAtPos($from.pos);

          setAutocomplete({
            show: true,
            query,
            position: {
              top: coords.bottom + 4,
              left: coords.left,
            },
            from: from - 2, // Include [[
            to,
          });
        } else {
          setAutocomplete(prev => prev.show ? { show: false, query: '', position: { top: 0, left: 0 }, from: 0, to: 0 } : prev);
        }
      } catch {
        // View may be destroyed, ignore errors
      }
    };

    // Listen for input events
    const handleInput = () => {
      checkForAutocomplete();
    };

    // Also check on keyup for more reliable detection
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === '[') {
        setTimeout(() => checkForAutocomplete(), 0);
      }
    };

    wrapper.addEventListener('input', handleInput);
    wrapper.addEventListener('keyup', handleKeyUp);

    return () => {
      wrapper.removeEventListener('input', handleInput);
      wrapper.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // No dependencies - uses refs and module variables

  // Keep autocomplete state in a ref for the selection handler
  const autocompleteRef = useRef(autocomplete);
  useEffect(() => {
    autocompleteRef.current = autocomplete;
  }, [autocomplete]);

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback((title: string) => {
    const view = editorViewForAutocomplete;
    if (!view) return;

    const { state } = view;
    const { from, to } = autocompleteRef.current;

    // Create the wikilink text
    const wikilinkText = `[[${title}]]`;

    try {
      // Replace from [[ to cursor with the complete wikilink
      const tr = state.tr.replaceWith(
        from,
        to,
        state.schema.text(wikilinkText)
      );

      view.dispatch(tr);
      view.focus();
    } catch (err) {
      console.error('Error inserting wikilink:', err);
    }

    // Close autocomplete
    setAutocomplete({ show: false, query: '', position: { top: 0, left: 0 }, from: 0, to: 0 });
  }, []);

  // Close autocomplete
  const handleAutocompleteClose = useCallback(() => {
    setAutocomplete({ show: false, query: '', position: { top: 0, left: 0 }, from: 0, to: 0 });
  }, []);

  // Handle wikilink clicks
  useEffect(() => {
    onWikilinkClick = async (noteTitle: string) => {
      // Find existing note by title
      const existingNote = notes.find(
        n => n.title.toLowerCase() === noteTitle.toLowerCase()
      );

      if (existingNote) {
        openNote(existingNote.id, existingNote.title);
      } else {
        // Create new note
        const newNote = await createNote(noteTitle);
        openNote(newNote.id, newNote.title);
      }
    };

    return () => {
      onWikilinkClick = null;
    };
  }, [notes, openNote, createNote]);

  // Update content when note content changes externally
  useEffect(() => {
    const editor = getInstance();
    if (!editor || loading || !editorViewForAutocomplete) return;

    try {
      const currentMarkdown = editor.action(getMarkdown());
      if (currentMarkdown !== note.content) {
        editor.action(replaceAll(note.content));
      }
    } catch {
      // Editor not fully ready yet
    }
  }, [note.content, getInstance, loading]);

  // Update backlinks and metadata on mount for existing notes
  const hasStoredLinks = (note.metadata?.outgoingLinks?.length ?? 0) > 0;
  useEffect(() => {
    if (!note.content) return;

    const links = extractLinks(note.content);

    // Update note metadata if links were found but not stored
    if (links.length > 0 && !hasStoredLinks) {
      const metadata = updateNoteMetadata(note.content);
      updateNote(note.id, { metadata }).catch(err =>
        console.error('Error updating note metadata:', err)
      );
    }

    if (links.length === 0) return;

    const backlinkData = links
      .filter(link => link.type === 'wikilink')
      .map(link => {
        const targetNote = notes.find(
          n => n.title.toLowerCase() === link.target.toLowerCase()
        );
        if (!targetNote) return null;
        return {
          targetNoteId: targetNote.id,
          link,
          context: getContextForLink(note.content, link),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (backlinkData.length > 0) {
      backlinkStorage.updateForNote(note.id, backlinkData)
        .catch(err => console.error('Error saving initial backlinks:', err));
    }
  }, [note.id, note.content, notes, updateNote, hasStoredLinks]);

  // Handle Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const editor = getInstance();
        if (editor) {
          try {
            const markdown = editor.action(getMarkdown());
            saveNote(markdown);
          } catch {
            // Editor not fully ready
          }
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

      if (clickX > 44) return;

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

      try {
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
      } catch {
        // Editor not fully ready
      }
    };

    wrapper.addEventListener('click', handleClick);
    return () => wrapper.removeEventListener('click', handleClick);
  }, [getInstance]);

  // Prepare notes list for autocomplete
  const notesForAutocomplete = useMemo(() =>
    notes.map(n => ({ id: n.id, title: n.title, path: n.path })),
    [notes]
  );

  // Click in empty area below content → focus editor at end
  const handleWrapperClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Only handle clicks on the wrapper/milkdown container itself, not on editor content
    if (target.closest('.ProseMirror')) return;
    const view = editorViewForAutocomplete;
    if (!view) return;
    const endPos = view.state.doc.content.size;
    view.dispatch(view.state.tr.setSelection(
      view.state.selection.constructor.near(view.state.doc.resolve(endPos))
    ));
    view.focus();
  }, []);

  return (
    <div ref={wrapperRef} className="milkdown-editor-wrapper h-full w-full overflow-y-auto overflow-x-hidden" onClick={handleWrapperClick}>
      <Milkdown />
      {autocomplete.show && (
        <WikilinkAutocomplete
          notes={notesForAutocomplete}
          query={autocomplete.query}
          position={autocomplete.position}
          onSelect={handleAutocompleteSelect}
          onClose={handleAutocompleteClose}
        />
      )}
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
