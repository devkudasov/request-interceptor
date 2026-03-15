import { Button } from '@/ui/common/Button';
import { PauseIcon, PlayIcon, TrashIcon, CloseIcon } from '@/ui/icons';

interface LogToolbarProps {
  paused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  onClose: () => void;
}

export function LogToolbar({
  paused,
  onTogglePause,
  onClear,
  onClose,
}: LogToolbarProps) {
  return (
    <div className="flex items-center justify-between px-sm py-xs border-b border-border">
      <span className="text-sm font-semibold text-content-primary">Logs</span>
      <div className="flex items-center gap-xs">
        <Button
          variant="ghost"
          size="sm"
          aria-label={paused ? 'Resume' : 'Pause'}
          onClick={onTogglePause}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Clear"
          onClick={onClear}
        >
          <TrashIcon />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon />
        </Button>
      </div>
    </div>
  );
}
