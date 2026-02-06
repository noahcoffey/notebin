import { EditorView, Decoration, ViewPlugin } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';

// Regex to match YAML frontmatter at the start of document
const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---/;

function getFrontmatterDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const doc = view.state.doc;
  const text = doc.toString();

  const match = text.match(FRONTMATTER_REGEX);
  if (match && match.index === 0) {
    const from = 0;
    const to = match[0].length;

    // Add a line decoration to the entire frontmatter block
    decorations.push(
      Decoration.mark({ class: 'cm-frontmatter' }).range(from, to)
    );

    // Parse and style individual YAML elements
    const lines = match[0].split('\n');
    let lineStart = 0;

    for (const line of lines) {
      if (line === '---') {
        // Style the delimiters
        decorations.push(
          Decoration.mark({ class: 'cm-frontmatter-delimiter' }).range(lineStart, lineStart + 3)
        );
      } else {
        // Style key: value pairs
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          // Style key
          decorations.push(
            Decoration.mark({ class: 'cm-frontmatter-key' }).range(lineStart, lineStart + colonIndex)
          );
          // Style value
          if (colonIndex + 1 < line.length) {
            decorations.push(
              Decoration.mark({ class: 'cm-frontmatter-value' }).range(
                lineStart + colonIndex + 1,
                lineStart + line.length
              )
            );
          }
        }
      }

      lineStart += line.length + 1; // +1 for newline
    }
  }

  return Decoration.set(decorations, true);
}

export const frontmatterPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getFrontmatterDecorations(view);
    }

    update(update: { docChanged: boolean; view: EditorView }) {
      if (update.docChanged) {
        this.decorations = getFrontmatterDecorations(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);

export const frontmatterTheme = EditorView.baseTheme({
  '.cm-frontmatter': {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '4px',
    display: 'block',
    marginBottom: '8px',
  },
  '.cm-frontmatter-delimiter': {
    color: 'var(--text-faint)',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-frontmatter-key': {
    color: '#e06c75',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
  },
  '.cm-frontmatter-value': {
    color: '#98c379',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
  },
});
