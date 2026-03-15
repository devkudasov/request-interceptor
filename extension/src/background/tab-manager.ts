import { MESSAGE_TYPES } from '@/shared/constants';

export async function setActiveTab(tabId: number): Promise<void> {
  try {
    await chrome.storage.local.set({ activeTabId: tabId });

    await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.TAB_STATUS_CHANGED,
      payload: { enabled: true },
    });

    // Small delay to let activation propagate
    await new Promise((r) => setTimeout(r, 50));

    // Send current enabled rules to the tab
    await sendRulesToTab(tabId);
  } catch (err) {
    console.error(`Failed to activate tab ${tabId}:`, err);
  }
}

export async function clearActiveTab(): Promise<void> {
  const result = await chrome.storage.local.get('activeTabId');
  const currentTabId: number | null = result.activeTabId ?? null;

  if (currentTabId !== null) {
    try {
      await chrome.tabs.sendMessage(currentTabId, {
        type: MESSAGE_TYPES.TAB_STATUS_CHANGED,
        payload: { enabled: false },
      });
    } catch {
      // Tab may have been closed already
    }
  }

  await chrome.storage.local.set({ activeTabId: null });
}

export async function getActiveTabId(): Promise<number | null> {
  const result = await chrome.storage.local.get('activeTabId');
  return result.activeTabId ?? null;
}

export function setupTabListeners(): void {
  chrome.tabs.onRemoved.addListener(async (tabId: number) => {
    const currentTabId = await getActiveTabId();
    if (currentTabId === tabId) {
      await chrome.storage.local.set({ activeTabId: null });
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
    if (changeInfo.status !== 'complete') return;

    const currentTabId = await getActiveTabId();
    if (currentTabId !== tabId) return;

    await setActiveTab(tabId);
  });
}

async function sendRulesToTab(tabId: number): Promise<void> {
  const result = await chrome.storage.local.get('rules');
  const rules = result.rules ?? [];
  const enabledRules = rules
    .filter((r: { enabled: boolean }) => r.enabled)
    .sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority);

  await chrome.tabs.sendMessage(tabId, {
    type: MESSAGE_TYPES.INJECT_RULES,
    payload: enabledRules,
  });
}
