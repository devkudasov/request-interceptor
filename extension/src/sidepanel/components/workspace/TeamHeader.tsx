interface TeamHeaderProps {
  teamName: string;
  memberCount: number;
  expanded: boolean;
  onToggle: () => void;
}

export function TeamHeader({ teamName, memberCount, expanded, onToggle }: TeamHeaderProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Team ${teamName}`}
      className="flex items-center gap-sm w-full px-md py-sm bg-surface-secondary border border-border rounded-md hover:bg-surface-tertiary transition-colors text-left"
    >
      <span className="text-content-secondary text-sm w-5 text-center">
        {expanded ? '▼' : '▶'}
      </span>
      <span className="text-sm font-medium text-content-primary flex-1 truncate">
        {teamName}
      </span>
      <span className="text-xs text-content-muted bg-surface-tertiary px-xs py-0.5 rounded-full min-w-[20px] text-center">
        {memberCount}
      </span>
    </button>
  );
}
