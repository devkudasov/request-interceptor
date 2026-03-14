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
    sendMessage: vi.fn(),
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
  injectInterceptor: vi.fn(() => Promise.resolve()),
}));

import { setupMessageHandler } from './message-handler';
import { MESSAGE_TYPES } from '@/shared/constants';

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

  describe('GET_ACTIVE_TABS', () => {
    it('returns active tab ids from storage', async () => {
      setupMessageHandler();
      mockStorage.activeTabIds = [1, 2, 3];

      const response = await sendMessage(MESSAGE_TYPES.GET_ACTIVE_TABS);
      expect(response).toEqual({ ok: true, data: [1, 2, 3] });
    });

    it('returns default empty array when none set', async () => {
      setupMessageHandler();

      const response = await sendMessage(MESSAGE_TYPES.GET_ACTIVE_TABS);
      expect(response).toEqual({ ok: true, data: [] });
    });
  });

  describe('TOGGLE_TAB', () => {
    it('adds tab id when enabling', async () => {
      setupMessageHandler();
      mockStorage.activeTabIds = [1];

      const response = await sendMessage(MESSAGE_TYPES.TOGGLE_TAB, { tabId: 5, enabled: true });
      expect(response).toEqual({ ok: true, data: [1, 5] });
    });

    it('does not duplicate tab id', async () => {
      setupMessageHandler();
      mockStorage.activeTabIds = [5];

      const response = await sendMessage(MESSAGE_TYPES.TOGGLE_TAB, { tabId: 5, enabled: true });
      expect(response).toEqual({ ok: true, data: [5] });
    });

    it('removes tab id when disabling', async () => {
      setupMessageHandler();
      mockStorage.activeTabIds = [1, 5, 10];

      const response = await sendMessage(MESSAGE_TYPES.TOGGLE_TAB, { tabId: 5, enabled: false });
      expect(response).toEqual({ ok: true, data: [1, 10] });
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
    it('adds a new rule and broadcasts to active tabs', async () => {
      setupMessageHandler();
      mockStorage.rules = [];
      mockStorage.activeTabIds = [];

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
      mockStorage.activeTabIds = [];

      await sendMessage(MESSAGE_TYPES.UPDATE_RULE, { id: 'r1', changes: { statusCode: 404 } });

      const rules = mockStorage.rules as Array<{ id: string; statusCode: number }>;
      expect(rules[0].statusCode).toBe(404);
    });
  });

  describe('DELETE_RULE', () => {
    it('removes rule by id', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'r1' }, { id: 'r2' }];
      mockStorage.activeTabIds = [];

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
      mockStorage.activeTabIds = [];

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
      mockStorage.activeTabIds = [];

      await sendMessage(MESSAGE_TYPES.REORDER_RULES, { orderedIds: ['c', 'a', 'b'] });

      const rules = mockStorage.rules as Array<{ id: string; priority: number }>;
      expect(rules[0]).toEqual(expect.objectContaining({ id: 'c', priority: 0 }));
      expect(rules[1]).toEqual(expect.objectContaining({ id: 'a', priority: 1 }));
      expect(rules[2]).toEqual(expect.objectContaining({ id: 'b', priority: 2 }));
    });

    it('filters out non-existent rule ids', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'a', priority: 0 }];
      mockStorage.activeTabIds = [];

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
    it('creates a log entry and returns it', async () => {
      setupMessageHandler();
      mockStorage.requestLog = [];
      mockStorage.isRecording = false;

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
    });

    it('uses tabId 0 when sender has no tab', async () => {
      setupMessageHandler();
      mockStorage.requestLog = [];
      mockStorage.isRecording = false;

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
  });

  describe('CLEAR_LOG', () => {
    it('clears the request log', async () => {
      setupMessageHandler();
      mockStorage.requestLog = [{ id: 'entry-1' }];

      await sendMessage(MESSAGE_TYPES.CLEAR_LOG);

      expect(mockStorage.requestLog).toEqual([]);
    });
  });

  describe('Recording handlers', () => {
    it('START_RECORDING sets up recording', async () => {
      setupMessageHandler();
      mockStorage.activeTabIds = [];
      mockStorage.rules = [];

      const promise = sendMessage(MESSAGE_TYPES.START_RECORDING, { tabId: 5 });
      await vi.advanceTimersByTimeAsync(200);
      const response = await promise;

      expect((response as { ok: boolean }).ok).toBe(true);
      expect(mockStorage.isRecording).toBe(true);
      expect(mockStorage.recordingTabId).toBe(5);
    });

    it('START_RECORDING adds tab to active tabs if not already present', async () => {
      setupMessageHandler();
      mockStorage.activeTabIds = [1];
      mockStorage.rules = [];

      const promise = sendMessage(MESSAGE_TYPES.START_RECORDING, { tabId: 5 });
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(mockStorage.activeTabIds).toEqual([1, 5]);
    });

    it('STOP_RECORDING stops recording and returns captured data', async () => {
      setupMessageHandler();
      mockStorage.isRecording = true;
      mockStorage.recordingTabId = 5;

      const response = await sendMessage(MESSAGE_TYPES.STOP_RECORDING);
      expect((response as { ok: boolean }).ok).toBe(true);
      expect(mockStorage.isRecording).toBe(false);
    });

    it('RECORDING_DATA returns recorded responses', async () => {
      setupMessageHandler();

      const response = await sendMessage(MESSAGE_TYPES.RECORDING_DATA);
      expect((response as { ok: boolean; data: unknown[] }).ok).toBe(true);
      expect((response as { data: unknown[] }).data).toEqual([]);
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

  describe('broadcastRulesToActiveTabs', () => {
    it('sends enabled rules sorted by priority to all active tabs', async () => {
      setupMessageHandler();
      mockStorage.rules = [
        { id: 'r1', enabled: true, priority: 2 },
        { id: 'r2', enabled: false, priority: 0 },
        { id: 'r3', enabled: true, priority: 1 },
      ];
      mockStorage.activeTabIds = [10, 20];

      // Trigger broadcastRulesToActiveTabs by creating a rule
      await sendMessage(MESSAGE_TYPES.CREATE_RULE, { id: 'r4', enabled: true, priority: 3 });

      // Check tabs.sendMessage was called for each active tab
      const tabSendCalls = (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mock.calls;
      const rulesMessages = tabSendCalls.filter(
        (call) => call[1]?.type === MESSAGE_TYPES.INJECT_RULES,
      );
      expect(rulesMessages.length).toBe(2);
      expect(rulesMessages[0][0]).toBe(10);
      expect(rulesMessages[1][0]).toBe(20);

      // Rules should be sorted by priority (enabled only)
      const sentRules = rulesMessages[0][1].payload;
      expect(sentRules.map((r: { id: string }) => r.id)).toEqual(['r3', 'r1', 'r4']);
    });

    it('handles sendMessage failure to individual tabs', async () => {
      setupMessageHandler();
      mockStorage.rules = [{ id: 'r1', enabled: true, priority: 0 }];
      mockStorage.activeTabIds = [10, 20];

      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Tab closed'))
        .mockResolvedValueOnce(undefined);

      // Should not throw even if one tab fails
      await expect(
        sendMessage(MESSAGE_TYPES.CREATE_RULE, { id: 'r2', enabled: true, priority: 1 }),
      ).resolves.toBeDefined();
    });
  });
});
