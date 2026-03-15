import { MESSAGE_PREFIX } from '@/shared/constants';
import { installFetchInterceptor, uninstallFetchInterceptor, updateFetchRules } from './fetch-interceptor';
import { installXHRInterceptor, uninstallXHRInterceptor, updateXHRRules } from './xhr-interceptor';
import { installWebSocketInterceptor, uninstallWebSocketInterceptor, updateWebSocketRules } from './websocket-interceptor';
import type { MockRule } from '@/features/rules';

let active = false;

function activate() {
  if (active) return;
  active = true;
  installFetchInterceptor();
  installXHRInterceptor();
  installWebSocketInterceptor();
  console.log('[Request Interceptor] Interceptors activated');
}

function deactivate() {
  if (!active) return;
  active = false;
  uninstallFetchInterceptor();
  uninstallXHRInterceptor();
  uninstallWebSocketInterceptor();
  console.log('[Request Interceptor] Interceptors deactivated');
}

// Listen for activation/deactivation and rule updates from content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  const type = event.data?.type;
  if (typeof type !== 'string' || !type.startsWith(MESSAGE_PREFIX)) return;

  if (type === `${MESSAGE_PREFIX}_ACTIVATE`) {
    activate();
    return;
  }

  if (type === `${MESSAGE_PREFIX}_DEACTIVATE`) {
    deactivate();
    return;
  }

  if (type === `${MESSAGE_PREFIX}_RULES_UPDATE`) {
    const rules = event.data.payload as MockRule[];
    // Auto-activate when rules are received
    activate();
    updateFetchRules(rules);
    updateXHRRules(rules);
    updateWebSocketRules(rules);
  }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (active) {
    deactivate();
  }
});

console.log('[Request Interceptor] Injected script loaded (dormant, waiting for activation)');
