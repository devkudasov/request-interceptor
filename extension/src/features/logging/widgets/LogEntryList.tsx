import { Badge } from '@/ui/common/Badge';
import { methodColors } from '@/ui/theme/tokens';
import type { LogEntry } from '@/features/logging';

interface LogEntryListProps {
  entries: LogEntry[];
}

export function LogEntryList({ entries }: LogEntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <p className="text-center py-lg text-content-secondary text-sm">
          No requests captured yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-xs px-sm py-xs border-b border-border text-xs font-mono"
          >
            <Badge color={methodColors[entry.method] ?? '#6B7280'}>
              {entry.method}
            </Badge>
            <span className="flex-1 truncate text-content-primary">
              {entry.url}
            </span>
            <Badge variant={entry.mocked ? 'success' : 'info'}>
              {entry.mocked ? 'MOCKED' : 'REAL'}
            </Badge>
            <span
              className={
                entry.statusCode >= 400
                  ? 'text-status-error'
                  : 'text-content-secondary'
              }
            >
              {entry.statusCode}
            </span>
            <span className="text-content-muted">{entry.duration}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
