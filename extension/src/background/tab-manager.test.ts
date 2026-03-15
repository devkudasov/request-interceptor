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

import { setActiveTab, clearActiveTab, getActiveTabId, setupTabListeners } from './tab-manager';

describe('tab-manager (single-tab)', () => {
  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setActiveTab', () => {
    it('stores activeTabId in chrome.storage.local', async () => {
      mockStorage.rules = [];
      const promise = setActiveTab(5);
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(mockStorage.activeTabId).toBe(5);
    });

    it('sends TAB_STATUS_CHANGED with enabled:true to the tab', async () => {
      mockStorage.rules = [];
      const promise = setActiveTab(5);
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(5, {
        type: 'TAB_STATUS_CHANGED',
        payload: { enabled: true },
      });
    });

    it('sends enabled rules sorted by priority to the tab', async () => {
      mockStorage.rules = [
        { id: 'r1', enabled: true, priority: 2 },
        { id: 'r2', enabled: false, priority: 1 },
        { id: 'r3', enabled: true, priority: 1 },
      ];

      const promise = setActiveTab(5);
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

    it('sends empty rules array when all rules are disabled', async () => {
      mockStorage.rules = [
        { id: 'r1', enabled: false, priority: 0 },
        { id: 'r2', enabled: false, priority: 1 },
      ];

      const promise = setActiveTab(5);
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
      const promise = setActiveTab(5);
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to activate tab 5'),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('clearActiveTab', () => {
    it('sends TAB_STATUS_CHANGED with enabled:false to the previously active tab', async () => {
      mockStorage.activeTabId = 10;

      await clearActiveTab();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(10, {
        type: 'TAB_STATUS_CHANGED',
        payload: { enabled: false },
      });
    });

    it('stores null as activeTabId in storage', async () => {
      mockStorage.activeTabId = 10;

      await clearActiveTab();

      expect(mockStorage.activeTabId).toBeNull();
    });

    it('does not send message when no tab was active', async () => {
      mockStorage.activeTabId = null;

      await clearActiveTab();

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      expect(mockStorage.activeTabId).toBeNull();
    });

    it('handles errors when the previously active tab is already closed', async () => {
      mockStorage.activeTabId = 10;
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Tab not found'),
      );

      await expect(clearActiveTab()).resolves.toBeUndefined();
      expect(mockStorage.activeTabId).toBeNull();
    });
  });

  describe('getActiveTabId', () => {
    it('returns activeTabId from storage', async () => {
      mockStorage.activeTabId = 42;

      const result = await getActiveTabId();

      expect(result).toBe(42);
    });

    it('returns null when no active tab is set', async () => {
      const result = await getActiveTabId();

      expect(result).toBeNull();
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

    describe('onRemoved listener', () => {
      it('clears activeTabId when the active tab is closed', async () => {
        mockStorage.activeTabId = 10;

        setupTabListeners();
        const onRemovedHandler = mockOnRemovedAddListener.mock.calls[0][0];

        await onRemovedHandler(10);

        expect(mockStorage.activeTabId).toBeNull();
      });

      it('does nothing when a non-active tab is closed', async () => {
        mockStorage.activeTabId = 10;

        setupTabListeners();
        const onRemovedHandler = mockOnRemovedAddListener.mock.calls[0][0];

        await onRemovedHandler(99);

        expect(mockStorage.activeTabId).toBe(10);
        // storage.set should not have been called to change activeTabId
        const setCalls = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls;
        const activeTabIdUpdates = setCalls.filter(
          (call) => 'activeTabId' in call[0],
        );
        expect(activeTabIdUpdates).toHaveLength(0);
      });

      it('does nothing when no tab is active', async () => {
        setupTabListeners();
        const onRemovedHandler = mockOnRemovedAddListener.mock.calls[0][0];

        await onRemovedHandler(5);

        const setCalls = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls;
        const activeTabIdUpdates = setCalls.filter(
          (call) => 'activeTabId' in call[0],
        );
        expect(activeTabIdUpdates).toHaveLength(0);
      });
    });

    describe('onUpdated listener', () => {
      it('re-injects interceptor when active tab completes loading (URL change)', async () => {
        mockStorage.activeTabId = 5;
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
        mockStorage.activeTabId = 5;

        setupTabListeners();
        const onUpdatedHandler = mockOnUpdatedAddListener.mock.calls[0][0];

        await onUpdatedHandler(5, { status: 'loading' });

        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      });

      it('ignores updates for non-active tabs', async () => {
        mockStorage.activeTabId = 10;

        setupTabListeners();
        const onUpdatedHandler = mockOnUpdatedAddListener.mock.calls[0][0];

        await onUpdatedHandler(5, { status: 'complete' });

        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      });

      it('ignores when changeInfo has no status', async () => {
        mockStorage.activeTabId = 5;

        setupTabListeners();
        const onUpdatedHandler = mockOnUpdatedAddListener.mock.calls[0][0];

        await onUpdatedHandler(5, { url: 'https://example.com' });

        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      });

      it('ignores when no tab is active', async () => {
        setupTabListeners();
        const onUpdatedHandler = mockOnUpdatedAddListener.mock.calls[0][0];

        await onUpdatedHandler(5, { status: 'complete' });

        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      });
    });
  });
});
