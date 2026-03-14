import type { MockRule, WebSocketRule } from '@/features/rules';
import { matchUrl } from '@/shared/url-matcher';
import { MESSAGE_PREFIX } from '@/shared/constants';

let activeRules: WebSocketRule[] = [];
const OriginalWebSocket = window.WebSocket;

class MockWebSocket extends EventTarget {
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readyState = 0;
  url: string;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  binaryType: BinaryType = 'blob';

  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  private rule: WebSocketRule;

  constructor(url: string | URL, rule: WebSocketRule) {
    super();
    this.url = typeof url === 'string' ? url : url.href;
    this.rule = rule;

    // Simulate connection async
    setTimeout(() => {
      this.readyState = 1;
      const ev = new Event('open');
      this.dispatchEvent(ev);
      if (this.onopen) this.onopen(ev);

      // Send onConnect message
      if (rule.onConnect) {
        this.simulateMessage(rule.onConnect);
      }
    }, 50);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.readyState !== 1) return;

    const message = typeof data === 'string' ? data : '';

    // Check message rules
    for (const msgRule of this.rule.messageRules) {
      if (matchMessagePattern(message, msgRule.match)) {
        const delay = msgRule.delay || 0;
        setTimeout(() => this.simulateMessage(msgRule.respond), delay);
        break;
      }
    }

    // Log sent message
    window.postMessage({
      type: `${MESSAGE_PREFIX}_REQUEST_LOG`,
      payload: {
        method: 'WS_SEND',
        url: this.url,
        body: message,
        statusCode: 0,
        responseBody: null,
        responseHeaders: {},
        duration: 0,
        mocked: true,
        matchedRuleId: this.rule.id,
      },
    }, '*');
  }

  close(code?: number, reason?: string) {
    this.readyState = 2;
    setTimeout(() => {
      this.readyState = 3;
      const ev = new CloseEvent('close', {
        code: code ?? 1000,
        reason: reason ?? '',
        wasClean: true,
      });
      this.dispatchEvent(ev);
      if (this.onclose) this.onclose(ev);
    }, 0);
  }

  private simulateMessage(data: string) {
    if (this.readyState !== 1) return;
    const ev = new MessageEvent('message', { data });
    this.dispatchEvent(ev);
    if (this.onmessage) this.onmessage(ev);
  }
}

function matchMessagePattern(message: string, pattern: string): boolean {
  try {
    const msgObj = JSON.parse(message);
    const patternObj = JSON.parse(pattern);
    return partialMatch(msgObj, patternObj);
  } catch {
    return message.includes(pattern);
  }
}

function partialMatch(actual: unknown, pattern: unknown): boolean {
  if (pattern === '*') return true;
  if (pattern !== null && typeof pattern === 'object' && !Array.isArray(pattern)) {
    if (actual === null || typeof actual !== 'object') return false;
    return Object.entries(pattern as Record<string, unknown>).every(([k, v]) =>
      partialMatch((actual as Record<string, unknown>)[k], v),
    );
  }
  return actual === pattern;
}

function findWSRule(url: string): WebSocketRule | null {
  for (const rule of activeRules) {
    if (!rule.enabled) continue;
    if (matchUrl(url, rule.urlPattern, rule.urlMatchType)) return rule;
  }
  return null;
}

const InterceptedWebSocket = new Proxy(OriginalWebSocket, {
  construct(_target, args: [string | URL, string | string[] | undefined]) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].href;
    const rule = findWSRule(url);

    if (rule) {
      return new MockWebSocket(args[0], rule) as unknown as WebSocket;
    }

    // Real WebSocket
    return new OriginalWebSocket(...args);
  },
  get(target, prop) {
    // Preserve static properties like CONNECTING, OPEN, etc.
    return Reflect.get(target, prop);
  },
});

export function installWebSocketInterceptor() {
  (window as { WebSocket: typeof WebSocket }).WebSocket = InterceptedWebSocket;
}

export function uninstallWebSocketInterceptor() {
  (window as { WebSocket: typeof WebSocket }).WebSocket = OriginalWebSocket;
}

export function updateWebSocketRules(rules: MockRule[]) {
  activeRules = rules.filter((r): r is WebSocketRule => r.requestType === 'websocket');
}
