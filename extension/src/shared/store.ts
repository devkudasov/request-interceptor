import { create } from 'zustand';
import type {
  MockRule,
  Collection,
  LogEntry,
  Settings,
  Theme,
  AuthUser,
  Team,
  TeamMember,
  TeamInvite,
  TeamRole,
  ConflictStrategy,
  VersionSnapshot,
} from './types';
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
  startAuthListener: () => void;
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

  startAuthListener: () => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === MESSAGE_TYPES.AUTH_STATE_CHANGED) {
        set({ user: message.payload as AuthUser | null });
      }
    });
  },
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

// --- Teams Store ---
interface TeamsState {
  team: (Team & { members: TeamMember[] }) | null;
  pendingInvites: TeamInvite[];
  loading: boolean;
  error: string | null;
  createTeam: (name: string) => Promise<void>;
  fetchTeam: (teamId?: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  inviteMember: (teamId: string, email: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  fetchInvites: () => Promise<void>;
  updateRole: (teamId: string, userId: string, role: TeamRole) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  team: null,
  pendingInvites: [],
  loading: false,
  error: null,

  createTeam: async (name) => {
    set({ loading: true, error: null });
    try {
      const team = await sendMessage<Team & { members: TeamMember[] }>(
        MESSAGE_TYPES.CREATE_TEAM,
        { name },
      );
      set({ team, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  fetchTeam: async (teamId) => {
    set({ loading: true, error: null });
    try {
      if (!teamId) {
        const teams = await sendMessage<Team[]>(MESSAGE_TYPES.GET_USER_TEAMS);
        if (teams.length > 0) {
          const team = await sendMessage<(Team & { members: TeamMember[] }) | null>(
            MESSAGE_TYPES.GET_TEAM,
            { teamId: teams[0].id },
          );
          set({ team, loading: false });
        } else {
          set({ team: null, loading: false });
        }
      } else {
        const team = await sendMessage<(Team & { members: TeamMember[] }) | null>(
          MESSAGE_TYPES.GET_TEAM,
          { teamId },
        );
        set({ team, loading: false });
      }
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  deleteTeam: async (teamId) => {
    set({ loading: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.DELETE_TEAM, { teamId });
      set({ team: null, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  inviteMember: async (teamId, email) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.INVITE_MEMBER, { teamId, email });
      await get().fetchTeam(teamId);
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  acceptInvite: async (inviteId) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.ACCEPT_INVITE, { inviteId });
      set((s) => ({ pendingInvites: s.pendingInvites.filter((i) => i.id !== inviteId) }));
      await get().fetchTeam();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  declineInvite: async (inviteId) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.DECLINE_INVITE, { inviteId });
      set((s) => ({ pendingInvites: s.pendingInvites.filter((i) => i.id !== inviteId) }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  fetchInvites: async () => {
    set({ error: null });
    try {
      const invites = await sendMessage<TeamInvite[]>(MESSAGE_TYPES.GET_PENDING_INVITES);
      set({ pendingInvites: invites });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updateRole: async (teamId, userId, role) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.UPDATE_MEMBER_ROLE, { teamId, userId, role });
      await get().fetchTeam(teamId);
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  removeMember: async (teamId, userId) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.REMOVE_MEMBER, { teamId, userId });
      await get().fetchTeam(teamId);
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
}));

// --- Sync Store ---
interface SyncState {
  syncing: boolean;
  lastSyncAt: string | null;
  conflict: { local: { name: string }; remote: { name: string } } | null;
  error: string | null;
  pushToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  resolveConflict: (strategy: ConflictStrategy) => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  syncing: false,
  lastSyncAt: null,
  conflict: null,
  error: null,

  pushToCloud: async () => {
    set({ syncing: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.PUSH_COLLECTION);
      set({ syncing: false, lastSyncAt: new Date().toISOString() });
    } catch (err) {
      set({ syncing: false, error: (err as Error).message });
    }
  },

  pullFromCloud: async () => {
    set({ syncing: true, error: null });
    try {
      const result = await sendMessage<{ conflict?: { local: { name: string }; remote: { name: string } } }>(
        MESSAGE_TYPES.PULL_COLLECTION,
      );
      if (result?.conflict) {
        set({ syncing: false, conflict: result.conflict });
      } else {
        set({ syncing: false, lastSyncAt: new Date().toISOString(), conflict: null });
      }
    } catch (err) {
      set({ syncing: false, error: (err as Error).message });
    }
  },

  resolveConflict: async (strategy) => {
    set({ syncing: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.PULL_COLLECTION, { strategy });
      set({ syncing: false, conflict: null, lastSyncAt: new Date().toISOString() });
    } catch (err) {
      set({ syncing: false, error: (err as Error).message });
    }
  },
}));

// --- Version History Store ---
interface VersionHistoryState {
  versions: VersionSnapshot[];
  selectedVersion: VersionSnapshot | null;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  fetchVersions: (teamId: string, collectionId: string) => Promise<void>;
  loadMore: (teamId: string, collectionId: string) => Promise<void>;
  selectVersion: (teamId: string, collectionId: string, versionId: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  clearSelection: () => void;
}

export const useVersionStore = create<VersionHistoryState>((set, get) => ({
  versions: [],
  selectedVersion: null,
  loading: false,
  hasMore: false,
  error: null,

  fetchVersions: async (teamId, collectionId) => {
    set({ loading: true, error: null, versions: [], selectedVersion: null });
    try {
      const versions = await sendMessage<VersionSnapshot[]>(
        MESSAGE_TYPES.GET_VERSION_HISTORY,
        { teamId, collectionId },
      );
      set({ versions, loading: false, hasMore: versions.length >= 20 });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loadMore: async (teamId, collectionId) => {
    const { versions } = get();
    const lastVersion = versions[versions.length - 1];
    if (!lastVersion) return;

    set({ loading: true, error: null });
    try {
      const moreVersions = await sendMessage<VersionSnapshot[]>(
        MESSAGE_TYPES.GET_VERSION_HISTORY,
        { teamId, collectionId, startAfterId: lastVersion.id },
      );
      set((s) => ({
        versions: [...s.versions, ...moreVersions],
        loading: false,
        hasMore: moreVersions.length >= 20,
      }));
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  selectVersion: async (teamId, collectionId, versionId) => {
    set({ loading: true, error: null });
    try {
      const version = await sendMessage<VersionSnapshot | null>(
        MESSAGE_TYPES.GET_VERSION,
        { teamId, collectionId, versionId },
      );
      set({ selectedVersion: version, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  restoreVersion: async (versionId) => {
    set({ loading: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.RESTORE_VERSION, { versionId });
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  clearSelection: () => set({ selectedVersion: null }),
}));

// --- Workspace UI Store ---
type WorkspaceTypeTab = 'http' | 'websocket' | 'graphql';

interface WorkspaceUIState {
  activeTypeTab: WorkspaceTypeTab;
  setActiveTypeTab: (tab: WorkspaceTypeTab) => void;
  collapsedCollections: Set<string>;
  toggleCollectionCollapsed: (id: string) => Promise<void>;
  loadCollapsedState: () => Promise<void>;
}

export const useWorkspaceUIStore = create<WorkspaceUIState>((set, get) => ({
  activeTypeTab: 'http',
  collapsedCollections: new Set(),

  setActiveTypeTab: (tab) => set({ activeTypeTab: tab }),

  toggleCollectionCollapsed: async (id) => {
    const { collapsedCollections } = get();
    const next = new Set(collapsedCollections);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ collapsedCollections: next });
    await chrome.storage.session.set({ collapsedCollections: [...next] });
  },

  loadCollapsedState: async () => {
    const result = await chrome.storage.session.get(['collapsedCollections']);
    const ids: string[] = result.collapsedCollections ?? [];
    set({ collapsedCollections: new Set(ids) });
  },
}));
