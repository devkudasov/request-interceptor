import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from './settings';

const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn(),
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: { get: mockStorageGet, set: mockStorageSet },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn() },
});

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with default settings', () => {
      const state = useSettingsStore.getState();
      expect(state.settings).toEqual({
        theme: 'dark',
        defaultDelay: 0,
        logEnabled: true,
        maxLogEntries: 1000,
      });
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchSettings', () => {
    it('fetches settings from chrome.storage.local', async () => {
      const settings = {
        theme: 'light' as const,
        defaultDelay: 100,
        logEnabled: false,
        maxLogEntries: 500,
      };
      mockStorageGet.mockResolvedValue({ settings });

      await useSettingsStore.getState().fetchSettings();

      expect(useSettingsStore.getState().settings).toEqual(settings);
      expect(useSettingsStore.getState().loading).toBe(false);
    });

    it('uses default settings when no settings in storage', async () => {
      mockStorageGet.mockResolvedValue({});

      await useSettingsStore.getState().fetchSettings();

      expect(useSettingsStore.getState().settings).toEqual({
        theme: 'dark',
        defaultDelay: 0,
        logEnabled: true,
        maxLogEntries: 1000,
      });
    });

    it('sets loading during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      mockStorageGet.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
      );

      const promise = useSettingsStore.getState().fetchSettings();
      expect(useSettingsStore.getState().loading).toBe(true);

      resolvePromise!({});
      await promise;
      expect(useSettingsStore.getState().loading).toBe(false);
    });

    it('calls chrome.storage.local.get with settings key', async () => {
      mockStorageGet.mockResolvedValue({});

      await useSettingsStore.getState().fetchSettings();

      expect(mockStorageGet).toHaveBeenCalledWith('settings');
    });
  });

  describe('setTheme', () => {
    it('updates theme in state', async () => {
      mockStorageGet.mockResolvedValue({});
      mockStorageSet.mockResolvedValue(undefined);

      await useSettingsStore.getState().setTheme('light');

      expect(useSettingsStore.getState().settings.theme).toBe('light');
    });

    it('persists updated settings to chrome.storage.local', async () => {
      mockStorageGet.mockResolvedValue({
        settings: {
          theme: 'dark',
          defaultDelay: 0,
          logEnabled: true,
          maxLogEntries: 1000,
        },
      });
      mockStorageSet.mockResolvedValue(undefined);

      await useSettingsStore.getState().setTheme('system');

      expect(mockStorageSet).toHaveBeenCalledWith({
        settings: expect.objectContaining({ theme: 'system' }),
      });
    });

    it('preserves other settings when changing theme', async () => {
      const existingSettings = {
        theme: 'dark' as const,
        defaultDelay: 200,
        logEnabled: false,
        maxLogEntries: 500,
      };
      mockStorageGet.mockResolvedValue({ settings: existingSettings });
      mockStorageSet.mockResolvedValue(undefined);

      await useSettingsStore.getState().setTheme('light');

      const updated = useSettingsStore.getState().settings;
      expect(updated.theme).toBe('light');
      expect(updated.defaultDelay).toBe(200);
      expect(updated.logEnabled).toBe(false);
      expect(updated.maxLogEntries).toBe(500);
    });

    it('uses default settings when no settings in storage', async () => {
      mockStorageGet.mockResolvedValue({});
      mockStorageSet.mockResolvedValue(undefined);

      await useSettingsStore.getState().setTheme('light');

      expect(mockStorageSet).toHaveBeenCalledWith({
        settings: {
          theme: 'light',
          defaultDelay: 0,
          logEnabled: true,
          maxLogEntries: 1000,
        },
      });
    });
  });
});
