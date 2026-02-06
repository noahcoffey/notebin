import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

const wikilinkMark = Decoration.mark({ class: 'cm-wikilink' });
const wikilinkBracket = Decoration.mark({ class: 'cm-wikilink-bracket' });

export interface WikilinkMatch {
  from: number;
  to: number;
  target: string;
  heading?: string;
  blockId?: string;
  displayText?: string;
}

export function findWikilinks(view: EditorView): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  const text = view.state.doc.toString();
  // Updated regex to capture heading and block references
  const regex = /\[\[([^\]|#]+)(?:#([^\]|^]+))?(?:\^([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const ref = match[2];
    let heading: string | undefined;
    let blockId: string | undefined;

    // Check if ref starts with ^ for block ID
    if (ref?.startsWith('^')) {
      blockId = ref.slice(1);
    } else if (ref) {
      heading = ref;
    }

    // Also check match[3] for explicit block refs
    if (match[3]) {
      blockId = match[3];
    }

    matches.push({
      from: match.index,
      to: match.index + match[0].length,
      target: match[1],
      heading,
      blockId,
      displayText: match[4],
    });
  }

  return matches;
}

export function findWikilinkAtPos(view: EditorView, pos: number): WikilinkMatch | null {
  const matches = findWikilinks(view);
  return matches.find(m => pos >= m.from && pos <= m.to) || null;
}

function wikilinkDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const matches = findWikilinks(view);

  for (const match of matches) {
    // Opening brackets [[
    builder.add(match.from, match.from + 2, wikilinkBracket);

    // Link content
    builder.add(match.from + 2, match.to - 2, wikilinkMark);

    // Closing brackets ]]
    builder.add(match.to - 2, match.to, wikilinkBracket);
  }

  return builder.finish();
}

export const wikilinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = wikilinkDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = wikilinkDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export const wikilinkTheme = EditorView.baseTheme({
  '.cm-wikilink': {
    color: 'var(--link)',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '.cm-wikilink-bracket': {
    color: 'var(--text-muted)',
  },
  '.cm-wikilink-unresolved': {
    color: 'var(--link-unresolved)',
  },
});

// Click handler for wiki links
export function createWikilinkClickHandler(
  onNavigate: (target: string, heading?: string, blockId?: string) => void
) {
  return EditorView.domEventHandlers({
    click(event, view) {
      // Check for Cmd/Ctrl click or just regular click
      if (event.metaKey || event.ctrlKey) {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
          const link = findWikilinkAtPos(view, pos);
          if (link) {
            event.preventDefault();
            onNavigate(link.target, link.heading, link.blockId);
            return true;
          }
        }
      }
      return false;
    },
  });
}
