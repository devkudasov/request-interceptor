import { MESSAGE_PREFIX, MESSAGE_TYPES } from '@/shared/constants';

// Relay messages from injected script (MAIN world) → background SW
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (typeof event.data?.type !== 'string') return;
  if (!event.data.type.startsWith(MESSAGE_PREFIX)) return;

  const internalType = event.data.type.replace(`${MESSAGE_PREFIX}_`, '');

  // Map injected script messages to background SW message types
  if (internalType === 'REQUEST_LOG') {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.LOG_ENTRY,
      payload: event.data.payload,
    });
    return;
  }

  // Forward other messages
  chrome.runtime.sendMessage({ type: internalType, payload: event.data.payload });
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
