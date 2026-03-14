import { useState } from 'react';

interface NewCollectionModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function NewCollectionModal({ onClose, onCreate }: NewCollectionModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-primary border border-border rounded-lg p-md w-80">
        <h3 className="text-sm font-medium mb-sm">New Collection</h3>
        <input
          autoFocus
          className="w-full border border-border rounded px-sm py-xs text-sm mb-sm"
          placeholder="Collection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <div className="flex gap-xs justify-end">
          <button className="text-sm px-sm py-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            className="text-sm px-sm py-xs bg-primary text-white rounded"
            onClick={handleSubmit}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
