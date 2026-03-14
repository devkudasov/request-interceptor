import { Button } from '@/ui/common/Button';

interface RecordButtonProps {
  isRecording: boolean;
  onRecordClick: () => void;
  onStopClick: () => void;
}

export function RecordButton({ isRecording, onRecordClick, onStopClick }: RecordButtonProps) {
  if (isRecording) {
    return (
      <div className="flex items-center gap-sm">
        <span
          data-testid="recording-indicator"
          className="inline-block h-2 w-2 rounded-full bg-status-error animate-pulse"
        />
        <span className="text-sm text-content-primary">Recording...</span>
        <Button size="sm" variant="danger" onClick={onStopClick}>
          Stop
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="primary" onClick={onRecordClick}>
      Record
    </Button>
  );
}
