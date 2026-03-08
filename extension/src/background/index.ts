import { DEFAULT_STORAGE } from '@/shared/constants';

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set(DEFAULT_STORAGE);
    console.log('[Request Interceptor] Extension installed, storage initialized');
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Request Interceptor] Message received:', message.type);
  sendResponse({ ok: true });
  return true;
});

console.log('[Request Interceptor] Background service worker started');
