import { useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { bracketMatching, indentUnit } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import type { Note } from '../../types';
import { useNoteStore, useWorkspaceStore, useSettingsStore } from '../../store';
import { updateNoteMetadata } from '../../services/parser';
import { debounce } from '../../utils';
import {
  editorTheme,
  wikilinkPlugin,
  wikilinkTheme,
  createWikilinkClickHandler,
  mathPlugin,
  mathTheme,
  livePreviewPlugin,
  livePreviewTheme,
  frontmatterPlugin,
  frontmatterTheme,
} from './extensions';

interface MarkdownEditorProps {
  note: Note;
}

export function MarkdownEditor({ note }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { updateNote, notes, createNote } = useNoteStore();
  const { setTabDirty, tabs, activeTabId, openNote, setEditorScrollCallback } = useWorkspaceStore();
  const { autoSave, autoSaveInterval } = useSettingsStore();

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

  // Handle wiki link navigation
  const handleWikilinkNavigate = useCallback(
    async (target: string, heading?: string, _blockId?: string) => {
      // Find existing note by title
      const existingNote = notes.find(
        n => n.title.toLowerCase() === target.toLowerCase()
      );

      if (existingNote) {
        openNote(existingNote.id, existingNote.title);

        // If there's a heading reference, scroll to it after a short delay
        if (heading) {
          setTimeout(() => {
            const headingInfo = existingNote.metadata?.headings?.find(
              h => h.text.toLowerCase() === heading.toLowerCase()
            );
            if (headingInfo && viewRef.current) {
              viewRef.current.dispatch({
                effects: EditorView.scrollIntoView(headingInfo.position, {
                  y: 'start',
                  yMargin: 50,
                }),
              });
            }
          }, 100);
        }
      } else {
        // Create new note
        const newNote = await createNote(target);
        openNote(newNote.id, newNote.title);
      }
    },
    [notes, openNote, createNote]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      history(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      indentUnit.of('    '),  // 4 spaces for indentation
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      editorTheme,
      wikilinkPlugin,
      wikilinkTheme,
      createWikilinkClickHandler(handleWikilinkNavigate),
      mathPlugin,
      mathTheme,
      livePreviewPlugin,
      livePreviewTheme,
      frontmatterPlugin,
      frontmatterTheme,
      placeholder('Start writing...'),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...searchKeymap,
        indentWithTab,
        {
          key: 'Mod-s',
          run: (view) => {
            saveNote(view.state.doc.toString());
            return true;
          },
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString();
          if (activeTab) {
            setTabDirty(activeTab.id, true);
          }
          debouncedSave(content);
        }
      }),
      EditorView.lineWrapping,
    ];

    const state = EditorState.create({
      doc: note.content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Focus the editor when a note is opened
    requestAnimationFrame(() => {
      view.focus();
    });

    return () => {
      view.destroy();
    };
  }, [note.id]); // Only recreate when note changes

  // Update content when note content changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== note.content) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: note.content,
        },
      });
    }
  }, [note.content]);

  // Register scroll callback for outline panel
  useEffect(() => {
    const scrollToPosition = (position: number) => {
      const view = viewRef.current;
      if (view) {
        view.dispatch({
          effects: EditorView.scrollIntoView(position, {
            y: 'start',
            yMargin: 50,
          }),
        });
        // Also move cursor to position
        view.dispatch({
          selection: { anchor: position },
        });
        view.focus();
      }
    };

    setEditorScrollCallback(scrollToPosition);

    return () => {
      setEditorScrollCallback(null);
    };
  }, [setEditorScrollCallback]);

  return (
    <div
      ref={editorRef}
      className="h-full w-full overflow-auto"
    />
  );
}
