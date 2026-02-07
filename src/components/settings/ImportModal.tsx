import { useState, useRef, useCallback } from 'react';
import { X, FolderOpen, ChevronDown, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import { useUIStore, useNoteStore } from '../../store';
import { parseObsidianVault, importNotes } from '../../services/import';
import type { ImportResult, ImportProgress } from '../../services/import';

type Step = 'source' | 'preview' | 'progress' | 'results';

export function ImportModal() {
  const { closeImportModal } = useUIStore();
  const folders = useNoteStore(s => s.folders);
  const createFolder = useNoteStore(s => s.createFolder);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('source');
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [vaultName, setVaultName] = useState('');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [results, setResults] = useState<{ notesCreated: number; foldersCreated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skippedExpanded, setSkippedExpanded] = useState(false);
  const [destinationMode, setDestinationMode] = useState<'root' | 'existing' | 'new'>('root');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    // Get vault name from the first file's root directory
    const firstPath = files[0].webkitRelativePath;
    const rootName = firstPath.split('/')[0];
    setVaultName(rootName);

    try {
      const result = await parseObsidianVault(files);
      if (result.notes.length === 0) {
        setError('No markdown files found in the selected folder.');
        return;
      }
      setParseResult(result);
      setStep('preview');
    } catch {
      setError('Failed to read vault files. Please try again.');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!parseResult) return;

    setStep('progress');
    setError(null);

    try {
      let parentFolderId: string | null = null;

      if (destinationMode === 'existing') {
        parentFolderId = selectedFolderId;
      } else if (destinationMode === 'new') {
        const trimmed = newFolderName.trim();
        if (!trimmed) {
          setError('Please enter a folder name.');
          setStep('preview');
          return;
        }
        const newFolder = await createFolder(trimmed);
        parentFolderId = newFolder.id;
      }

      const importResults = await importNotes(parseResult, setProgress, parentFolderId);
      setResults(importResults);
      setStep('results');
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStep('preview');
    }
  }, [parseResult, destinationMode, selectedFolderId, newFolderName, createFolder]);

  const canDismiss = step !== 'progress';

  const handleBackdropClick = () => {
    if (canDismiss) closeImportModal();
  };

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
                onClick={() => fileInputRef.current?.click()}
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
                  Vault: {vaultName}
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

              {/* Destination folder selection */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-text-primary">Destination</div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                    <input
                      type="radio"
                      name="destination"
                      checked={destinationMode === 'root'}
                      onChange={() => setDestinationMode('root')}
                      className="accent-accent"
                    />
                    Root (no parent folder)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                    <input
                      type="radio"
                      name="destination"
                      checked={destinationMode === 'existing'}
                      onChange={() => setDestinationMode('existing')}
                      className="accent-accent"
                    />
                    Existing folder
                  </label>
                  {destinationMode === 'existing' && (
                    <select
                      value={selectedFolderId ?? ''}
                      onChange={e => setSelectedFolderId(e.target.value || null)}
                      className="ml-6 w-[calc(100%-1.5rem)] px-2 py-1.5 text-sm bg-bg-tertiary border border-border-primary rounded text-text-primary"
                    >
                      <option value="">Select a folder...</option>
                      {folders
                        .slice()
                        .sort((a, b) => a.path.localeCompare(b.path))
                        .map(f => (
                          <option key={f.id} value={f.id}>{f.path}</option>
                        ))}
                    </select>
                  )}
                  <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                    <input
                      type="radio"
                      name="destination"
                      checked={destinationMode === 'new'}
                      onChange={() => setDestinationMode('new')}
                      className="accent-accent"
                    />
                    <Plus size={14} className="shrink-0" />
                    Create new folder
                  </label>
                  {destinationMode === 'new' && (
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      className="ml-6 w-[calc(100%-1.5rem)] px-2 py-1.5 text-sm bg-bg-tertiary border border-border-primary rounded text-text-primary placeholder:text-text-muted"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setStep('source'); setParseResult(null); setError(null); }}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={destinationMode === 'existing' && !selectedFolderId}
                  className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
