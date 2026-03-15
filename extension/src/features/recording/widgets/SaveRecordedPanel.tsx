import { Button } from '@/ui/common/Button';
import type { LogEntry } from '@/features/logging/types';

interface SaveRecordedPanelProps {
  entries: LogEntry[];
  onSave: () => Promise<void>;
  onDiscard: () => void;
  saving: boolean;
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-400',
  POST: 'bg-green-500/20 text-green-400',
  PUT: 'bg-yellow-500/20 text-yellow-400',
  PATCH: 'bg-orange-500/20 text-orange-400',
  DELETE: 'bg-red-500/20 text-red-400',
};

function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + '...';
}

export function SaveRecordedPanel({ entries, onSave, onDiscard, saving }: SaveRecordedPanelProps) {
  const isEmpty = entries.length === 0;

  return (
    <div className="flex flex-col gap-sm p-md rounded-lg bg-surface-card border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <h3 className="text-sm font-medium text-content-primary">Recorded Requests</h3>
          <span className="rounded-full bg-surface-secondary px-sm py-xs text-xs text-content-secondary">
            {entries.length} requests
          </span>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-content-secondary">No requests recorded</p>
      ) : (
        <ul className="flex flex-col gap-xs max-h-48 overflow-y-auto">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-sm py-xs px-sm rounded bg-surface-secondary text-sm"
            >
              <span
                className={`inline-block rounded px-xs py-0.5 text-xs font-semibold ${methodColors[entry.method] ?? 'bg-gray-500/20 text-gray-400'}`}
              >
                {entry.method}
              </span>
              <span className="flex-1 truncate text-content-primary" title={entry.url}>
                {truncateUrl(entry.url)}
              </span>
              <span className="text-xs text-content-secondary">{entry.statusCode}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-sm justify-end">
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onSave}
          loading={saving}
          disabled={isEmpty || saving}
        >
          Save as Rules
        </Button>
      </div>
    </div>
  );
}
