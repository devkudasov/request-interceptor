import { useEffect } from 'react';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { useTabsStore } from '@/shared/stores';
import { useRulesStore } from '@/features/rules';
import { Toggle } from '@/ui/common/Toggle';
import { Button } from '@/ui/common/Button';
import { Spinner } from '@/ui/common/Spinner';

function PopupContent() {
  const { tabs, activeTabIds, loading, fetchTabs, toggleTab } = useTabsStore();
  const { rules, fetchRules } = useRulesStore();

  useEffect(() => {
    fetchTabs();
    fetchRules();
  }, [fetchTabs, fetchRules]);

  const activeRules = rules.filter((r) => r.enabled).length;

  const openSidePanel = () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    window.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2xl">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="w-[400px] min-h-[200px] max-h-[500px] bg-surface-primary text-content-primary flex flex-col">
      <header className="flex items-center justify-between p-md border-b border-border">
        <h1 className="text-lg font-semibold">Request Interceptor</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-md">
        <h2 className="text-sm font-semibold text-content-secondary mb-sm">Active Tabs</h2>

        {tabs.length === 0 && (
          <p className="text-base text-content-muted py-md">No tabs found</p>
        )}

        <div className="flex flex-col gap-xs">
          {tabs.map((tab) => (
            <div key={tab.id} className="flex items-center gap-sm bg-surface-card border border-border rounded-md p-sm">
              <Toggle
                checked={activeTabIds.includes(tab.id!)}
                onChange={(checked) => toggleTab(tab.id!, checked)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-base truncate">{tab.title || 'Untitled'}</p>
                <p className="text-sm text-content-muted font-mono truncate">{tab.url}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-md border-t border-border">
        <div className="text-sm text-content-secondary mb-sm">
          Rules: {activeRules} active
        </div>
        <div className="grid grid-cols-2 gap-xs">
          <Button size="sm" onClick={openSidePanel}>Open Editor</Button>
          <Button variant="secondary" size="sm" onClick={openSidePanel}>Request Logs</Button>
        </div>
      </div>
    </div>
  );
}

export function Popup() {
  return (
    <ThemeProvider>
      <PopupContent />
    </ThemeProvider>
  );
}
