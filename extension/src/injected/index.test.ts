import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the interceptor modules before import
const mockInstallFetch = vi.fn();
const mockUninstallFetch = vi.fn();
const mockUpdateFetchRules = vi.fn();
const mockInstallXHR = vi.fn();
const mockUninstallXHR = vi.fn();
const mockUpdateXHRRules = vi.fn();
const mockInstallWebSocket = vi.fn();
const mockUninstallWebSocket = vi.fn();
const mockUpdateWebSocketRules = vi.fn();

vi.mock('./fetch-interceptor', () => ({
  installFetchInterceptor: mockInstallFetch,
  uninstallFetchInterceptor: mockUninstallFetch,
  updateFetchRules: mockUpdateFetchRules,
}));

vi.mock('./xhr-interceptor', () => ({
  installXHRInterceptor: mockInstallXHR,
  uninstallXHRInterceptor: mockUninstallXHR,
  updateXHRRules: mockUpdateXHRRules,
}));

vi.mock('./websocket-interceptor', () => ({
  installWebSocketInterceptor: mockInstallWebSocket,
  uninstallWebSocketInterceptor: mockUninstallWebSocket,
  updateWebSocketRules: mockUpdateWebSocketRules,
}));

let messageListeners: ((event: MessageEvent) => void)[] = [];
let beforeUnloadListeners: (() => void)[] = [];

beforeEach(() => {
  messageListeners = [];
  beforeUnloadListeners = [];

  vi.spyOn(window, 'addEventListener').mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'message') {
        messageListeners.push(listener as (event: MessageEvent) => void);
      }
      if (type === 'beforeunload') {
        beforeUnloadListeners.push(listener as () => void);
      }
    },
  );

  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('injected/index — initialization', () => {
  it('installs all interceptors on module load', async () => {
    await import('./index');

    expect(mockInstallFetch).toHaveBeenCalled();
    expect(mockInstallXHR).toHaveBeenCalled();
    expect(mockInstallWebSocket).toHaveBeenCalled();
  });

  it('registers a message listener for RULES_UPDATE', async () => {
    await import('./index');

    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
  });

  it('registers a beforeunload listener for cleanup', async () => {
    await import('./index');

    expect(window.addEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
  });

  it('logs a message on load', async () => {
    await import('./index');

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Injected script loaded'),
    );
  });
});

describe('injected/index — RULES_UPDATE message handling', () => {
  it('updates all interceptor rules on RULES_UPDATE message', async () => {
    await import('./index');

    const rules = [
      { id: 'r1', enabled: true, requestType: 'http' },
      { id: 'r2', enabled: true, requestType: 'websocket' },
    ];

    // Simulate a message from the content script
    for (const listener of messageListeners) {
      listener(
        new MessageEvent('message', {
          source: window,
          data: {
            type: '__REQ_INTERCEPTOR___RULES_UPDATE',
            payload: rules,
          },
        }),
      );
    }

    expect(mockUpdateFetchRules).toHaveBeenCalledWith(rules);
    expect(mockUpdateXHRRules).toHaveBeenCalledWith(rules);
    expect(mockUpdateWebSocketRules).toHaveBeenCalledWith(rules);
  });

  it('ignores messages from other sources', async () => {
    await import('./index');

    for (const listener of messageListeners) {
      // Create event with different source
      const event = new MessageEvent('message', {
        data: {
          type: '__REQ_INTERCEPTOR___RULES_UPDATE',
          payload: [],
        },
      });
      // Override source to be null (not window)
      Object.defineProperty(event, 'source', { value: null });
      listener(event);
    }

    expect(mockUpdateFetchRules).not.toHaveBeenCalled();
  });

  it('ignores messages with wrong type prefix', async () => {
    await import('./index');

    for (const listener of messageListeners) {
      listener(
        new MessageEvent('message', {
          source: window,
          data: {
            type: 'OTHER_PREFIX_RULES_UPDATE',
            payload: [],
          },
        }),
      );
    }

    expect(mockUpdateFetchRules).not.toHaveBeenCalled();
  });
});

describe('injected/index — cleanup on beforeunload', () => {
  it('uninstalls all interceptors on beforeunload', async () => {
    await import('./index');

    for (const listener of beforeUnloadListeners) {
      listener();
    }

    expect(mockUninstallFetch).toHaveBeenCalled();
    expect(mockUninstallXHR).toHaveBeenCalled();
    expect(mockUninstallWebSocket).toHaveBeenCalled();
  });
});
