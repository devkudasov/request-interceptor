import { AccountButton } from '@/features/auth/widgets/AccountButton';

interface BottomBarProps {
  onToggleLog: () => void;
  logUnseenCount: number;
}

export function BottomBar({ onToggleLog, logUnseenCount }: BottomBarProps) {
  const displayCount = logUnseenCount > 99 ? '99+' : String(logUnseenCount);

  return (
    <div className="h-10 flex items-center justify-between px-sm border-t border-border bg-surface-primary shrink-0">
      <button
        type="button"
        aria-label="Toggle log panel"
        aria-expanded={false}
        onClick={onToggleLog}
        className="flex items-center gap-xs text-sm text-content-secondary hover:text-content-primary transition-colors"
      >
        Log
        {logUnseenCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-semibold rounded-full bg-primary text-white">
            {displayCount}
          </span>
        )}
      </button>

      <AccountButton />
    </div>
  );
}
