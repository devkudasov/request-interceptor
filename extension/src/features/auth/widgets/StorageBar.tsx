interface StorageBarProps {
  usedBytes: number;
  totalBytes: number;
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function StorageBar({ usedBytes, totalBytes }: StorageBarProps) {
  const percentage = totalBytes > 0 ? Math.min(Math.round((usedBytes / totalBytes) * 100), 100) : 0;

  let barColor: string;
  if (percentage >= 80) {
    barColor = 'bg-status-error';
  } else if (percentage >= 50) {
    barColor = 'bg-status-warning';
  } else {
    barColor = 'bg-status-success';
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-content-secondary mb-xs">
        <span>Storage</span>
        <span>
          {formatMB(usedBytes)} MB / {formatMB(totalBytes)} MB used ({percentage}%)
        </span>
      </div>
      <div
        className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
