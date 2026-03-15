import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockStorage: Record<string, unknown> = {};

const mockOnUpdatedAddListener = vi.fn();
const mockOnRemovedAddListener = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | null) => {
        if (keys === null) return Promise.resolve({ ...mockStorage });
        if (typeof keys === 'string') return Promise.resolve({ [keys]: mockStorage[keys] });
        const result: Record<string, unknown> = {};
        for (const key of keys as string[]) result[key] = mockStorage[key];
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    id: 'test-extension-id',
  },
  scripting: {
    executeScript: vi.fn(() => Promise.resolve()),
  },
  tabs: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onUpdated: { addListener: mockOnUpdatedAddListener },
    onRemoved: { addListener: mockOnRemovedAddListener },
  },
});

vi.mock('@/shared/constants', async () => {
  const actual = await vi.importActual<typeof import('@/shared/constants')>('@/shared/constants');
  return {
    ...actual,
    PLAN_PRICE_IDS: { pro: '', team: '' },
  };
});

import { injectInterceptor, removeInterceptor, setupTabListeners } from './tab-manager';

describe('tab-manager', () => {
  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('injectInterceptor', () => {
    it('sends TAB_STATUS_CHANGED activation message to the tab', async () => {
      mockStorage.rules = [];
      const promise = injectInterceptor(5);
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(5, {
        type: 'TAB_STATUS_CHANGED',
        payload: { enabled: true },
      });
    });

    it('sends rules to the tab after activation', async () => {
      mockStorage.rules = [
        { id: 'r1', enabled: true, priority: 2 },
        { id: 'r2', enabled: false, priority: 1 },
        { id: 'r3', enabled: true, priority: 1 },
      ];

      const promise = injectInterceptor(5);
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(5, {
        type: 'INJECT_RULES',
        payload: [
          { id: 'r3', enabled: true, priority: 1 },
          { id: 'r1', enabled: true, priority: 2 },
        ],
      });
    });

    it('filters out disabled rules when sending', async () => {
      mockStorage.rules = [
        { id: 'r1', enabled: false, priority: 0 },
        { id: 'r2', enabled: false, priority: 1 },
      ];

      const promise = injectInterceptor(5);
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(5, {
        type: 'INJECT_RULES',
        payload: [],
      });
    });

    it('handles activation failure gracefully', async () => {
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Tab not found'),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const promise = injectInterceptor(5);
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to activate tab 5'),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('handles sendRules failure gracefully', async () => {
      mockStorage.rules = [{ id: 'r1', enabled: true, priority: 0 }];
      // First call (TAB_STATUS_CHANGED) succeeds, second (INJECT_RULES) fails
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('No receiver'));

      const promise = injectInterceptor(5);
      await vi.advanceTimersByTimeAsync(200);

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('removeInterceptor', () => {
    it('sends TAB_STATUS_CHANGED deactivation message', async () => {
      await removeInterceptor(10);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(10, {
        type: 'TAB_STATUS_CHANGED',
        payload: { enabled: false },
      });
    });

    it('handles errors when tab is already closed', async () => {
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Tab not found'),
      );

      await expect(removeInterceptor(10)).resolves.toBeUndefined();
    });
  });

  describe('setupTabListeners', () => {
    it('registers onUpdated listener', () => {
      setupTabListeners();
      expect(mockOnUpdatedAddListener).toHaveBeenCalledTimes(1);
      expect(mockOnUpdatedAddListener.mock.calls[0][0]).toBeTypeOf('function');
    });

    it('registers onRemoved listener', () => {
      setupTabListeners();
      expect(mockOnRemovedAddListener).toHaveBeenCalledTimes(1);
      expect(mockOnRemovedAddListener.mock.calls[0][0]).toBeTypeOf('function');
    });

    describe('onUpdated listener', () => {
      it('re-activates interceptor when active tab completes loading', async () => {
        mockStorage.activeTabIds = [5, 10];
        mockStorage.rules = [];

        setupTabListeners();
        const onUpdatedHandler = mockOnUpdatedAddListener.mock.calls[0][0];

        const promise = onUpdatedHandler(5, { status: 'complete' });
        await vi.advanceTimersByTimeAsync(200);
        await promise;

        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(5, {
          type: 'TAB_STATUS_CHANGED',
          payload: { enabled: true },
        });
      });

      it('ignores non-complete status changes', async () => {
        mockStorage.activeTabIds = [5];

        setupTabListeners();
        const onUpdatedHandler = mockOnUpdatedAddListener.mock.calls[0][0];

        await onUpdatedHandler(5, { status: 'loading' });

        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      });

      it('ignores tabs not in active list', async () => {
        mockStorage.activeTabIds = [10];

        setupTabListeners();
        const onUpdatedHandler = mockOnUpdatedAddListener.mock.calls[0][0];

        await onUpdatedHandler(5, { status: 'complete' });

        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      });

      it('ignores when changeInfo has no status', async () => {
        mockStorage.activeTabIds = [5];

        setupTabListeners();
        const onUpdatedHandler = mockOnUpdatedAddListener.mock.calls[0][0];

        await onUpdatedHandler(5, { url: 'https://example.com' });

        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('onRemoved listener', () => {
      it('removes closed tab from active list', async () => {
        mockStorage.activeTabIds = [5, 10, 15];

        setupTabListeners();
        const onRemovedHandler = mockOnRemovedAddListener.mock.calls[0][0];

        await onRemovedHandler(10);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          activeTabIds: [5, 15],
        });
      });

      it('does nothing if closed tab is not in active list', async () => {
        mockStorage.activeTabIds = [5, 15];

        setupTabListeners();
        const onRemovedHandler = mockOnRemovedAddListener.mock.calls[0][0];

        await onRemovedHandler(99);

        expect(chrome.storage.local.set).not.toHaveBeenCalled();
      });

      it('handles empty active tab list', async () => {
        setupTabListeners();
        const onRemovedHandler = mockOnRemovedAddListener.mock.calls[0][0];

        await onRemovedHandler(5);

        expect(chrome.storage.local.set).not.toHaveBeenCalled();
      });
    });
  });
});
