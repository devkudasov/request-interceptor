import { MESSAGE_PREFIX, MESSAGE_TYPES } from '@/shared/constants';

function safeSendMessage(message: unknown): void {
  try {
    chrome.runtime.sendMessage(message).catch(() => {
      // Extension context invalidated — user needs to refresh the page
    });
  } catch {
    // Extension context invalidated (synchronous throw)
  }
}

// Relay messages from injected script (MAIN world) → background SW
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (typeof event.data?.type !== 'string') return;
  if (!event.data.type.startsWith(MESSAGE_PREFIX)) return;

  const internalType = event.data.type.replace(`${MESSAGE_PREFIX}_`, '');

  // Map injected script messages to background SW message types
  if (internalType === 'REQUEST_LOG') {
    safeSendMessage({
      type: MESSAGE_TYPES.LOG_ENTRY,
      payload: event.data.payload,
    });
    return;
  }

  // Forward other messages
  safeSendMessage({ type: internalType, payload: event.data.payload });
});

// Relay messages from background SW → injected script (MAIN world)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.INJECT_RULES) {
    window.postMessage(
      { type: `${MESSAGE_PREFIX}_RULES_UPDATE`, payload: message.payload },
      '*',
    );
  }

  if (message.type === MESSAGE_TYPES.TAB_STATUS_CHANGED) {
    const { enabled } = message.payload as { enabled: boolean };
    window.postMessage(
      { type: `${MESSAGE_PREFIX}_${enabled ? 'ACTIVATE' : 'DEACTIVATE'}` },
      '*',
    );
  }
});

console.log('[Request Interceptor] Content script loaded');
