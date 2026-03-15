import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';

interface ActiveTabState {
  activeTabId: number | null;
  tabs: chrome.tabs.Tab[];
  loading: boolean;
  setActiveTab: (tabId: number) => Promise<void>;
  clearActiveTab: () => Promise<void>;
  fetchTabs: () => Promise<void>;
}

export const useActiveTabStore = create<ActiveTabState>((set) => ({
  activeTabId: null,
  tabs: [],
  loading: false,

  setActiveTab: async (tabId: number) => {
    await sendMessage(MESSAGE_TYPES.SET_ACTIVE_TAB, { tabId });
    set({ activeTabId: tabId });
  },

  clearActiveTab: async () => {
    await sendMessage(MESSAGE_TYPES.SET_ACTIVE_TAB, { tabId: null });
    set({ activeTabId: null });
  },

  fetchTabs: async () => {
    set({ loading: true });
    const [tabs, activeTabId] = await Promise.all([
      chrome.tabs.query({}),
      sendMessage<number | null>(MESSAGE_TYPES.GET_ACTIVE_TABS),
    ]);
    const filteredTabs = tabs.filter(
      (t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'),
    );
    set({ tabs: filteredTabs, activeTabId, loading: false });
  },
}));
