import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockStorage: Record<string, unknown> = {};
let messageListenerCallback: ((message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void) | null = null;

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
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn((cb: typeof messageListenerCallback) => {
        messageListenerCallback = cb;
      }),
    },
    sendMessage: vi.fn(() => Promise.resolve()),
    id: 'test-extension-id',
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  },
  scripting: {
    executeScript: vi.fn(() => Promise.resolve()),
  },
  tabs: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onUpdated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
  },
});

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid'),
}));

vi.mock('@/shared/constants', async () => {
  const actual = await vi.importActual<typeof import('@/shared/constants')>('@/shared/constants');
  return {
    ...actual,
    PLAN_PRICE_IDS: { pro: '', team: '' },
  };
});

// Mock firebase modules to avoid loading real Firebase
vi.mock('./firebase-auth', () => ({
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithGithub: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('./firestore-teams', () => ({
  createTeam: vi.fn(),
  inviteMember: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  deleteTeam: vi.fn(),
  getTeam: vi.fn(),
  getUserTeams: vi.fn(),
  getPendingInvites: vi.fn(),
}));

vi.mock('./firestore-sync', () => ({
  pushCollection: vi.fn(),
  pullCollection: vi.fn(),
  detectConflicts: vi.fn(),
  resolveConflict: vi.fn(),
  getLastSyncTimestamp: vi.fn(),
}));

vi.mock('./firestore-versions', () => ({
  getVersionHistory: vi.fn(),
  getVersion: vi.fn(),
  restoreVersion: vi.fn(),
}));

vi.mock('./tab-manager', () => ({
  setActiveTab: vi.fn(() => Promise.resolve()),
  clearActiveTab: vi.fn(() => Promise.resolve()),
  getActiveTabId: vi.fn(() => Promise.resolve(null)),
}));

import { setupMessageHandler } from './message-handler';
import { MESSAGE_TYPES } from '@/shared/constants';
import { setActiveTab, clearActiveTab } from './tab-manager';

function sendMessage(type: string, payload?: unknown, sender?: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    const senderObj = sender ?? { tab: { id: 1 } };
    messageListenerCallback!({ type, payload }, senderObj, resolve);
  });
}

describe('message-handler', () => {
  beforeEach(() => {
    mockStorage = {};
    messageListenerCallback = null;
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers a message listener on chrome.runtime.onMessage', () => {
    setupMessageHandler();
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    expect(messageListenerCallback).toBeTypeOf('function');
  });

  it('returns true from the listener to keep the channel open', () => {
    setupMessageHandler();
    const result = messageListenerCallback!(
      { type: MESSAGE_TYPES.GET_RULES },
      {},
      () => {},
    );
    expect(result).toBe(true);
  });

  describe('unknown message type', () => {
    it('returns error for unknown message types', async () => {
      setupMessageHandler();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await sendMessage('TOTALLY_UNKNOWN_TYPE');

      expect(response).toEqual({ ok: false, error: 'Unknown message type' });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown message type: TOTALLY_UNKNOWN_TYPE'),
      );
      warnSpy.mockRestore();
    });
  });

  describe('SET_ACTIVE_TAB', () => {
    it('calls setActiveTab when payload has a tabId', async () => {
      setupMessageHandler();

      const response = await sendMessage(MESSAGE_TYPES.SET_ACTIVE_TAB, { tabId: 5 });

      expect(setActiveTab).toHaveBeenCalledWith(5);
      expect((response as { ok: boolean }).ok).toBe(true);
    });

    it('calls clearActiveTab when payload tabId is null', async () => {
      setupMessageHandler();

      const response = await sendMessage(MESSAGE_TYPES.SET_ACTIVE_TAB, { tabId: null });

      expect(clearActiveTab).toHaveBeenCalled();
      expect(setActiveTab).not.toHaveBeenCalled();
      expect((response as { ok: boolean }).ok).toBe(true);
    });
  });

  describe('no TOGGLE_TAB handler', () => {
    it('returns error for TOGGLE_TAB message (handler does not exist)', async () => {
      setupMessageHandler();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await sendMessage('TOGGLE_TAB', { tabId: 5, enabled: true });

      expect(response).toEqual({ ok: false, error: 'Unknown message type' });
      warnSpy.mockRestore();
    });
  });

  describe('no recording handlers', () => {
    it('returns error for START_RECORDING (handler does not exist)', async () => {
      setupMessageHandler();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await sendMessage('START_RECORDING', { tabId: 5 });

      expect(response).toEqual({ ok: false, error: 'Unknown message type' });
      warnSpy.mockRestore();
    });

    it('returns error for STOP_RECORDING (handler does not exist)', async () => {
      setupMessageHandler();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await sendMessage('STOP_RECORDING');

      expect(response).toEqual({ ok: false, error: 'Unknown message type' });
      warnSpy.mockRestore();
    });

    it('returns error for RECORDING_DATA (handler does not exist)', async () => {
      setupMessageHandler();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await sendMessage('RECORDING_DATA');

      expect(response).toEqual({ ok: false, error: 'Unknown message type' });
      warnSpy.mockRestore();
    });
  });

  describe('GET_RULES', () => {
    it('returns rules from storage', async () => {
      setupMessageHandler();
      const rules = [{ id: 'r1', enabled: true }];
      mockStorage.rules = rules;

      const response = await sendMessage(MESSAGE_TYPES.GET_RULES);
      expect(response).toEqual({ ok: true, data: rules });
    });
  });

  describe('CREATE_RULE', () => {
    it('adds a new rule and broadcasts to active tab', async () => {
      setupMessageHandler();
      mockStorage.rules = [];
      mockStorage.activeTabId = null;

      const newRule = { id: 'r1', enabled: true, priority: 0 };
      const response = await sendMessage(MESSAGE_TYPES.CREATE_RULE, newRule);

      expect(response).toEqual({ ok: true, data: newRule });
      expect((mockStorage.rules as unknown[]).length).toBe(1);
    });
  });

  describe('UPDATE_RULE', () => {
    it('updates an existing rule by id', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'r1', enabled: true, statusCode: 200, priority: 0 }];
      mockStorage.activeTabId = null;

      await sendMessage(MESSAGE_TYPES.UPDATE_RULE, { id: 'r1', changes: { statusCode: 404 } });

      const rules = mockStorage.rules as Array<{ id: string; statusCode: number }>;
      expect(rules[0].statusCode).toBe(404);
    });
  });

  describe('DELETE_RULE', () => {
    it('removes rule by id', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'r1' }, { id: 'r2' }];
      mockStorage.activeTabId = null;

      await sendMessage(MESSAGE_TYPES.DELETE_RULE, { id: 'r1' });

      const rules = mockStorage.rules as Array<{ id: string }>;
      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe('r2');
    });
  });

  describe('TOGGLE_RULE', () => {
    it('toggles rule enabled state', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'r1', enabled: true, priority: 0 }];
      mockStorage.activeTabId = null;

      await sendMessage(MESSAGE_TYPES.TOGGLE_RULE, { id: 'r1' });

      const rules = mockStorage.rules as Array<{ id: string; enabled: boolean }>;
      expect(rules[0].enabled).toBe(false);
    });
  });

  describe('REORDER_RULES', () => {
    it('reorders rules and assigns priorities', async () => {
      setupMessageHandler();
      mockStorage.rules = [
        { id: 'a', priority: 0 },
        { id: 'b', priority: 1 },
        { id: 'c', priority: 2 },
      ];
      mockStorage.activeTabId = null;

      await sendMessage(MESSAGE_TYPES.REORDER_RULES, { orderedIds: ['c', 'a', 'b'] });

      const rules = mockStorage.rules as Array<{ id: string; priority: number }>;
      expect(rules[0]).toEqual(expect.objectContaining({ id: 'c', priority: 0 }));
      expect(rules[1]).toEqual(expect.objectContaining({ id: 'a', priority: 1 }));
      expect(rules[2]).toEqual(expect.objectContaining({ id: 'b', priority: 2 }));
    });

    it('filters out non-existent rule ids', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'a', priority: 0 }];
      mockStorage.activeTabId = null;

      await sendMessage(MESSAGE_TYPES.REORDER_RULES, { orderedIds: ['a', 'nonexistent'] });

      const rules = mockStorage.rules as Array<{ id: string }>;
      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe('a');
    });
  });

  describe('Collections', () => {
    it('GET_COLLECTIONS returns collections', async () => {
      setupMessageHandler();
      mockStorage.collections = [{ id: 'c1', name: 'Test' }];

      const response = await sendMessage(MESSAGE_TYPES.GET_COLLECTIONS);
      expect(response).toEqual({ ok: true, data: [{ id: 'c1', name: 'Test' }] });
    });

    it('CREATE_COLLECTION adds a collection', async () => {
      setupMessageHandler();
      mockStorage.collections = [];

      const col = { id: 'c1', name: 'New Collection' };
      const response = await sendMessage(MESSAGE_TYPES.CREATE_COLLECTION, col);
      expect(response).toEqual({ ok: true, data: col });
      expect((mockStorage.collections as unknown[]).length).toBe(1);
    });

    it('DELETE_COLLECTION removes collection and clears collectionId from rules', async () => {
      setupMessageHandler();
      mockStorage.collections = [{ id: 'c1' }, { id: 'c2' }];
      mockStorage.rules = [
        { id: 'r1', collectionId: 'c1' },
        { id: 'r2', collectionId: 'c2' },
      ];

      await sendMessage(MESSAGE_TYPES.DELETE_COLLECTION, { id: 'c1' });

      const collections = mockStorage.collections as Array<{ id: string }>;
      expect(collections.length).toBe(1);
      expect(collections[0].id).toBe('c2');

      const rules = mockStorage.rules as Array<{ id: string; collectionId: string | null }>;
      expect(rules[0].collectionId).toBeNull();
      expect(rules[1].collectionId).toBe('c2');
    });
  });

  describe('LOG_ENTRY', () => {
    it('creates a log entry and broadcasts without recording check', async () => {
      setupMessageHandler();
      mockStorage.requestLog = [];

      const response = await sendMessage(
        MESSAGE_TYPES.LOG_ENTRY,
        {
          method: 'GET',
          url: 'https://example.com',
          statusCode: 200,
          duration: 100,
          mocked: false,
        },
        { tab: { id: 42 } },
      );

      const data = (response as { ok: boolean; data: { tabId: number } }).data;
      expect(data.tabId).toBe(42);

      // Should broadcast to side panel
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPES.LOG_ENTRY,
        }),
      );
    });

    it('uses tabId 0 when sender has no tab', async () => {
      setupMessageHandler();
      mockStorage.requestLog = [];

      const response = await sendMessage(
        MESSAGE_TYPES.LOG_ENTRY,
        {
          method: 'GET',
          url: 'https://example.com',
          statusCode: 200,
          duration: 100,
          mocked: false,
        },
        {},
      );

      const data = (response as { ok: boolean; data: { tabId: number } }).data;
      expect(data.tabId).toBe(0);
    });

    it('does NOT check recording state or call addRecordedResponse', async () => {
      setupMessageHandler();
      mockStorage.requestLog = [];

      // Even if isRecording were somehow true, LOG_ENTRY should not reference recording
      await sendMessage(
        MESSAGE_TYPES.LOG_ENTRY,
        {
          method: 'GET',
          url: 'https://example.com',
          statusCode: 200,
          duration: 100,
          mocked: false,
        },
        { tab: { id: 1 } },
      );

      // Verify no recording-related storage reads (isRecording, recordingTabId)
      const getCalls = (chrome.storage.local.get as ReturnType<typeof vi.fn>).mock.calls;
      const recordingReads = getCalls.filter(
        (call) => call[0] === 'isRecording' || call[0] === 'recordingTabId',
      );
      expect(recordingReads).toHaveLength(0);
    });
  });

  describe('CLEAR_LOG', () => {
    it('clears the request log', async () => {
      setupMessageHandler();
      mockStorage.requestLog = [{ id: 'entry-1' }];

      await sendMessage(MESSAGE_TYPES.CLEAR_LOG);

      expect(mockStorage.requestLog).toEqual([]);
    });
  });

  describe('broadcastRulesToActiveTab', () => {
    it('sends enabled rules to the active tab', async () => {
      setupMessageHandler();
      mockStorage.rules = [
        { id: 'r1', enabled: true, priority: 2 },
        { id: 'r2', enabled: false, priority: 0 },
        { id: 'r3', enabled: true, priority: 1 },
      ];
      mockStorage.activeTabId = 10;

      // Trigger broadcast by creating a rule
      await sendMessage(MESSAGE_TYPES.CREATE_RULE, { id: 'r4', enabled: true, priority: 3 });

      // Check tabs.sendMessage was called for the active tab
      const tabSendCalls = (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mock.calls;
      const rulesMessages = tabSendCalls.filter(
        (call) => call[1]?.type === MESSAGE_TYPES.INJECT_RULES,
      );
      expect(rulesMessages.length).toBe(1);
      expect(rulesMessages[0][0]).toBe(10);

      // Rules should be sorted by priority (enabled only)
      const sentRules = rulesMessages[0][1].payload;
      expect(sentRules.map((r: { id: string }) => r.id)).toEqual(['r3', 'r1', 'r4']);
    });

    it('does not send rules when no tab is active', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'r1', enabled: true, priority: 0 }];
      mockStorage.activeTabId = null;

      await sendMessage(MESSAGE_TYPES.CREATE_RULE, { id: 'r2', enabled: true, priority: 1 });

      const tabSendCalls = (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mock.calls;
      const rulesMessages = tabSendCalls.filter(
        (call) => call[1]?.type === MESSAGE_TYPES.INJECT_RULES,
      );
      expect(rulesMessages).toHaveLength(0);
    });

    it('handles sendMessage failure to the active tab', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'r1', enabled: true, priority: 0 }];
      mockStorage.activeTabId = 10;

      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Tab closed'));

      // Should not throw even if tab fails
      await expect(
        sendMessage(MESSAGE_TYPES.CREATE_RULE, { id: 'r2', enabled: true, priority: 1 }),
      ).resolves.toBeDefined();
    });
  });

  describe('handler error propagation', () => {
    it('wraps handler errors in error response', async () => {
      setupMessageHandler();

      // Force getCurrentUser to throw so GET_USER_TEAMS fails
      const { getCurrentUser } = await import('./firebase-auth');
      (getCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Auth failed'),
      );

      const response = await sendMessage(MESSAGE_TYPES.GET_USER_TEAMS);
      expect(response).toEqual({ ok: false, error: 'Auth failed' });
    });
  });
});
