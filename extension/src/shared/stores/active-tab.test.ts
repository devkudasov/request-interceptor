import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useActiveTabStore } from './active-tab';

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

describe('useActiveTabStore', () => {
  beforeEach(() => {
    useActiveTabStore.setState(useActiveTabStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('has activeTabId as null', () => {
      const state = useActiveTabStore.getState();
      expect(state.activeTabId).toBeNull();
    });

    it('has tabs as empty array', () => {
      const state = useActiveTabStore.getState();
      expect(state.tabs).toEqual([]);
    });

    it('has loading as false', () => {
      const state = useActiveTabStore.getState();
      expect(state.loading).toBe(false);
    });

    it('does NOT have activeTabIds (multi-tab removed)', () => {
      const state = useActiveTabStore.getState() as unknown as Record<string, unknown>;
      expect(state.activeTabIds).toBeUndefined();
    });

    it('does NOT have toggleTab method', () => {
      const state = useActiveTabStore.getState() as unknown as Record<string, unknown>;
      expect(state.toggleTab).toBeUndefined();
    });
  });

  describe('setActiveTab', () => {
    it('sets activeTabId to the given tabId', async () => {
      mockSendMessageSuccess(undefined);

      await useActiveTabStore.getState().setActiveTab(42);

      expect(useActiveTabStore.getState().activeTabId).toBe(42);
    });

    it('sends SET_ACTIVE_TAB message with tabId', async () => {
      mockSendMessageSuccess(undefined);

      await useActiveTabStore.getState().setActiveTab(42);

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'SET_ACTIVE_TAB', payload: { tabId: 42 } },
        expect.any(Function),
      );
    });

    it('replaces previously active tab (single-tab, not additive)', async () => {
      mockSendMessageSuccess(undefined);

      await useActiveTabStore.getState().setActiveTab(1);
      expect(useActiveTabStore.getState().activeTabId).toBe(1);

      await useActiveTabStore.getState().setActiveTab(2);
      expect(useActiveTabStore.getState().activeTabId).toBe(2);
    });

    it('rejects on error', async () => {
      mockSendMessageError('Set active tab failed');

      await expect(
        useActiveTabStore.getState().setActiveTab(1),
      ).rejects.toThrow('Set active tab failed');
    });
  });

  describe('clearActiveTab', () => {
    it('sets activeTabId to null', async () => {
      mockSendMessageSuccess(undefined);
      useActiveTabStore.setState({ activeTabId: 42 });

      await useActiveTabStore.getState().clearActiveTab();

      expect(useActiveTabStore.getState().activeTabId).toBeNull();
    });

    it('sends SET_ACTIVE_TAB message with null tabId', async () => {
      mockSendMessageSuccess(undefined);

      await useActiveTabStore.getState().clearActiveTab();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'SET_ACTIVE_TAB', payload: { tabId: null } },
        expect.any(Function),
      );
    });

    it('rejects on error', async () => {
      mockSendMessageError('Clear failed');

      await expect(
        useActiveTabStore.getState().clearActiveTab(),
      ).rejects.toThrow('Clear failed');
    });
  });

  describe('setActiveTab — edge cases', () => {
    it('calling setActiveTab twice rapidly results in the last tabId being stored', async () => {
      mockSendMessageSuccess(undefined);

      const first = useActiveTabStore.getState().setActiveTab(10);
      const second = useActiveTabStore.getState().setActiveTab(20);
      await Promise.all([first, second]);

      expect(useActiveTabStore.getState().activeTabId).toBe(20);
    });
  });

  describe('clearActiveTab — edge cases', () => {
    it('calling clearActiveTab when already null still sends the message (idempotent)', async () => {
      mockSendMessageSuccess(undefined);
      expect(useActiveTabStore.getState().activeTabId).toBeNull();

      await useActiveTabStore.getState().clearActiveTab();

      expect(useActiveTabStore.getState().activeTabId).toBeNull();
      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'SET_ACTIVE_TAB', payload: { tabId: null } },
        expect.any(Function),
      );
    });
  });

  describe('fetchTabs', () => {
    it('fetches tabs from chrome.tabs.query', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
      ]);
      mockSendMessageSuccess(null);

      await useActiveTabStore.getState().fetchTabs();

      const state = useActiveTabStore.getState();
      expect(state.tabs).toHaveLength(2);
    });

    it('fetches current activeTabId from background', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
      ]);
      mockSendMessageSuccess(42);

      await useActiveTabStore.getState().fetchTabs();

      expect(useActiveTabStore.getState().activeTabId).toBe(42);
    });

    it('filters out chrome:// URLs', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'chrome://extensions' },
        { id: 3, url: 'chrome://settings' },
      ]);
      mockSendMessageSuccess(null);

      await useActiveTabStore.getState().fetchTabs();

      expect(useActiveTabStore.getState().tabs).toHaveLength(1);
      expect(useActiveTabStore.getState().tabs[0].id).toBe(1);
    });

    it('filters out chrome-extension:// URLs', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'chrome-extension://some-id/popup.html' },
      ]);
      mockSendMessageSuccess(null);

      await useActiveTabStore.getState().fetchTabs();

      expect(useActiveTabStore.getState().tabs).toHaveLength(1);
    });

    it('filters out tabs with no url', async () => {
      mockTabsQuery.mockResolvedValue([
        { id: 1, url: 'https://example.com' },
        { id: 2 },
        { id: 3, url: undefined },
      ]);
      mockSendMessageSuccess(null);

      await useActiveTabStore.getState().fetchTabs();

      expect(useActiveTabStore.getState().tabs).toHaveLength(1);
    });

    it('returns empty array when no open tabs', async () => {
      mockTabsQuery.mockResolvedValue([]);
      mockSendMessageSuccess(null);

      await useActiveTabStore.getState().fetchTabs();

      expect(useActiveTabStore.getState().tabs).toEqual([]);
    });

    it('sets loading during fetch', async () => {
      let resolveQuery: (value: unknown) => void;
      mockTabsQuery.mockReturnValue(
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
      );
      mockSendMessageSuccess(null);

      const promise = useActiveTabStore.getState().fetchTabs();
      expect(useActiveTabStore.getState().loading).toBe(true);

      resolveQuery!([]);
      await promise;
      expect(useActiveTabStore.getState().loading).toBe(false);
    });
  });
});
