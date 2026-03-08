import { getStorage } from './storage';
import { MESSAGE_TYPES } from '@/shared/constants';

export async function injectInterceptor(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      files: ['src/injected/index.ts'],
    });

    // Send current rules to the newly injected tab
    await sendRulesToTab(tabId);
  } catch (err) {
    console.error(`[Request Interceptor] Failed to inject into tab ${tabId}:`, err);
  }
}

export async function removeInterceptor(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        window.dispatchEvent(new Event('beforeunload'));
      },
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
  // Re-inject on navigation
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
