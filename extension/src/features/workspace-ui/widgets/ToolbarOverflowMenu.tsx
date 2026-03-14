import { useState } from 'react';
import { Button } from '@/ui/common/Button';

interface ToolbarOverflowMenuProps {
  onNewCollection: () => void;
  onImport: () => void;
  onExport: () => void;
  hasCollections: boolean;
}

export function ToolbarOverflowMenu({
  onNewCollection,
  onImport,
  onExport,
  hasCollections,
}: ToolbarOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        aria-label="More actions"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        ⋯
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-xs flex flex-col rounded-md border border-border bg-surface-card py-xs shadow-lg z-10">
          <button
            className="px-md py-xs text-left text-sm text-content-primary hover:bg-surface-secondary"
            onClick={() => handleItemClick(onNewCollection)}
          >
            New Collection
          </button>
          <button
            className="px-md py-xs text-left text-sm text-content-primary hover:bg-surface-secondary"
            onClick={() => handleItemClick(onImport)}
          >
            Import
          </button>
          <button
            className="px-md py-xs text-left text-sm text-content-primary hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleItemClick(onExport)}
            disabled={!hasCollections}
          >
            Export
          </button>
        </div>
      )}
    </div>
  );
}
