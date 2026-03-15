import { Badge } from '@/ui/common/Badge';
import { methodColors } from '@/ui/theme/tokens';
import { ShieldIcon, GlobeIcon } from '@/ui/icons';
import type { LogEntry } from '@/features/logging';

function getStatusColor(code: number): string {
  if (code >= 500) return 'text-red-700';
  if (code >= 400) return 'text-status-error';
  if (code >= 300) return 'text-yellow-500';
  if (code >= 200) return 'text-green-500';
  return 'text-blue-400';
}

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
            {entry.mocked ? (
              <ShieldIcon className="shrink-0" />
            ) : (
              <GlobeIcon className="shrink-0" />
            )}
            <span className={getStatusColor(entry.statusCode)}>
              {entry.statusCode}
            </span>
            <span className="text-content-muted">{entry.duration}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
