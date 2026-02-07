import { useState, useRef, useCallback } from 'react';
import { X, FolderOpen, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { useUIStore } from '../../store';
import { parseObsidianVault, parseBearExport, importNotes } from '../../services/import';
import type { ImportResult, ImportProgress } from '../../services/import';

type Step = 'source' | 'preview' | 'progress' | 'results';
type ImportSource = 'obsidian' | 'bear';

export function ImportModal() {
  const { closeImportModal } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('source');
  const [importSource, setImportSource] = useState<ImportSource | null>(null);
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [vaultName, setVaultName] = useState('');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [results, setResults] = useState<{ notesCreated: number; foldersCreated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skippedExpanded, setSkippedExpanded] = useState(false);

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    // Get folder name from the first file's root directory
    const firstPath = files[0].webkitRelativePath;
    const rootName = firstPath.split('/')[0];
    setVaultName(rootName);

    try {
      const result = importSource === 'bear'
        ? await parseBearExport(files)
        : await parseObsidianVault(files);
      if (result.notes.length === 0) {
        setError('No markdown files found in the selected folder.');
        return;
      }
      setParseResult(result);
      setStep('preview');
    } catch {
      setError('Failed to read files. Please try again.');
    }
  }, [importSource]);

  const handleSourceSelect = useCallback((source: ImportSource) => {
    setImportSource(source);
    // Need a microtask so the state update for importSource is picked up by handleFolderSelect
    setTimeout(() => fileInputRef.current?.click(), 0);
  }, []);

  const handleImport = useCallback(async () => {
    if (!parseResult) return;

    setStep('progress');
    setError(null);

    try {
      const importResults = await importNotes(parseResult, setProgress);
      setResults(importResults);
      setStep('results');
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStep('preview');
    }
  }, [parseResult]);

  const canDismiss = step !== 'progress';

  const handleBackdropClick = () => {
    if (canDismiss) closeImportModal();
  };

  const sourceLabel = importSource === 'bear' ? 'Bear Export' : 'Vault';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg mx-4 bg-bg-secondary border border-border-primary rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <h2 className="text-lg font-semibold text-text-primary">Import Notes</h2>
          {canDismiss && (
            <button
              onClick={closeImportModal}
              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is not in React's type definitions
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={handleFolderSelect}
          />

          {step === 'source' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Choose an import source to bring your existing notes into the app.
              </p>
              <button
                onClick={() => handleSourceSelect('obsidian')}
                className="w-full flex items-center gap-3 p-4 border border-border-primary rounded-lg hover:bg-bg-hover transition-colors text-left"
              >
                <div className="p-2 bg-bg-tertiary rounded-lg">
                  <FolderOpen size={20} className="text-text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Obsidian Vault</div>
                  <div className="text-xs text-text-muted">Select your vault folder to import markdown notes</div>
                </div>
              </button>

              <button
                onClick={() => handleSourceSelect('bear')}
                className="w-full flex items-center gap-3 p-4 border border-border-primary rounded-lg hover:bg-bg-hover transition-colors text-left"
              >
                <div className="p-2 bg-bg-tertiary rounded-lg">
                  <FolderOpen size={20} className="text-text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Bear</div>
                  <div className="text-xs text-text-muted">Select a folder of exported Bear markdown notes</div>
                </div>
              </button>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-text-primary">
                  {sourceLabel}: {vaultName}
                </div>
                <div className="text-sm text-text-secondary space-y-1">
                  <p>{parseResult.notes.length} note{parseResult.notes.length !== 1 ? 's' : ''}</p>
                  <p>{parseResult.folders.length} folder{parseResult.folders.length !== 1 ? 's' : ''}</p>
                  {parseResult.skipped.length > 0 && (
                    <p className="text-text-muted">{parseResult.skipped.length} file{parseResult.skipped.length !== 1 ? 's' : ''} will be skipped</p>
                  )}
                </div>
              </div>

              {parseResult.skipped.length > 0 && (
                <div>
                  <button
                    onClick={() => setSkippedExpanded(!skippedExpanded)}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
                  >
                    {skippedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Skipped files
                  </button>
                  {skippedExpanded && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-text-muted space-y-1 pl-4">
                      {parseResult.skipped.map((s, i) => (
                        <div key={i} className="truncate" title={`${s.path} — ${s.reason}`}>
                          {s.path} — {s.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setStep('source'); setParseResult(null); setError(null); setImportSource(null); }}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                >
                  Import
                </button>
              </div>
            </div>
          )}

          {step === 'progress' && progress && (
            <div className="space-y-4">
              <div className="text-sm text-text-secondary">
                {progress.phase === 'folders'
                  ? `Creating folders... (${progress.current}/${progress.total})`
                  : `Importing notes... (${progress.current}/${progress.total})`}
              </div>
              <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-150"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
              <div className="text-xs text-text-muted truncate">
                {progress.currentItem}
              </div>
            </div>
          )}

          {step === 'results' && results && (
            <div className="space-y-4">
              <div className="text-sm text-text-secondary space-y-1">
                <p>
                  Imported {results.notesCreated} note{results.notesCreated !== 1 ? 's' : ''} in {results.foldersCreated} folder{results.foldersCreated !== 1 ? 's' : ''}.
                  {results.skipped > 0 && ` ${results.skipped} file${results.skipped !== 1 ? 's' : ''} skipped.`}
                </p>
              </div>

              {results.skipped > 0 && parseResult?.skipped && parseResult.skipped.length > 0 && (
                <div>
                  <button
                    onClick={() => setSkippedExpanded(!skippedExpanded)}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
                  >
                    {skippedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Skipped files
                  </button>
                  {skippedExpanded && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-text-muted space-y-1 pl-4">
                      {parseResult.skipped.map((s, i) => (
                        <div key={i} className="truncate" title={`${s.path} — ${s.reason}`}>
                          {s.path} — {s.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={closeImportModal}
                  className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
