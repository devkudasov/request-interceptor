import { useEffect } from 'react';
import { useActiveTabStore } from '@/shared/stores/active-tab';

export function TabSelector() {
  const activeTabId = useActiveTabStore((s) => s.activeTabId);
  const tabs = useActiveTabStore((s) => s.tabs);
  const setActiveTab = useActiveTabStore((s) => s.setActiveTab);
  const clearActiveTab = useActiveTabStore((s) => s.clearActiveTab);
  const fetchTabs = useActiveTabStore((s) => s.fetchTabs);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  return (
    <select
      aria-label="Select active tab"
      value={activeTabId ?? ''}
      onChange={(e) => {
        const value = e.target.value;
        if (value === '') {
          clearActiveTab();
        } else {
          setActiveTab(Number(value));
        }
      }}
      className="w-full px-md py-sm text-base bg-surface-secondary text-content-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
    >
      <option value="">No tab selected</option>
      {tabs.map((tab) => (
        <option key={tab.id} value={String(tab.id)}>
          {tab.title || tab.url || `Tab ${tab.id}`}
        </option>
      ))}
    </select>
  );
}
