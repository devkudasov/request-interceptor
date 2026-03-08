import { useEffect } from 'react';
import { useLogStore } from '@/shared/store';
import { Button } from '@/ui/common/Button';
import { Badge } from '@/ui/common/Badge';
import { methodColors } from '@/ui/theme/tokens';

export function RequestLogPage() {
  const { entries, paused, fetchLog, clearLog, togglePause } = useLogStore();

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const handleClear = () => {
    if (confirm('Clear all log entries?')) clearLog();
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Request Log</h2>
        <div className="flex gap-xs">
          <Button variant="secondary" size="sm" onClick={togglePause}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {entries.length === 0 && (
        <p className="text-center py-lg text-content-secondary text-base">
          No requests captured. Enable interception on a tab to start logging.
        </p>
      )}

      <div className="flex flex-col gap-xs">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-surface-card border border-border rounded-md p-sm">
            <div className="flex items-center gap-xs">
              <span className="text-xs text-content-muted font-mono">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <Badge color={methodColors[entry.method] ?? '#6B7280'}>
                {entry.method}
              </Badge>
              <span className="flex-1 font-mono text-sm text-content-primary truncate">
                {entry.url}
              </span>
            </div>
            <div className="flex items-center gap-sm mt-xs text-sm">
              <Badge variant={entry.mocked ? 'success' : 'info'}>
                {entry.mocked ? 'MOCKED' : 'REAL'}
              </Badge>
              <span className={entry.statusCode >= 400 ? 'text-status-error' : 'text-content-secondary'}>
                {entry.statusCode}
              </span>
              <span className="text-content-muted">{entry.duration}ms</span>
            </div>
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <p className="text-xs text-content-muted text-center">
          Showing {entries.length} requests
        </p>
      )}
    </div>
  );
}
