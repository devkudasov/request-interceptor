import { MESSAGE_PREFIX } from '@/shared/constants';
import { installFetchInterceptor, uninstallFetchInterceptor, updateFetchRules } from './fetch-interceptor';
import { installXHRInterceptor, uninstallXHRInterceptor, updateXHRRules } from './xhr-interceptor';
import { installWebSocketInterceptor, uninstallWebSocketInterceptor, updateWebSocketRules } from './websocket-interceptor';
import type { MockRule } from '@/features/rules';

// Install all interceptors
installFetchInterceptor();
installXHRInterceptor();
installWebSocketInterceptor();

// Listen for rule updates from content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== `${MESSAGE_PREFIX}_RULES_UPDATE`) return;

  const rules = event.data.payload as MockRule[];
  updateFetchRules(rules);
  updateXHRRules(rules);
  updateWebSocketRules(rules);
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  uninstallFetchInterceptor();
  uninstallXHRInterceptor();
  uninstallWebSocketInterceptor();
});

console.log('[Request Interceptor] Injected script loaded — fetch, XHR, WebSocket interceptors active');
