import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { noteStorage } from '../../services/storage';

async function wikilinkCompletions(context: CompletionContext): Promise<CompletionResult | null> {
  const before = context.matchBefore(/\[\[[^\]]*$/);
  if (!before) return null;

  const query = before.text.slice(2); // Remove [[
  const notes = await noteStorage.getAllTitles();

  const filtered = query
    ? notes.filter(n => n.title.toLowerCase().includes(query.toLowerCase()))
    : notes;

  return {
    from: before.from + 2, // After [[
    options: filtered.map(note => ({
      label: note.title,
      type: 'text',
      apply: `${note.title}]]`,
      detail: note.path,
    })),
    validFor: /^[^\]]*$/,
  };
}

export const wikilinkAutocomplete = autocompletion({
  override: [wikilinkCompletions],
  defaultKeymap: true,
  maxRenderedOptions: 10,
  icons: false,
});
