import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { noteStorage } from '../../services/storage';
import type { Note } from '../../types';
import { FileText, ArrowLeft, Loader2 } from 'lucide-react';

// Configure marked for GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function SharedNoteView() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNote() {
      if (!id) {
        setError('No note ID provided');
        setLoading(false);
        return;
      }

      try {
        const fetchedNote = await noteStorage.getByIdPublic(id);
        if (fetchedNote) {
          setNote(fetchedNote);
        } else {
          setError('Note not found or is not public');
        }
      } catch (err) {
        console.error('Error fetching note:', err);
        setError('Failed to load note');
      }
      setLoading(false);
    }

    fetchNote();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-muted">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading note...</span>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
        <FileText size={48} className="text-text-muted opacity-50" />
        <h1 className="text-xl text-text-primary">{error || 'Note not found'}</h1>
        <p className="text-text-muted">This note may be private, deleted, or the link is invalid.</p>
        <Link
          to="/"
          className="flex items-center gap-2 mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <ArrowLeft size={16} />
          Go to noteb.in
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-bg-primary overflow-y-auto">
      <header className="border-b border-border-primary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-accent" />
            <span className="font-semibold text-text-primary">noteb.in</span>
          </div>
          <Link
            to="/"
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Create your own notes
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">{note.title}</h1>
        <p className="text-sm text-text-muted mb-8">
          Last updated {note.updatedAt.toLocaleDateString()}
        </p>

        <article
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(note.content) as string) }}
        />
      </main>

      <style>{`
        .prose {
          color: var(--text-primary);
          line-height: 1.7;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: var(--text-primary);
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .prose h1 { font-size: 2em; }
        .prose > h1:first-child { margin-top: 0.75em; }
        .prose h2 { font-size: 1.5em; }
        .prose h3 { font-size: 1.25em; }
        .prose p { margin: 0.75em 0; }
        .prose a { color: var(--accent); }
        .prose a:hover { text-decoration: underline; }
        .prose code {
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .prose blockquote {
          border-left: 3px solid var(--accent);
          padding-left: 1em;
          color: var(--text-secondary);
          font-style: italic;
          margin: 1em 0;
        }
        .prose ul {
          list-style: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .prose li { margin: 0.25em 0; }
        .prose hr {
          border: none;
          border-top: 1px solid var(--border-primary);
          margin: 2em 0;
        }
        .prose strong { font-weight: 700; }
        .prose del { color: var(--text-muted); }
        .task-item {
          display: flex;
          align-items: center;
          gap: 0.5em;
          margin: 0.25em 0;
        }
        .task-item.checked {
          opacity: 0.6;
          text-decoration: line-through;
        }
        .task-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }
      `}</style>
    </div>
  );
}
