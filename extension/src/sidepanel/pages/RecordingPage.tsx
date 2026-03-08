import { useEffect, useState } from 'react';
import { useRecordingStore, useTabsStore, useCollectionsStore, useRulesStore } from '@/shared/store';
import { Button } from '@/ui/common/Button';
import { Badge } from '@/ui/common/Badge';
import { Select } from '@/ui/common/Select';
import { Input } from '@/ui/common/Input';
import { Modal } from '@/ui/common/Modal';
import { methodColors } from '@/ui/theme/tokens';
import type { HttpMethod } from '@/shared/types';

export function RecordingPage() {
  const { isRecording, recordedEntries, startRecording, stopRecording } = useRecordingStore();
  const { tabs, activeTabIds, fetchTabs } = useTabsStore();
  const { createCollection } = useCollectionsStore();
  const { createRule } = useRulesStore();

  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [collectionName, setCollectionName] = useState('Recorded Mocks');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  useEffect(() => {
    if (tabs.length > 0 && !selectedTabId) {
      const preferred = tabs.find((t) => activeTabIds.includes(t.id!));
      setSelectedTabId(preferred?.id ?? tabs[0]?.id ?? null);
    }
  }, [tabs, activeTabIds, selectedTabId]);

  const handleStart = async () => {
    if (!selectedTabId) return;
    await startRecording(selectedTabId);
  };

  const handleStop = async () => {
    const entries = await stopRecording();
    if (entries.length > 0) {
      setSelectedEntries(new Set(entries.map((e) => e.id)));
      setShowSave(true);
    }
  };

  const toggleEntry = (id: string) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const entriesToSave = recordedEntries.filter((e) => selectedEntries.has(e.id));
    const collection = await createCollection(collectionName);

    for (const entry of entriesToSave) {
      await createRule({
        enabled: true,
        collectionId: collection.id,
        urlPattern: new URL(entry.url).pathname,
        urlMatchType: 'exact',
        method: entry.method as HttpMethod,
        requestType: 'http',
        statusCode: entry.statusCode,
        responseType: 'json',
        responseBody: entry.responseBody ?? '{}',
        responseHeaders: entry.responseHeaders ?? {},
        delay: 0,
      });
    }

    setSaving(false);
    setShowSave(false);
  };

  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-lg font-semibold">Record Responses</h2>

      {!isRecording && recordedEntries.length === 0 && (
        <div className="flex flex-col gap-md">
          <p className="text-sm text-content-secondary">
            Record real API responses from a tab and save them as mock rules.
          </p>
          {tabs.length === 0 ? (
            <p className="text-sm text-content-muted">
              No tabs available for recording.
            </p>
          ) : (
            <>
              <Select
                label="Tab to record"
                value={String(selectedTabId ?? '')}
                onChange={(value) => setSelectedTabId(Number(value))}
                options={tabs.map((t) => ({ value: String(t.id), label: t.title ?? `Tab ${t.id}` }))}
              />
              <Button onClick={handleStart} disabled={!selectedTabId}>
                Start Recording
              </Button>
            </>
          )}
        </div>
      )}

      {isRecording && (
        <div className="flex flex-col gap-md items-center">
          <div className="flex items-center gap-sm">
            <span className="w-3 h-3 rounded-full bg-status-error animate-pulse" />
            <span className="text-base font-medium">Recording...</span>
          </div>
          <p className="text-sm text-content-secondary">
            Browse the page normally. Non-mocked responses will be captured.
          </p>
          <Button variant="danger" onClick={handleStop}>Stop Recording</Button>
        </div>
      )}

      {!isRecording && recordedEntries.length > 0 && !showSave && (
        <div className="flex flex-col gap-md">
          <p className="text-sm text-content-secondary">
            Captured {recordedEntries.length} responses.
          </p>
          <Button onClick={() => {
            setSelectedEntries(new Set(recordedEntries.map((e) => e.id)));
            setShowSave(true);
          }}>
            Save as Mock Rules
          </Button>
        </div>
      )}

      <Modal open={showSave} onClose={() => setShowSave(false)} title="Save Recorded Responses">
        <div className="flex flex-col gap-md max-h-96 overflow-y-auto">
          <Input
            label="Collection name"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
          />
          <p className="text-sm text-content-secondary">
            Select responses to save as rules ({selectedEntries.size}/{recordedEntries.length}):
          </p>
          <div className="flex flex-col gap-xs">
            {recordedEntries.map((entry) => (
              <label key={entry.id} className="flex items-center gap-sm bg-surface-primary rounded-md p-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEntries.has(entry.id)}
                  onChange={() => toggleEntry(entry.id)}
                  className="accent-primary"
                />
                <Badge color={methodColors[entry.method] ?? '#6B7280'}>{entry.method}</Badge>
                <span className="flex-1 font-mono text-xs truncate">{entry.url}</span>
                <span className="text-xs text-content-muted">{entry.statusCode}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-sm">
            <Button variant="secondary" onClick={() => setShowSave(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={selectedEntries.size === 0 || saving || !collectionName.trim()}>
              {saving ? 'Saving...' : `Save ${selectedEntries.size} Rules`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
