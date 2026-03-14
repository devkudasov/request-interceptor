export type RequestTypeTab = 'http' | 'websocket' | 'graphql';

interface RequestTypeTabsProps {
  active: RequestTypeTab;
  onChange: (tab: RequestTypeTab) => void;
  counts: Record<RequestTypeTab, number>;
}

const TABS: Array<{ key: RequestTypeTab; label: string }> = [
  { key: 'http', label: 'HTTP' },
  { key: 'websocket', label: 'WebSocket' },
  { key: 'graphql', label: 'GraphQL' },
];

export function RequestTypeTabs({ active, onChange, counts }: RequestTypeTabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    }

    if (nextIndex !== null) {
      onChange(TABS[nextIndex].key);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Filter by request type"
      className="flex border-b border-border bg-surface-secondary"
    >
      {TABS.map((tab, index) => {
        const isActive = active === tab.key;
        const count = counts[tab.key];
        const ariaLabel = count > 0
          ? `${tab.label}, ${count} rules`
          : tab.label;

        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-label={ariaLabel}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex items-center gap-xs px-sm py-xs text-sm transition-colors ${
              isActive
                ? 'text-primary font-medium border-b border-primary'
                : 'text-content-muted hover:text-content-secondary'
            }`}
          >
            {tab.label}
            {count > 0 && (
              <span className={`text-xs ${isActive ? 'text-primary/70' : 'text-content-muted'}`}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
