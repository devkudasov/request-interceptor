import { create } from 'zustand';
import type { MockRule, Collection, LogEntry, Settings, Theme, AuthUser } from './types';
import { DEFAULT_SETTINGS, MESSAGE_TYPES } from './constants';
import { v4 as uuid } from 'uuid';

function sendMessage<T = unknown>(type: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.ok) {
        resolve(response.data as T);
      } else {
        reject(new Error(response?.error ?? 'Unknown error'));
      }
    });
  });
}

// --- Rules Store ---
interface RulesState {
  rules: MockRule[];
  loading: boolean;
  fetchRules: () => Promise<void>;
  createRule: (rule: Omit<MockRule, 'id' | 'createdAt' | 'updatedAt' | 'priority'>) => Promise<MockRule>;
  updateRule: (id: string, changes: Partial<MockRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  reorderRules: (orderedIds: string[]) => Promise<void>;
}

export const useRulesStore = create<RulesState>((set, get) => ({
  rules: [],
  loading: false,

  fetchRules: async () => {
    set({ loading: true });
    const rules = await sendMessage<MockRule[]>(MESSAGE_TYPES.GET_RULES);
    set({ rules: rules.sort((a, b) => a.priority - b.priority), loading: false });
  },

  createRule: async (ruleData) => {
    const now = new Date().toISOString();
    const rule: MockRule = {
      ...ruleData,
      id: uuid(),
      priority: get().rules.length,
      createdAt: now,
      updatedAt: now,
    };
    await sendMessage(MESSAGE_TYPES.CREATE_RULE, rule);
    set((s) => ({ rules: [...s.rules, rule] }));
    return rule;
  },

  updateRule: async (id, changes) => {
    await sendMessage(MESSAGE_TYPES.UPDATE_RULE, { id, changes });
    set((s) => ({
      rules: s.rules.map((r) =>
        r.id === id ? { ...r, ...changes, updatedAt: new Date().toISOString() } : r,
      ),
    }));
  },

  deleteRule: async (id) => {
    await sendMessage(MESSAGE_TYPES.DELETE_RULE, { id });
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
  },

  toggleRule: async (id) => {
    await sendMessage(MESSAGE_TYPES.TOGGLE_RULE, { id });
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    }));
  },

  reorderRules: async (orderedIds) => {
    await sendMessage(MESSAGE_TYPES.REORDER_RULES, { orderedIds });
    set((s) => {
      const map = new Map(s.rules.map((r) => [r.id, r]));
      return {
        rules: orderedIds
          .map((id, i) => {
            const rule = map.get(id);
            return rule ? { ...rule, priority: i } : null;
          })
          .filter((r): r is MockRule => r !== null),
      };
    });
  },
}));

// --- Collections Store ---
interface CollectionsState {
  collections: Collection[];
  loading: boolean;
  fetchCollections: () => Promise<void>;
  createCollection: (name: string, parentId?: string | null) => Promise<Collection>;
  updateCollection: (id: string, changes: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  toggleCollection: (id: string) => Promise<void>;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  loading: false,

  fetchCollections: async () => {
    set({ loading: true });
    const collections = await sendMessage<Collection[]>(MESSAGE_TYPES.GET_COLLECTIONS);
    set({ collections, loading: false });
  },

  createCollection: async (name, parentId = null) => {
    const now = new Date().toISOString();
    const collection: Collection = {
      id: uuid(),
      name,
      parentId,
      enabled: true,
      order: get().collections.length,
      ruleIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await sendMessage(MESSAGE_TYPES.CREATE_COLLECTION, collection);
    set((s) => ({ collections: [...s.collections, collection] }));
    return collection;
  },

  updateCollection: async (id, changes) => {
    await sendMessage(MESSAGE_TYPES.UPDATE_COLLECTION, { id, changes });
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c,
      ),
    }));
  },

  deleteCollection: async (id) => {
    await sendMessage(MESSAGE_TYPES.DELETE_COLLECTION, { id });
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
  },

  toggleCollection: async (id) => {
    await sendMessage(MESSAGE_TYPES.TOGGLE_COLLECTION, { id });
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c,
      ),
    }));
  },
}));

// --- Settings Store ---
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

// --- Tabs Store ---
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
    // Filter out chrome:// and extension pages
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

// --- Auth Store ---
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const user = await sendMessage<AuthUser>(MESSAGE_TYPES.LOGIN, { email, password });
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  register: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const user = await sendMessage<AuthUser>(MESSAGE_TYPES.REGISTER, { email, password });
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const user = await sendMessage<AuthUser>(MESSAGE_TYPES.LOGIN_GOOGLE);
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loginWithGithub: async () => {
    set({ loading: true, error: null });
    try {
      const user = await sendMessage<AuthUser>(MESSAGE_TYPES.LOGIN_GITHUB);
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.LOGOUT);
      set({ user: null, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  fetchUser: async () => {
    set({ loading: true });
    try {
      const user = await sendMessage<AuthUser | null>(MESSAGE_TYPES.GET_CURRENT_USER);
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// --- Log Store ---
interface LogState {
  entries: LogEntry[];
  paused: boolean;
  fetchLog: () => Promise<void>;
  clearLog: () => Promise<void>;
  togglePause: () => void;
  addEntry: (entry: LogEntry) => void;
  startListening: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  paused: false,

  fetchLog: async () => {
    const result = await chrome.storage.local.get('requestLog');
    set({ entries: result.requestLog ?? [] });
  },

  clearLog: async () => {
    await sendMessage(MESSAGE_TYPES.CLEAR_LOG);
    set({ entries: [] });
  },

  togglePause: () => set((s) => ({ paused: !s.paused })),

  addEntry: (entry) =>
    set((s) => {
      if (s.paused) return s;
      return { entries: [entry, ...s.entries].slice(0, 1000) };
    }),

  startListening: () => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === MESSAGE_TYPES.LOG_ENTRY && message.payload) {
        useLogStore.getState().addEntry(message.payload as LogEntry);
      }
    });
  },
}));

// --- Recording Store ---
interface RecordingState {
  isRecording: boolean;
  recordingTabId: number | null;
  recordedEntries: LogEntry[];
  startRecording: (tabId: number) => Promise<void>;
  stopRecording: () => Promise<LogEntry[]>;
  fetchRecordingData: () => Promise<void>;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  recordingTabId: null,
  recordedEntries: [],

  startRecording: async (tabId) => {
    await sendMessage(MESSAGE_TYPES.START_RECORDING, { tabId });
    set({ isRecording: true, recordingTabId: tabId, recordedEntries: [] });
  },

  stopRecording: async () => {
    const entries = await sendMessage<LogEntry[]>(MESSAGE_TYPES.STOP_RECORDING);
    set({ isRecording: false, recordingTabId: null, recordedEntries: entries });
    return entries;
  },

  fetchRecordingData: async () => {
    const entries = await sendMessage<LogEntry[]>(MESSAGE_TYPES.RECORDING_DATA);
    set({ recordedEntries: entries });
  },
}));
