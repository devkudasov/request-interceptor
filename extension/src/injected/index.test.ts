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

function sendActivateMessage() {
  for (const listener of messageListeners) {
    listener(
      new MessageEvent('message', {
        source: window,
        data: { type: '__REQ_INTERCEPTOR___ACTIVATE' },
      }),
    );
  }
}

describe('injected/index — initialization', () => {
  it('starts dormant — does NOT install interceptors on module load', async () => {
    await import('./index');

    expect(mockInstallFetch).not.toHaveBeenCalled();
    expect(mockInstallXHR).not.toHaveBeenCalled();
    expect(mockInstallWebSocket).not.toHaveBeenCalled();
  });

  it('installs interceptors when ACTIVATE message is received', async () => {
    await import('./index');

    sendActivateMessage();

    expect(mockInstallFetch).toHaveBeenCalled();
    expect(mockInstallXHR).toHaveBeenCalled();
    expect(mockInstallWebSocket).toHaveBeenCalled();
  });

  it('does not install interceptors twice on repeated ACTIVATE', async () => {
    await import('./index');

    sendActivateMessage();
    sendActivateMessage();

    expect(mockInstallFetch).toHaveBeenCalledTimes(1);
  });

  it('registers a message listener', async () => {
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
  it('auto-activates and updates all interceptor rules on RULES_UPDATE', async () => {
    await import('./index');

    const rules = [
      { id: 'r1', enabled: true, requestType: 'http' },
      { id: 'r2', enabled: true, requestType: 'websocket' },
    ];

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

    // RULES_UPDATE auto-activates
    expect(mockInstallFetch).toHaveBeenCalled();
    expect(mockUpdateFetchRules).toHaveBeenCalledWith(rules);
    expect(mockUpdateXHRRules).toHaveBeenCalledWith(rules);
    expect(mockUpdateWebSocketRules).toHaveBeenCalledWith(rules);
  });

  it('ignores messages from other sources', async () => {
    await import('./index');

    for (const listener of messageListeners) {
      const event = new MessageEvent('message', {
        data: {
          type: '__REQ_INTERCEPTOR___RULES_UPDATE',
          payload: [],
        },
      });
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

describe('injected/index — deactivation', () => {
  it('uninstalls interceptors on DEACTIVATE message', async () => {
    await import('./index');

    // Activate first
    sendActivateMessage();

    // Then deactivate
    for (const listener of messageListeners) {
      listener(
        new MessageEvent('message', {
          source: window,
          data: { type: '__REQ_INTERCEPTOR___DEACTIVATE' },
        }),
      );
    }

    expect(mockUninstallFetch).toHaveBeenCalled();
    expect(mockUninstallXHR).toHaveBeenCalled();
    expect(mockUninstallWebSocket).toHaveBeenCalled();
  });

  it('does not uninstall when already dormant', async () => {
    await import('./index');

    for (const listener of messageListeners) {
      listener(
        new MessageEvent('message', {
          source: window,
          data: { type: '__REQ_INTERCEPTOR___DEACTIVATE' },
        }),
      );
    }

    expect(mockUninstallFetch).not.toHaveBeenCalled();
  });

  it('uninstalls on beforeunload if active', async () => {
    await import('./index');

    sendActivateMessage();

    for (const listener of beforeUnloadListeners) {
      listener();
    }

    expect(mockUninstallFetch).toHaveBeenCalled();
    expect(mockUninstallXHR).toHaveBeenCalled();
    expect(mockUninstallWebSocket).toHaveBeenCalled();
  });

  it('does NOT uninstall on beforeunload if dormant', async () => {
    await import('./index');

    for (const listener of beforeUnloadListeners) {
      listener();
    }

    expect(mockUninstallFetch).not.toHaveBeenCalled();
  });
});
