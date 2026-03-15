import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockStorage: Record<string, unknown> = {};

const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();

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
      addListener: mockAddListener,
      removeListener: mockRemoveListener,
    },
  },
});

// Mock import.meta.env for constants
vi.mock('@/shared/constants', async () => {
  const actual = await vi.importActual<typeof import('@/shared/constants')>('@/shared/constants');
  return {
    ...actual,
    PLAN_PRICE_IDS: { pro: '', team: '' },
  };
});

import { getStorage, setStorage, updateStorage, onStorageChanged, initializeStorage } from './storage';
import { STORAGE_KEYS, DEFAULT_STORAGE } from '@/shared/constants';

describe('storage', () => {
  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
  });

  describe('getStorage', () => {
    it('returns stored value when it exists', async () => {
      mockStorage.rules = [{ id: 'r1' }];
      const result = await getStorage('RULES');
      expect(result).toEqual([{ id: 'r1' }]);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('rules');
    });

    it('returns default value when key does not exist in storage', async () => {
      const result = await getStorage('RULES');
      expect(result).toEqual(DEFAULT_STORAGE.rules);
    });

    it('returns default value when stored value is undefined', async () => {
      mockStorage.rules = undefined;
      const result = await getStorage('RULES');
      expect(result).toEqual([]);
    });

    it('returns stored null without falling back to default', async () => {
      mockStorage.activeTabId = null;
      const result = await getStorage('ACTIVE_TAB_ID');
      expect(result).toBeNull();
    });

    it('maps each storage key correctly', async () => {
      mockStorage.rules = [{ id: 'r1' }];
      const result = await getStorage('RULES');
      expect(result).toEqual([{ id: 'r1' }]);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.RULES);
    });
  });

  describe('setStorage', () => {
    it('sets value using the correct storage key', async () => {
      await setStorage('RULES', []);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ rules: [] });
      expect(mockStorage.rules).toEqual([]);
    });

    it('sets null value', async () => {
      await setStorage('ACTIVE_TAB_ID', null);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ activeTabId: null });
    });

    it('sets string value', async () => {
      await setStorage('AUTH_TOKEN', 'token123');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ authToken: 'token123' });
    });
  });

  describe('updateStorage', () => {
    it('reads current value, applies updater, and stores result', async () => {
      mockStorage.rules = [{ id: 'r1' }];
      const result = await updateStorage('RULES', (rules) => [...rules, { id: 'r2' } as never]);
      expect(result).toEqual([{ id: 'r1' }, { id: 'r2' }]);
      expect(mockStorage.rules).toEqual([{ id: 'r1' }, { id: 'r2' }]);
    });

    it('uses default value when storage is empty', async () => {
      const result = await updateStorage('RULES', (rules) => [...rules, { id: 'r1' } as never]);
      expect(result).toEqual([{ id: 'r1' }]);
    });

    it('returns the updated value', async () => {
      mockStorage.activeTabId = null;
      const result = await updateStorage('ACTIVE_TAB_ID', () => 42);
      expect(result).toBe(42);
    });
  });

  describe('onStorageChanged', () => {
    it('registers a listener on chrome.storage.onChanged', () => {
      const callback = vi.fn();
      onStorageChanged('RULES', callback);
      expect(mockAddListener).toHaveBeenCalledTimes(1);
    });

    it('calls callback when the watched key changes', () => {
      const callback = vi.fn();
      onStorageChanged('RULES', callback);

      const listener = mockAddListener.mock.calls[0][0];
      listener({
        rules: { newValue: [{ id: 'r1' }], oldValue: [] },
      });

      expect(callback).toHaveBeenCalledWith([{ id: 'r1' }], []);
    });

    it('does not call callback when a different key changes', () => {
      const callback = vi.fn();
      onStorageChanged('RULES', callback);

      const listener = mockAddListener.mock.calls[0][0];
      listener({
        activeTabId: { newValue: 1, oldValue: null },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('returns an unsubscribe function that removes the listener', () => {
      const callback = vi.fn();
      const unsubscribe = onStorageChanged('RULES', callback);

      unsubscribe();
      expect(mockRemoveListener).toHaveBeenCalledTimes(1);
      // The same listener function should be passed to removeListener
      const addedListener = mockAddListener.mock.calls[0][0];
      const removedListener = mockRemoveListener.mock.calls[0][0];
      expect(addedListener).toBe(removedListener);
    });
  });

  describe('initializeStorage', () => {
    it('sets default values for keys not present in storage', async () => {
      await initializeStorage();
      expect(chrome.storage.local.get).toHaveBeenCalledWith(null);
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
      const setCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setCall).toEqual(DEFAULT_STORAGE);
    });

    it('does not overwrite existing keys', async () => {
      mockStorage = {
        activeTabId: 5,
        rules: [{ id: 'existing' }],
        collections: [],
        requestLog: [],
        settings: { theme: 'light', defaultDelay: 0, logEnabled: true, maxLogEntries: 500 },
        authToken: 'tok',
        userId: 'u1',
      };

      await initializeStorage();
      // All keys exist, so set should not be called
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('only sets missing keys when some are present', async () => {
      mockStorage = { activeTabId: 5 };

      await initializeStorage();
      const setCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setCall).not.toHaveProperty('activeTabId');
      expect(setCall).toHaveProperty('rules');
      expect(setCall).toHaveProperty('collections');
    });
  });
});
