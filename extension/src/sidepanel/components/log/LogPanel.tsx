import { useLogStore } from '@/shared/store';
import { LogToolbar } from './LogToolbar';
import { LogEntryList } from './LogEntryList';

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
      <LogToolbar
        paused={paused}
        onTogglePause={togglePause}
        onClear={() => clearLog()}
        onClose={onClose}
      />
      <LogEntryList entries={entries} />
    </div>
  );
}
