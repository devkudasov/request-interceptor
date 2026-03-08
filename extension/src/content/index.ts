import { MESSAGE_PREFIX, MESSAGE_TYPES } from '@/shared/constants';

// Relay messages from injected script (MAIN world) → background SW
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (typeof event.data?.type !== 'string') return;
  if (!event.data.type.startsWith(MESSAGE_PREFIX)) return;

  // Strip prefix and forward to background
  const type = event.data.type.replace(`${MESSAGE_PREFIX}_`, '');
  chrome.runtime.sendMessage({ type, payload: event.data.payload });
});

// Relay messages from background SW → injected script (MAIN world)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.INJECT_RULES) {
    window.postMessage(
      { type: `${MESSAGE_PREFIX}_RULES_UPDATE`, payload: message.payload },
      '*',
    );
  }
});

console.log('[Request Interceptor] Content script loaded');
