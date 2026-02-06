import { EditorView, Decoration, WidgetType, ViewPlugin } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';

// Inline formatting patterns
const BOLD_REGEX = /\*\*([^*]+)\*\*/g;
const ITALIC_REGEX = /(?<!\*)(\*|_)([^*_]+)\1(?!\*)/g;
const STRIKETHROUGH_REGEX = /~~([^~]+)~~/g;
const INLINE_CODE_REGEX = /`([^`\n]+)`/g;
const HIGHLIGHT_REGEX = /==([^=]+)==/g;

class HiddenWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-hidden-syntax';
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

class CheckboxWidget extends WidgetType {
  checked: boolean;
  pos: number;

  constructor(checked: boolean, pos: number) {
    super();
    this.checked = checked;
    this.pos = pos;
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.pos === this.pos;
  }

  toDOM(view: EditorView) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.checked;
    checkbox.className = 'cm-task-checkbox';
    checkbox.setAttribute('aria-label', this.checked ? 'Completed task' : 'Incomplete task');

    checkbox.addEventListener('click', (e) => {
      e.preventDefault();
      const newChar = this.checked ? ' ' : 'x';
      view.dispatch({
        changes: { from: this.pos + 1, to: this.pos + 2, insert: newChar }
      });
    });

    return checkbox;
  }

  ignoreEvent() {
    return false;
  }
}

function getLivePreviewDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const doc = view.state.doc;
  const selection = view.state.selection;

  // Check if cursor is on a given line
  const cursorLines = new Set<number>();
  for (const range of selection.ranges) {
    const startLine = doc.lineAt(range.from).number;
    const endLine = doc.lineAt(range.to).number;
    for (let line = startLine; line <= endLine; line++) {
      cursorLines.add(line);
    }
  }

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const lineText = line.text;
    const hasCursor = cursorLines.has(i);

    // Task list checkboxes: - [ ] or - [x] - replace [ ] with interactive checkbox
    const taskMatch = lineText.match(/^(\s*)([-*+])(\s+)\[([ xX])\]/);
    if (taskMatch && !hasCursor) {
      const checkboxStart = line.from + taskMatch[1].length + taskMatch[2].length + taskMatch[3].length;
      const checkboxEnd = checkboxStart + 3; // [ ] or [x]
      const isChecked = taskMatch[4].toLowerCase() === 'x';

      decorations.push(
        Decoration.replace({
          widget: new CheckboxWidget(isChecked, checkboxStart),
        }).range(checkboxStart, checkboxEnd)
      );

      // Add class to the line for styling completed tasks
      if (isChecked) {
        decorations.push(
          Decoration.line({
            attributes: { class: 'cm-task-checked' }
          }).range(line.from)
        );
      }
    }

    // Skip remaining inline decorations for lines with cursor
    if (hasCursor) continue;

    // Hide heading markers (e.g., ### becomes styled without #)
    const headingMatch = lineText.match(/^(#{1,6})\s/);
    if (headingMatch) {
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(line.from, line.from + headingMatch[1].length + 1)
      );
    }

    // Process inline formatting
    let match;

    // Bold **text**
    BOLD_REGEX.lastIndex = 0;
    while ((match = BOLD_REGEX.exec(lineText)) !== null) {
      const from = line.from + match.index;
      // Hide opening **
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from, from + 2)
      );
      // Hide closing **
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from + match[0].length - 2, from + match[0].length)
      );
      // Style the content
      decorations.push(
        Decoration.mark({ class: 'cm-live-bold' }).range(from + 2, from + match[0].length - 2)
      );
    }

    // Strikethrough ~~text~~
    STRIKETHROUGH_REGEX.lastIndex = 0;
    while ((match = STRIKETHROUGH_REGEX.exec(lineText)) !== null) {
      const from = line.from + match.index;
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from, from + 2)
      );
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from + match[0].length - 2, from + match[0].length)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-live-strikethrough' }).range(from + 2, from + match[0].length - 2)
      );
    }

    // Highlight ==text==
    HIGHLIGHT_REGEX.lastIndex = 0;
    while ((match = HIGHLIGHT_REGEX.exec(lineText)) !== null) {
      const from = line.from + match.index;
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from, from + 2)
      );
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from + match[0].length - 2, from + match[0].length)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-live-highlight' }).range(from + 2, from + match[0].length - 2)
      );
    }

    // Italic *text* or _text_ (but not inside bold)
    const lineWithoutBold = lineText.replace(/\*\*[^*]+\*\*/g, match => ' '.repeat(match.length));
    ITALIC_REGEX.lastIndex = 0;
    while ((match = ITALIC_REGEX.exec(lineWithoutBold)) !== null) {
      const from = line.from + match.index;
      // Hide opening marker
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from, from + 1)
      );
      // Hide closing marker
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from + match[0].length - 1, from + match[0].length)
      );
      // Style the content
      decorations.push(
        Decoration.mark({ class: 'cm-live-italic' }).range(from + 1, from + match[0].length - 1)
      );
    }

    // Inline code `text`
    INLINE_CODE_REGEX.lastIndex = 0;
    while ((match = INLINE_CODE_REGEX.exec(lineText)) !== null) {
      const from = line.from + match.index;
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from, from + 1)
      );
      decorations.push(
        Decoration.replace({
          widget: new HiddenWidget(),
        }).range(from + match[0].length - 1, from + match[0].length)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-live-code' }).range(from + 1, from + match[0].length - 1)
      );
    }
  }

  // Sort by from position to avoid overlapping issues
  decorations.sort((a, b) => a.from - b.from);

  return Decoration.set(decorations, true);
}

export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getLivePreviewDecorations(view);
    }

    update(update: { docChanged: boolean; view: EditorView; selectionSet: boolean }) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = getLivePreviewDecorations(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);

export const livePreviewTheme = EditorView.baseTheme({
  '.cm-hidden-syntax': {
    display: 'none',
  },
  '.cm-live-bold': {
    fontWeight: 'bold',
  },
  '.cm-live-italic': {
    fontStyle: 'italic',
  },
  '.cm-live-strikethrough': {
    textDecoration: 'line-through',
    color: 'var(--text-muted)',
  },
  '.cm-live-highlight': {
    backgroundColor: 'rgba(255, 208, 0, 0.4)',
    borderRadius: '2px',
    padding: '0 2px',
  },
  '.cm-live-code': {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '2px 4px',
    borderRadius: '3px',
  },
  '.cm-task-checkbox': {
    appearance: 'none',
    width: '14px',
    height: '14px',
    border: '2px solid var(--text-muted)',
    borderRadius: '3px',
    backgroundColor: 'transparent',
    verticalAlign: 'middle',
    marginRight: '6px',
    cursor: 'pointer',
    position: 'relative',
    top: '-1px',
  },
  '.cm-task-checkbox:checked': {
    backgroundColor: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
  '.cm-task-checkbox:checked::after': {
    content: '""',
    position: 'absolute',
    left: '3px',
    top: '0px',
    width: '4px',
    height: '8px',
    border: 'solid white',
    borderWidth: '0 2px 2px 0',
    transform: 'rotate(45deg)',
  },
  '.cm-task-checked': {
    opacity: '0.6',
  },
});
