import { useEffect, useRef, useState } from 'react';
import { useCollectionsStore, useRulesStore } from '@/shared/store';
import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';
import { Toggle } from '@/ui/common/Toggle';
import { Modal } from '@/ui/common/Modal';
import { Spinner } from '@/ui/common/Spinner';
import { exportCollections, downloadJson, parseImportFile, resolveConflicts } from '@/shared/import-export';
import type { ConflictResolution, ImportResult } from '@/shared/import-export';

export function CollectionsPage() {
  const { collections, loading, fetchCollections, createCollection, deleteCollection, toggleCollection } = useCollectionsStore();
  const { rules, fetchRules } = useRulesStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCollection(newName.trim());
    setNewName('');
    setShowNew(false);
  };

  const handleDelete = (id: string) => {
    const rulesInCollection = rules.filter((r) => r.collectionId === id);
    const msg = rulesInCollection.length > 0
      ? `Delete collection with ${rulesInCollection.length} rules?`
      : 'Delete this collection?';
    if (confirm(msg)) deleteCollection(id);
  };

  const handleExport = () => {
    const data = exportCollections(collections, rules);
    downloadJson(data, `request-interceptor-export-${Date.now()}.json`);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseImportFile(reader.result as string, collections);
        if (result.conflicts.length > 0) {
          setImportResult(result);
          setResolutions(new Map(result.conflicts.map((c) => [c.importedId, 'skip' as const])));
        } else {
          applyImport(result, new Map());
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to parse import file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const applyImport = async (result: ImportResult, res: Map<string, ConflictResolution>) => {
    const { collections: finalCols, rules: finalRules } = resolveConflicts(result, res, collections, rules);
    await chrome.storage.local.set({ collections: finalCols, rules: finalRules });
    await fetchCollections();
    await fetchRules();
    setImportResult(null);
  };

  const getRuleCount = (id: string) => rules.filter((r) => r.collectionId === id).length;

  const rootCollections = collections.filter((c) => !c.parentId);
  const getChildren = (parentId: string) => collections.filter((c) => c.parentId === parentId);

  if (loading) {
    return <div className="flex justify-center py-2xl"><Spinner /></div>;
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collections</h2>
        <div className="flex gap-xs">
          <Button variant="ghost" size="sm" onClick={handleImportClick}>Import</Button>
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={collections.length === 0}>Export</Button>
          <Button size="sm" onClick={() => setShowNew(true)}>+ New</Button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

      {collections.length === 0 && (
        <p className="text-center py-lg text-content-secondary text-base">
          No collections yet. Create one to organize your mocks.
        </p>
      )}

      <div className="flex flex-col gap-xs">
        {rootCollections.map((col) => (
          <div key={col.id}>
            <div className="flex items-center gap-sm bg-surface-card border border-border rounded-md p-sm">
              <Toggle checked={col.enabled} onChange={() => toggleCollection(col.id)} />
              <span className="flex-1 text-base font-medium">{col.name}</span>
              <span className="text-sm text-content-muted">{getRuleCount(col.id)} rules</span>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(col.id)}>Del</Button>
            </div>
            {getChildren(col.id).map((child) => (
              <div key={child.id} className="flex items-center gap-sm bg-surface-card border border-border rounded-md p-sm ml-lg mt-xs">
                <Toggle checked={child.enabled} onChange={() => toggleCollection(child.id)} />
                <span className="flex-1 text-base">{child.name}</span>
                <span className="text-sm text-content-muted">{getRuleCount(child.id)} rules</span>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(child.id)}>Del</Button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Collection">
        <div className="flex flex-col gap-md">
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My Collection" autoFocus />
          <div className="flex justify-end gap-sm">
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!importResult} onClose={() => setImportResult(null)} title="Import Conflicts">
        <div className="flex flex-col gap-md">
          <p className="text-sm text-content-secondary">
            {importResult?.conflicts.length} collection(s) already exist. Choose how to handle each:
          </p>
          {importResult?.conflicts.map((conflict) => (
            <div key={conflict.importedId} className="flex flex-col gap-xs bg-surface-primary rounded-md p-sm">
              <span className="font-medium text-base">{conflict.name}</span>
              <div className="flex gap-xs">
                {(['skip', 'merge', 'replace'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setResolutions((prev) => new Map(prev).set(conflict.importedId, opt))}
                    className={`px-sm py-xs text-sm rounded-md border ${
                      resolutions.get(conflict.importedId) === opt
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-content-secondary'
                    }`}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-sm">
            <Button variant="secondary" onClick={() => setImportResult(null)}>Cancel</Button>
            <Button onClick={() => importResult && applyImport(importResult, resolutions)}>Apply</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
