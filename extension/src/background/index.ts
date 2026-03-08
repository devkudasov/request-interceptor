import { initializeStorage } from './storage';
import { setupMessageHandler } from './message-handler';

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await initializeStorage();
    console.log('[Request Interceptor] Extension installed, storage initialized');
  }
});

// Clean up closed tabs from activeTabIds
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const result = await chrome.storage.local.get('activeTabIds');
  const activeTabIds: number[] = result.activeTabIds ?? [];
  if (activeTabIds.includes(tabId)) {
    await chrome.storage.local.set({
      activeTabIds: activeTabIds.filter((id) => id !== tabId),
    });
  }
});

setupMessageHandler();

console.log('[Request Interceptor] Background service worker started');
