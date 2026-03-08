import { MESSAGE_PREFIX } from '@/shared/constants';

// Relay messages between injected script (page context) and background SW
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data?.type?.startsWith(MESSAGE_PREFIX)) return;

  chrome.runtime.sendMessage(event.data);
});

// Relay messages from background SW to injected script
chrome.runtime.onMessage.addListener((message) => {
  window.postMessage(message, '*');
});

console.log('[Request Interceptor] Content script loaded');
