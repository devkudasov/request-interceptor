import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';

interface TabsState {
  tabs: chrome.tabs.Tab[];
  activeTabIds: number[];
  loading: boolean;
  fetchTabs: () => Promise<void>;
  toggleTab: (tabId: number, enabled: boolean) => Promise<void>;
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeTabIds: [],
  loading: false,

  fetchTabs: async () => {
    set({ loading: true });
    const [tabs, activeTabIds] = await Promise.all([
      chrome.tabs.query({}),
      sendMessage<number[]>(MESSAGE_TYPES.GET_ACTIVE_TABS),
    ]);
    const filteredTabs = tabs.filter(
      (t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'),
    );
    set({ tabs: filteredTabs, activeTabIds, loading: false });
  },

  toggleTab: async (tabId, enabled) => {
    await sendMessage(MESSAGE_TYPES.TOGGLE_TAB, { tabId, enabled });
    set((s) => ({
      activeTabIds: enabled
        ? [...s.activeTabIds, tabId]
        : s.activeTabIds.filter((id) => id !== tabId),
    }));
  },
}));
