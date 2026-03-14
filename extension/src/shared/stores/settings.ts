import { create } from 'zustand';
import type { Settings, Theme } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/constants';

interface SettingsState {
  settings: Settings;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    const result = await chrome.storage.local.get('settings');
    set({ settings: result.settings ?? DEFAULT_SETTINGS, loading: false });
  },

  setTheme: async (theme) => {
    const result = await chrome.storage.local.get('settings');
    const updated = { ...(result.settings ?? DEFAULT_SETTINGS), theme };
    await chrome.storage.local.set({ settings: updated });
    set({ settings: updated });
  },
}));
