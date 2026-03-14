import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSendMessage = vi.fn();
const mockOnMessageAddListener = vi.fn();

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockOnMessageAddListener,
    },
    lastError: null,
    id: 'test-extension-id',
  },
});

let messageListeners: ((event: MessageEvent) => void)[] = [];

beforeEach(() => {
  messageListeners = [];
  vi.clearAllMocks();

  vi.spyOn(window, 'addEventListener').mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'message') {
        messageListeners.push(listener as (event: MessageEvent) => void);
      }
    },
  );

  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function simulateWindowMessage(data: unknown, source: Window | null = window) {
  for (const listener of messageListeners) {
    const event = new MessageEvent('message', { data });
    Object.defineProperty(event, 'source', { value: source });
    listener(event);
  }
}

describe('content script — page → background forwarding', () => {
  it('forwards REQUEST_LOG messages as LOG_ENTRY to background', async () => {
    await import('./index');

    const payload = {
      method: 'GET',
      url: 'https://example.com/api/users',
      mocked: true,
    };

    simulateWindowMessage({
      type: '__REQ_INTERCEPTOR___REQUEST_LOG',
      payload,
    });

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'LOG_ENTRY',
      payload,
    });
  });

  it('forwards other prefixed messages to background', async () => {
    await import('./index');

    const payload = { some: 'data' };

    simulateWindowMessage({
      type: '__REQ_INTERCEPTOR___CUSTOM_EVENT',
      payload,
    });

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'CUSTOM_EVENT',
      payload,
    });
  });

  it('ignores messages from other sources', async () => {
    await import('./index');

    simulateWindowMessage(
      {
        type: '__REQ_INTERCEPTOR___REQUEST_LOG',
        payload: {},
      },
      null,
    );

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('ignores messages without string type', async () => {
    await import('./index');

    simulateWindowMessage({ type: 123, payload: {} });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('ignores messages without matching prefix', async () => {
    await import('./index');

    simulateWindowMessage({
      type: 'SOME_OTHER_MESSAGE',
      payload: {},
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('ignores messages with null data', async () => {
    await import('./index');

    simulateWindowMessage(null);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

describe('content script — background → page forwarding', () => {
  it('forwards INJECT_RULES messages to page via postMessage', async () => {
    await import('./index');

    // Get the listener that was registered for chrome.runtime.onMessage
    expect(mockOnMessageAddListener).toHaveBeenCalled();
    const bgListener = mockOnMessageAddListener.mock.calls[0][0];

    const rules = [{ id: 'r1', enabled: true }];
    bgListener({ type: 'INJECT_RULES', payload: rules });

    expect(window.postMessage).toHaveBeenCalledWith(
      { type: '__REQ_INTERCEPTOR___RULES_UPDATE', payload: rules },
      '*',
    );
  });

  it('does not forward non-INJECT_RULES messages to page', async () => {
    await import('./index');

    const bgListener = mockOnMessageAddListener.mock.calls[0][0];

    bgListener({ type: 'OTHER_MESSAGE', payload: {} });

    expect(window.postMessage).not.toHaveBeenCalled();
  });
});

describe('content script — logging', () => {
  it('logs initialization message', async () => {
    await import('./index');

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Content script loaded'),
    );
  });
});
