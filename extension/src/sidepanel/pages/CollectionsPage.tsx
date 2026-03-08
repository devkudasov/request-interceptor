import { useEffect, useState } from 'react';
import { useCollectionsStore, useRulesStore } from '@/shared/store';
import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';
import { Toggle } from '@/ui/common/Toggle';
import { Modal } from '@/ui/common/Modal';
import { Spinner } from '@/ui/common/Spinner';

export function CollectionsPage() {
  const { collections, loading, fetchCollections, createCollection, deleteCollection, toggleCollection } = useCollectionsStore();
  const { rules } = useRulesStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

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
        <Button size="sm" onClick={() => setShowNew(true)}>+ New</Button>
      </div>

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
    </div>
  );
}
