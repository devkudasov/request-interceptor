import { useState } from 'react';
import { Button } from '@/ui/common/Button';

interface RecordPopoverProps {
  tabs: chrome.tabs.Tab[];
  onStartRecording: (tabId: number) => void;
  onClose: () => void;
}

export function RecordPopover({ tabs, onStartRecording, onClose }: RecordPopoverProps) {
  const [selectedTabId, setSelectedTabId] = useState<string>(
    tabs.length > 0 ? String(tabs[0].id) : '',
  );

  const handleStart = () => {
    if (selectedTabId) {
      onStartRecording(Number(selectedTabId));
    }
  };

  return (
    <div className="flex flex-col gap-sm p-md rounded-lg bg-surface-card border border-border">
      <h3 className="text-sm font-medium text-content-primary">Record API Responses</h3>

      {tabs.length === 0 ? (
        <p className="text-sm text-content-secondary">No tabs available</p>
      ) : (
        <select
          className="w-full rounded-md border border-border bg-surface-secondary px-sm py-xs text-sm text-content-primary"
          value={selectedTabId}
          onChange={(e) => setSelectedTabId(e.target.value)}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={String(tab.id)}>
              {tab.title}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-sm justify-end">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleStart}
          disabled={tabs.length === 0}
        >
          Start Recording
        </Button>
      </div>
    </div>
  );
}
