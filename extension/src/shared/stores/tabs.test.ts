// DEPRECATED: This store is replaced by active-tab.ts. Will be deleted in TASK-158.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTabsStore } from './tabs';

const mockSendMessage = vi.fn();
const mockTabsQuery = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: mockTabsQuery },
});

function mockSendMessageSuccess(data: unknown = undefined) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: true, data });
    },
  );
}

function mockSendMessageError(error: string) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: false, error });
    },
  );
}

describe('useTabsStore', () => {
  beforeEach(() => {
    useTabsStore.setState(useTabsStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with correct defaults', () => {
      const state = useTabsStore.getState();
      expect(state.tabs).toEqual([]);
      expect(state.activeTabIds).toEqual([]);
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchTabs', () => {
    it('fetches tabs and active tab ids', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
      ]);
      mockSendMessageSuccess([1]);

      await useTabsStore.getState().fetchTabs();

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(2);
      expect(state.activeTabIds).toEqual([1]);
      expect(state.loading).toBe(false);
    });

    it('filters out chrome:// URLs', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'chrome://extensions' },
        { id: 3, url: 'chrome://settings' },
      ]);
      mockSendMessageSuccess([]);

      await useTabsStore.getState().fetchTabs();

      expect(useTabsStore.getState().tabs).toHaveLength(1);
      expect(useTabsStore.getState().tabs[0].id).toBe(1);
    });

    it('filters out chrome-extension:// URLs', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'chrome-extension://some-id/popup.html' },
      ]);
      mockSendMessageSuccess([]);

      await useTabsStore.getState().fetchTabs();

      expect(useTabsStore.getState().tabs).toHaveLength(1);
    });

    it('filters out tabs with no url', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
        { id: 2 },
        { id: 3, url: undefined },
      ]);
      mockSendMessageSuccess([]);

      await useTabsStore.getState().fetchTabs();

      expect(useTabsStore.getState().tabs).toHaveLength(1);
    });

    it('sets loading during fetch', async () => {
      let resolveQuery: (value: unknown) => void;
      mockTabsQuery.mockReturnValue(
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
      );
      mockSendMessageSuccess([]);

      const promise = useTabsStore.getState().fetchTabs();
      expect(useTabsStore.getState().loading).toBe(true);

      resolveQuery!([]);
      await promise;
      expect(useTabsStore.getState().loading).toBe(false);
    });

    it('sends GET_ACTIVE_TABS message', async () => {
      mockTabsQuery.mockResolvedValue([]);
      mockSendMessageSuccess([]);

      await useTabsStore.getState().fetchTabs();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'GET_ACTIVE_TABS', payload: undefined },
        expect.any(Function),
      );
    });
  });

  describe('toggleTab', () => {
    it('adds tabId to activeTabIds when enabling', async () => {
      useTabsStore.setState({ activeTabIds: [1, 2] });
      mockSendMessageSuccess(undefined);

      await useTabsStore.getState().toggleTab(3, true);

      expect(useTabsStore.getState().activeTabIds).toEqual([1, 2, 3]);
    });

    it('removes tabId from activeTabIds when disabling', async () => {
      useTabsStore.setState({ activeTabIds: [1, 2, 3] });
      mockSendMessageSuccess(undefined);

      await useTabsStore.getState().toggleTab(2, false);

      expect(useTabsStore.getState().activeTabIds).toEqual([1, 3]);
    });

    it('sends TOGGLE_TAB message with tabId and enabled', async () => {
      mockSendMessageSuccess(undefined);

      await useTabsStore.getState().toggleTab(42, true);

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'TOGGLE_TAB', payload: { tabId: 42, enabled: true } },
        expect.any(Function),
      );
    });

    it('sends TOGGLE_TAB message when disabling', async () => {
      mockSendMessageSuccess(undefined);

      await useTabsStore.getState().toggleTab(42, false);

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'TOGGLE_TAB', payload: { tabId: 42, enabled: false } },
        expect.any(Function),
      );
    });

    it('rejects on error', async () => {
      mockSendMessageError('Toggle failed');

      await expect(
        useTabsStore.getState().toggleTab(1, true),
      ).rejects.toThrow('Toggle failed');
    });
  });
});
