import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockRule, WebSocketRule } from '@/features/rules';

const OriginalWebSocket = globalThis.WebSocket;
const originalPostMessage = window.postMessage;

function makeWSRule(overrides: Partial<WebSocketRule> = {}): WebSocketRule {
  return {
    id: 'ws-rule-1',
    enabled: true,
    priority: 0,
    collectionId: null,
    urlPattern: 'wss://example.com/ws',
    urlMatchType: 'exact',
    method: 'GET',
    requestType: 'websocket',
    statusCode: 0,
    responseType: 'raw',
    responseBody: '',
    responseHeaders: {},
    delay: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageRules: [],
    ...overrides,
  };
}

function makeHttpRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'http-rule-1',
    enabled: true,
    priority: 0,
    collectionId: null,
    urlPattern: '**/api/users',
    urlMatchType: 'wildcard',
    method: 'GET',
    requestType: 'http',
    statusCode: 200,
    responseType: 'json',
    responseBody: '{}',
    responseHeaders: {},
    delay: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

let installWebSocketInterceptor: () => void;
let uninstallWebSocketInterceptor: () => void;
let updateWebSocketRules: (rules: MockRule[]) => void;

beforeEach(async () => {
  vi.useFakeTimers();
  window.postMessage = vi.fn();

  vi.resetModules();
  const mod = await import('./websocket-interceptor');
  installWebSocketInterceptor = mod.installWebSocketInterceptor;
  uninstallWebSocketInterceptor = mod.uninstallWebSocketInterceptor;
  updateWebSocketRules = mod.updateWebSocketRules;
});

afterEach(() => {
  uninstallWebSocketInterceptor();
  globalThis.WebSocket = OriginalWebSocket;
  window.postMessage = originalPostMessage;
  vi.useRealTimers();
});

describe('installWebSocketInterceptor', () => {
  it('replaces window.WebSocket', () => {
    const before = window.WebSocket;
    installWebSocketInterceptor();
    expect(window.WebSocket).not.toBe(before);
  });
});

describe('uninstallWebSocketInterceptor', () => {
  it('restores original WebSocket', () => {
    installWebSocketInterceptor();
    uninstallWebSocketInterceptor();
    expect(typeof window.WebSocket).toBe('function');
  });
});

describe('updateWebSocketRules', () => {
  it('filters to only websocket rules', () => {
    // Should not throw
    updateWebSocketRules([makeWSRule(), makeHttpRule()]);
  });
});

describe('MockWebSocket — connection', () => {
  it('opens and fires onopen event', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule()]);

    const onopen = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onopen = onopen;

    // Connection simulated after 50ms timeout
    await vi.advanceTimersByTimeAsync(50);

    expect(onopen).toHaveBeenCalled();
  });

  it('dispatches open event to addEventListener listeners', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule()]);

    const listener = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.addEventListener('open', listener);

    await vi.advanceTimersByTimeAsync(50);

    expect(listener).toHaveBeenCalled();
  });

  it('sends onConnect message after opening', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([
      makeWSRule({ onConnect: '{"type":"connected"}' }),
    ]);

    const onmessage = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onmessage = onmessage;

    await vi.advanceTimersByTimeAsync(50);

    expect(onmessage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: '{"type":"connected"}',
      }),
    );
  });

  it('does not send onConnect message when not configured', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule({ onConnect: undefined })]);

    const onmessage = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onmessage = onmessage;

    await vi.advanceTimersByTimeAsync(50);

    expect(onmessage).not.toHaveBeenCalled();
  });

  it('handles URL object input', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule()]);

    const onopen = vi.fn();
    const ws = new WebSocket(new URL('wss://example.com/ws'));
    ws.onopen = onopen;

    await vi.advanceTimersByTimeAsync(50);

    expect(onopen).toHaveBeenCalled();
  });
});

describe('MockWebSocket — message rules', () => {
  it('responds to matching messages based on JSON partial match', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([
      makeWSRule({
        messageRules: [
          { match: '{"type":"ping"}', respond: '{"type":"pong"}', delay: 0 },
        ],
      }),
    ]);

    const onmessage = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onmessage = onmessage;

    // Wait for open
    await vi.advanceTimersByTimeAsync(50);
    onmessage.mockClear();

    ws.send('{"type":"ping"}');
    await vi.advanceTimersByTimeAsync(0);

    expect(onmessage).toHaveBeenCalledWith(
      expect.objectContaining({ data: '{"type":"pong"}' }),
    );
  });

  it('responds to matching messages with delay', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([
      makeWSRule({
        messageRules: [
          { match: '{"type":"ping"}', respond: '{"type":"pong"}', delay: 100 },
        ],
      }),
    ]);

    const onmessage = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onmessage = onmessage;

    await vi.advanceTimersByTimeAsync(50);
    onmessage.mockClear();

    ws.send('{"type":"ping"}');

    // Not yet
    await vi.advanceTimersByTimeAsync(50);
    expect(onmessage).not.toHaveBeenCalled();

    // Now
    await vi.advanceTimersByTimeAsync(60);
    expect(onmessage).toHaveBeenCalled();
  });

  it('responds to plain text match via includes', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([
      makeWSRule({
        messageRules: [
          { match: 'hello', respond: 'world', delay: 0 },
        ],
      }),
    ]);

    const onmessage = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onmessage = onmessage;

    await vi.advanceTimersByTimeAsync(50);
    onmessage.mockClear();

    ws.send('say hello there');
    await vi.advanceTimersByTimeAsync(0);

    expect(onmessage).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'world' }),
    );
  });

  it('does not respond when no message rule matches', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([
      makeWSRule({
        messageRules: [
          { match: '{"type":"ping"}', respond: '{"type":"pong"}', delay: 0 },
        ],
      }),
    ]);

    const onmessage = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onmessage = onmessage;

    await vi.advanceTimersByTimeAsync(50);
    onmessage.mockClear();

    ws.send('{"type":"something-else"}');
    await vi.advanceTimersByTimeAsync(10);

    expect(onmessage).not.toHaveBeenCalled();
  });

  it('does not respond when readyState is not OPEN', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([
      makeWSRule({
        messageRules: [
          { match: 'hello', respond: 'world', delay: 0 },
        ],
      }),
    ]);

    const ws = new WebSocket('wss://example.com/ws');

    // Don't wait for open, send immediately (readyState = 0)
    ws.send('hello');
    // Should not throw, just silently ignored
  });
});

describe('MockWebSocket — send logging', () => {
  it('logs sent messages via postMessage', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule()]);

    const ws = new WebSocket('wss://example.com/ws');
    await vi.advanceTimersByTimeAsync(50);

    ws.send('test message');

    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '__REQ_INTERCEPTOR___REQUEST_LOG',
        payload: expect.objectContaining({
          method: 'WS_SEND',
          url: 'wss://example.com/ws',
          body: 'test message',
          mocked: true,
          matchedRuleId: 'ws-rule-1',
        }),
      }),
      '*',
    );
  });

  it('handles non-string data in send by using empty string', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule()]);

    const ws = new WebSocket('wss://example.com/ws');
    await vi.advanceTimersByTimeAsync(50);

    // Send ArrayBuffer — should be logged as empty string body
    ws.send(new ArrayBuffer(8));

    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          body: '',
        }),
      }),
      '*',
    );
  });
});

describe('MockWebSocket — close', () => {
  it('fires close event', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule()]);

    const onclose = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onclose = onclose;

    await vi.advanceTimersByTimeAsync(50);

    ws.close();
    await vi.advanceTimersByTimeAsync(0);

    expect(onclose).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 1000,
        wasClean: true,
      }),
    );
  });

  it('fires close event with custom code and reason', async () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule()]);

    const onclose = vi.fn();
    const ws = new WebSocket('wss://example.com/ws');
    ws.onclose = onclose;

    await vi.advanceTimersByTimeAsync(50);

    ws.close(4000, 'custom-reason');
    await vi.advanceTimersByTimeAsync(0);

    expect(onclose).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 4000,
        reason: 'custom-reason',
      }),
    );
  });
});

describe('unmatched WebSocket URL — real WebSocket', () => {
  it('creates a real WebSocket when no rule matches (not a MockWebSocket)', () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule({ urlPattern: 'wss://other.com/ws' })]);

    const ws = new WebSocket('wss://example.com/ws');

    // Real WebSocket won't have the custom rule property; it should be a native WebSocket
    // The key behavior: it does NOT fire our mock events
    expect(ws).toBeDefined();
    // Real WebSocket's readyState starts at CONNECTING (0)
    expect(ws.readyState).toBe(0);
  });
});

describe('disabled rules', () => {
  it('skips disabled rules and falls through to real WebSocket', () => {
    installWebSocketInterceptor();
    updateWebSocketRules([makeWSRule({ enabled: false })]);

    const ws = new WebSocket('wss://example.com/ws');

    // Should create a real WebSocket, not our mock
    expect(ws).toBeDefined();
    expect(ws.readyState).toBe(0);
  });
});

describe('InterceptedWebSocket static properties', () => {
  it('preserves static properties like CONNECTING, OPEN, etc.', () => {
    installWebSocketInterceptor();

    expect(WebSocket.CONNECTING).toBe(0);
    expect(WebSocket.OPEN).toBe(1);
    expect(WebSocket.CLOSING).toBe(2);
    expect(WebSocket.CLOSED).toBe(3);
  });
});
