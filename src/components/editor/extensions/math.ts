import { EditorView, Decoration, WidgetType, ViewPlugin } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import katex from 'katex';

// Regex for inline math $...$ and block math $$...$$
const INLINE_MATH_REGEX = /(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g;
const BLOCK_MATH_REGEX = /\$\$\n?([\s\S]*?)\n?\$\$/g;

class MathWidget extends WidgetType {
  latex: string;
  displayMode: boolean;

  constructor(latex: string, displayMode: boolean) {
    super();
    this.latex = latex;
    this.displayMode = displayMode;
  }

  eq(other: MathWidget) {
    return other.latex === this.latex && other.displayMode === this.displayMode;
  }

  toDOM() {
    const wrapper = document.createElement('span');
    wrapper.className = this.displayMode
      ? 'cm-math-block'
      : 'cm-math-inline';

    try {
      katex.render(this.latex, wrapper, {
        displayMode: this.displayMode,
        throwOnError: false,
        output: 'html',
        strict: false,
      });
    } catch (error) {
      wrapper.className = 'cm-math-error';
      wrapper.textContent = this.latex;
    }

    return wrapper;
  }

  ignoreEvent() {
    return false;
  }
}

function getMathDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const doc = view.state.doc;
  const text = doc.toString();

  // Get selected ranges to avoid replacing math under cursor
  const selection = view.state.selection;
  const isInRange = (from: number, to: number) => {
    for (const range of selection.ranges) {
      if (range.from <= to && range.to >= from) {
        return true;
      }
    }
    return false;
  };

  // Find block math first ($$...$$)
  let match;
  BLOCK_MATH_REGEX.lastIndex = 0;
  while ((match = BLOCK_MATH_REGEX.exec(text)) !== null) {
    const from = match.index;
    const to = from + match[0].length;

    // Don't replace if cursor is inside
    if (isInRange(from, to)) continue;

    const latex = match[1].trim();
    if (latex) {
      decorations.push(
        Decoration.replace({
          widget: new MathWidget(latex, true),
        }).range(from, to)
      );
    }
  }

  // Find inline math ($...$)
  INLINE_MATH_REGEX.lastIndex = 0;
  while ((match = INLINE_MATH_REGEX.exec(text)) !== null) {
    const from = match.index;
    const to = from + match[0].length;

    // Don't replace if cursor is inside
    if (isInRange(from, to)) continue;

    // Skip if this is inside a block math (already handled)
    let isInsideBlock = false;
    for (const dec of decorations) {
      if (from >= dec.from && to <= dec.to) {
        isInsideBlock = true;
        break;
      }
    }
    if (isInsideBlock) continue;

    const latex = match[1].trim();
    if (latex) {
      decorations.push(
        Decoration.replace({
          widget: new MathWidget(latex, false),
        }).range(from, to)
      );
    }
  }

  return Decoration.set(decorations, true);
}

export const mathPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getMathDecorations(view);
    }

    update(update: { docChanged: boolean; view: EditorView; selectionSet: boolean }) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = getMathDecorations(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);

export const mathTheme = EditorView.baseTheme({
  '.cm-math-inline': {
    display: 'inline-block',
    verticalAlign: 'middle',
    padding: '0 2px',
  },
  '.cm-math-block': {
    display: 'block',
    textAlign: 'center',
    padding: '12px 0',
    margin: '8px 0',
    overflow: 'auto',
  },
  '.cm-math-error': {
    color: 'var(--text-error, #e06c75)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
    backgroundColor: 'rgba(224, 108, 117, 0.1)',
    padding: '2px 4px',
    borderRadius: '3px',
  },
  '.katex': {
    fontSize: '1.1em',
  },
  '.katex-display': {
    margin: '0',
    overflow: 'auto hidden',
  },
});
