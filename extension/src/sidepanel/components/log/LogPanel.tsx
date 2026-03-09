import { useLogStore } from '@/shared/store';
import { Badge } from '@/ui/common/Badge';
import { Button } from '@/ui/common/Button';
import { methodColors } from '@/ui/theme/tokens';

interface LogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogPanel({ isOpen, onClose }: LogPanelProps) {
  const entries = useLogStore((s) => s.entries);
  const paused = useLogStore((s) => s.paused);
  const togglePause = useLogStore((s) => s.togglePause);
  const clearLog = useLogStore((s) => s.clearLog);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col border-t border-border bg-surface-primary">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-sm py-xs border-b border-border">
        <span className="text-sm font-semibold text-content-primary">Log</span>
        <div className="flex items-center gap-xs">
          <Button
            variant="ghost"
            size="sm"
            aria-label={paused ? 'Resume' : 'Pause'}
            onClick={togglePause}
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Clear"
            onClick={() => clearLog()}
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-center py-lg text-content-secondary text-sm">
            No requests captured yet.
          </p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
