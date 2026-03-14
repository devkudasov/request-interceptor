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
      mockStorage.activeTabIds = [1, 2, 3];
      const result = await getStorage('ACTIVE_TAB_IDS');
      expect(result).toEqual([1, 2, 3]);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('activeTabIds');
    });

    it('returns default value when key does not exist in storage', async () => {
      const result = await getStorage('ACTIVE_TAB_IDS');
      expect(result).toEqual(DEFAULT_STORAGE.activeTabIds);
    });

    it('returns default value when stored value is undefined', async () => {
      mockStorage.activeTabIds = undefined;
      const result = await getStorage('ACTIVE_TAB_IDS');
      expect(result).toEqual([]);
    });

    it('returns stored boolean false without falling back to default', async () => {
      mockStorage.isRecording = false;
      const result = await getStorage('IS_RECORDING');
      expect(result).toBe(false);
    });

    it('returns stored null without falling back to default when null is valid', async () => {
      mockStorage.recordingTabId = null;
      const result = await getStorage('RECORDING_TAB_ID');
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
      await setStorage('ACTIVE_TAB_IDS', [5, 10]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ activeTabIds: [5, 10] });
      expect(mockStorage.activeTabIds).toEqual([5, 10]);
    });

    it('sets boolean value', async () => {
      await setStorage('IS_RECORDING', true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ isRecording: true });
    });

    it('sets null value', async () => {
      await setStorage('RECORDING_TAB_ID', null);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ recordingTabId: null });
    });
  });

  describe('updateStorage', () => {
    it('reads current value, applies updater, and stores result', async () => {
      mockStorage.activeTabIds = [1, 2];
      const result = await updateStorage('ACTIVE_TAB_IDS', (tabs) => [...tabs, 3]);
      expect(result).toEqual([1, 2, 3]);
      expect(mockStorage.activeTabIds).toEqual([1, 2, 3]);
    });

    it('uses default value when storage is empty', async () => {
      const result = await updateStorage('ACTIVE_TAB_IDS', (tabs) => [...tabs, 42]);
      expect(result).toEqual([42]);
    });

    it('returns the updated value', async () => {
      mockStorage.isRecording = false;
      const result = await updateStorage('IS_RECORDING', () => true);
      expect(result).toBe(true);
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
        activeTabIds: { newValue: [1], oldValue: [] },
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
        activeTabIds: [1, 2],
        isRecording: true,
        recordingTabId: 5,
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
      mockStorage = { activeTabIds: [1] };

      await initializeStorage();
      const setCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setCall).not.toHaveProperty('activeTabIds');
      expect(setCall).toHaveProperty('isRecording');
      expect(setCall).toHaveProperty('rules');
    });
  });
});
