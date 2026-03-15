import { getStorage } from './storage';
import { MESSAGE_TYPES } from '@/shared/constants';

export async function injectInterceptor(tabId: number): Promise<void> {
  try {
    // Send activation message to the content script, which relays to MAIN world
    await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.TAB_STATUS_CHANGED,
      payload: { enabled: true },
    });

    // Small delay to let activation propagate
    await new Promise((r) => setTimeout(r, 50));

    // Send current rules to the tab
    await sendRulesToTab(tabId);
  } catch (err) {
    console.error(`[Request Interceptor] Failed to activate tab ${tabId}:`, err);
  }
}

export async function removeInterceptor(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.TAB_STATUS_CHANGED,
      payload: { enabled: false },
    });
  } catch {
    // Tab may have been closed already
  }
}

async function sendRulesToTab(tabId: number): Promise<void> {
  const rules = await getStorage('RULES');
  const enabledRules = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.INJECT_RULES,
      payload: enabledRules,
    });
  } catch {
    // Content script may not be ready yet
  }
}

export function setupTabListeners() {
  // Re-activate on navigation for active tabs
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status !== 'complete') return;

    const activeTabIds = await getStorage('ACTIVE_TAB_IDS');
    if (activeTabIds.includes(tabId)) {
      await injectInterceptor(tabId);
    }
  });

  // Cleanup closed tabs
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    const result = await chrome.storage.local.get('activeTabIds');
    const activeTabIds: number[] = result.activeTabIds ?? [];
    if (activeTabIds.includes(tabId)) {
      await chrome.storage.local.set({
        activeTabIds: activeTabIds.filter((id) => id !== tabId),
      });
    }
  });
}
