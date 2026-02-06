import { useState } from 'react';
import { useSettingsStore, useUIStore, useNoteStore } from '../../store';
import { X, Download, Upload, Trash2 } from 'lucide-react';

type SettingsTab = 'editor' | 'data';

export function SettingsModal() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');
  const { closeSettings } = useUIStore();
  const {
    editorFontSize,
    editorLineHeight,
    showLineNumbers,
    spellCheck,
    autoSave,
    autoSaveInterval,
    setEditorFontSize,
    setEditorLineHeight,
    setShowLineNumbers,
    setSpellCheck,
    setAutoSave,
    setAutoSaveInterval,
  } = useSettingsStore();
  const { notes, folders } = useNoteStore();

  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: notes,
      folders: folders,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noted-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.version && data.notes && data.folders) {
          // Import would need to merge with existing data
          // For now, just show confirmation
          if (confirm(`Import ${data.notes.length} notes and ${data.folders.length} folders? This will merge with existing data.`)) {
            // In a real implementation, you would call store methods to import
            alert('Import functionality would merge data here. Full implementation pending.');
          }
        } else {
          alert('Invalid backup file format');
        }
      } catch {
        alert('Failed to parse backup file');
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to delete ALL notes and folders? This cannot be undone.')) {
      if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
        // Clear IndexedDB
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
        window.location.reload();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={closeSettings}
    >
      <div
        className="w-full max-w-2xl bg-bg-secondary border border-border-primary rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
          <button
            onClick={closeSettings}
            className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex h-[400px]">
          {/* Sidebar */}
          <div className="w-40 border-r border-border-primary p-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                activeTab === 'editor'
                  ? 'bg-bg-hover text-text-primary'
                  : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                activeTab === 'data'
                  ? 'bg-bg-hover text-text-primary'
                  : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              Data & Backup
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'editor' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Editor Settings</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-text-secondary">Font Size</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="12"
                          max="24"
                          value={editorFontSize}
                          onChange={e => setEditorFontSize(parseInt(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-text-muted w-8">{editorFontSize}px</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-text-secondary">Line Height</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1.2"
                          max="2.4"
                          step="0.1"
                          value={editorLineHeight}
                          onChange={e => setEditorLineHeight(parseFloat(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-text-muted w-8">{editorLineHeight.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-text-secondary">Show Line Numbers</label>
                      <input
                        type="checkbox"
                        checked={showLineNumbers}
                        onChange={e => setShowLineNumbers(e.target.checked)}
                        className="w-4 h-4 accent-accent"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-text-secondary">Spell Check</label>
                      <input
                        type="checkbox"
                        checked={spellCheck}
                        onChange={e => setSpellCheck(e.target.checked)}
                        className="w-4 h-4 accent-accent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Auto Save</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-text-secondary">Enable Auto Save</label>
                      <input
                        type="checkbox"
                        checked={autoSave}
                        onChange={e => setAutoSave(e.target.checked)}
                        className="w-4 h-4 accent-accent"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-text-secondary">Auto Save Delay</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1000"
                          max="30000"
                          step="1000"
                          value={autoSaveInterval}
                          onChange={e => setAutoSaveInterval(parseInt(e.target.value))}
                          className="w-24"
                          disabled={!autoSave}
                        />
                        <span className="text-sm text-text-muted w-12">{autoSaveInterval / 1000}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Backup & Export</h3>

                  <div className="space-y-3">
                    <p className="text-xs text-text-muted">
                      Export all your notes and folders as a JSON backup file.
                    </p>
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                    >
                      <Download size={16} />
                      Export Backup
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Import</h3>

                  <div className="space-y-3">
                    <p className="text-xs text-text-muted">
                      Import notes and folders from a JSON backup file.
                    </p>
                    <button
                      onClick={handleImport}
                      className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary text-text-primary border border-border-primary rounded hover:bg-bg-hover transition-colors"
                    >
                      <Upload size={16} />
                      Import Backup
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Storage Info</h3>
                  <div className="text-sm text-text-secondary space-y-1">
                    <p>Notes: {notes.length}</p>
                    <p>Folders: {folders.length}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-primary">
                  <h3 className="text-sm font-medium text-red-400 mb-3">Danger Zone</h3>
                  <button
                    onClick={handleClearData}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={16} />
                    Clear All Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
