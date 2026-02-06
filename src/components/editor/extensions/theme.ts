import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export const obsidianTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'var(--font-text)',
    fontSize: 'var(--editor-font-size)',
    lineHeight: '1.6',
    padding: '20px 40px',
    caretColor: 'var(--accent)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent)',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--accent)',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(124, 138, 255, 0.3) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(124, 138, 255, 0.3) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-faint)',
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    minWidth: '3em',
    padding: '0 4px',
    textAlign: 'right',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-foldGutter': {
    width: '16px',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul': {
      fontFamily: 'var(--font-ui)',
      fontSize: '13px',
      maxHeight: '250px',
    },
    '& > ul > li': {
      padding: '4px 8px',
    },
    '& > ul > li[aria-selected]': {
      backgroundColor: 'var(--bg-hover)',
      color: 'var(--text-primary)',
    },
  },
  '.cm-placeholder': {
    color: 'var(--text-faint)',
    fontStyle: 'italic',
  },
});

export const obsidianHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: '700', fontSize: '1.6em', color: 'var(--text-primary)' },
  { tag: tags.heading2, fontWeight: '600', fontSize: '1.4em', color: 'var(--text-primary)' },
  { tag: tags.heading3, fontWeight: '600', fontSize: '1.2em', color: 'var(--text-primary)' },
  { tag: tags.heading4, fontWeight: '600', fontSize: '1.1em', color: 'var(--text-primary)' },
  { tag: tags.heading5, fontWeight: '600', fontSize: '1em', color: 'var(--text-primary)' },
  { tag: tags.heading6, fontWeight: '600', fontSize: '0.9em', color: 'var(--text-secondary)' },
  { tag: tags.strong, fontWeight: 'bold', color: 'var(--text-primary)' },
  { tag: tags.emphasis, fontStyle: 'italic', color: 'var(--text-primary)' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: 'var(--text-muted)' },
  { tag: tags.link, color: 'var(--link)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--link)' },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 4px', borderRadius: '3px' },
  { tag: tags.quote, color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '3px solid var(--border-primary)', paddingLeft: '12px' },
  { tag: tags.list, color: 'var(--text-primary)' },
  { tag: tags.meta, color: 'var(--text-muted)' },
  { tag: tags.comment, color: 'var(--text-faint)', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#c678dd' },
  { tag: tags.string, color: '#98c379' },
  { tag: tags.number, color: '#d19a66' },
  { tag: tags.bool, color: '#d19a66' },
  { tag: tags.null, color: '#d19a66' },
  { tag: tags.operator, color: '#56b6c2' },
  { tag: tags.className, color: '#e5c07b' },
  { tag: tags.function(tags.variableName), color: '#61afef' },
  { tag: tags.propertyName, color: '#e06c75' },
  { tag: tags.typeName, color: '#e5c07b' },
  { tag: tags.attributeName, color: '#d19a66' },
  { tag: tags.attributeValue, color: '#98c379' },
  { tag: tags.processingInstruction, color: 'var(--text-muted)' },
]);

export const editorTheme: Extension = [
  obsidianTheme,
  syntaxHighlighting(obsidianHighlightStyle),
];
