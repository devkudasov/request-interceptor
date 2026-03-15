import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome API stub
// ---------------------------------------------------------------------------

let mockStorage: Record<string, unknown> = {};
let messageListenerCallback: (
  (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void
) | null = null;

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
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
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
  scripting: { executeScript: vi.fn(() => Promise.resolve()) },
  tabs: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onUpdated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
  },
});

// ---------------------------------------------------------------------------
// Module mocks — no top-level variable references in factories
// ---------------------------------------------------------------------------

vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid') }));

vi.mock('@/shared/constants', async () => {
  const actual = await vi.importActual<typeof import('@/shared/constants')>('@/shared/constants');
  return { ...actual, PLAN_PRICE_IDS: { pro: '', team: '' } };
});

vi.mock('../firebase-auth', () => ({
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithGithub: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../firestore-teams', () => ({
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

vi.mock('../firestore-sync', () => ({
  pushCollection: vi.fn(),
  pullCollection: vi.fn(),
  detectConflicts: vi.fn(),
  resolveConflict: vi.fn(),
  getLastSyncTimestamp: vi.fn(),
}));

vi.mock('../firestore-versions', () => ({
  getVersionHistory: vi.fn(),
  getVersion: vi.fn(),
  restoreVersion: vi.fn(),
}));

vi.mock('../tab-manager', () => ({
  injectInterceptor: vi.fn(() => Promise.resolve()),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { setupMessageHandler } from '../message-handler';
import { MESSAGE_TYPES } from '@/shared/constants';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  signInWithGithub,
  signOut,
  getCurrentUser,
} from '../firebase-auth';
import { createTeam, getUserTeams } from '../firestore-teams';
import { getVersionHistory, getVersion, restoreVersion } from '../firestore-versions';

// Cast to mock types for convenience
const mockSignInWithEmail = signInWithEmail as ReturnType<typeof vi.fn>;
const mockRegisterWithEmail = registerWithEmail as ReturnType<typeof vi.fn>;
const mockSignInWithGoogle = signInWithGoogle as ReturnType<typeof vi.fn>;
const mockSignInWithGithub = signInWithGithub as ReturnType<typeof vi.fn>;
const mockSignOut = signOut as ReturnType<typeof vi.fn>;
const mockGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;
const mockCreateTeam = createTeam as ReturnType<typeof vi.fn>;
const mockGetUserTeams = getUserTeams as ReturnType<typeof vi.fn>;
const mockGetVersionHistory = getVersionHistory as ReturnType<typeof vi.fn>;
const mockGetVersion = getVersion as ReturnType<typeof vi.fn>;
const mockRestoreVersion = restoreVersion as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function sendMessage(type: string, payload?: unknown, sender?: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return new Promise((resolve) => {
    const senderObj = sender ?? { tab: { id: 1 } };
    messageListenerCallback!({ type, payload }, senderObj, resolve as (response: unknown) => void);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('message-flow integration', () => {
  beforeEach(() => {
    mockStorage = {};
    messageListenerCallback = null;
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
    setupMessageHandler();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Rules CRUD round-trip
  // -----------------------------------------------------------------------

  describe('Rules CRUD round-trip', () => {
    it('create -> get -> update -> get -> delete -> get', async () => {
      mockStorage.rules = [];
      mockStorage.activeTabId = null;

      // Create
      const rule = { id: 'r1', enabled: true, priority: 0, method: 'GET', urlPattern: '/api/test' };
      const createRes = await sendMessage(MESSAGE_TYPES.CREATE_RULE, rule);
      expect(createRes).toEqual({ ok: true, data: rule });

      // Get -- should have 1 rule
      const getRes1 = await sendMessage(MESSAGE_TYPES.GET_RULES);
      expect(getRes1.ok).toBe(true);
      expect(getRes1.data).toHaveLength(1);

      // Update
      await sendMessage(MESSAGE_TYPES.UPDATE_RULE, { id: 'r1', changes: { statusCode: 404 } });

      // Get -- verify update
      const getRes2 = await sendMessage(MESSAGE_TYPES.GET_RULES);
      const updatedRules = getRes2.data as Array<{ id: string; statusCode: number }>;
      expect(updatedRules[0].statusCode).toBe(404);

      // Delete
      await sendMessage(MESSAGE_TYPES.DELETE_RULE, { id: 'r1' });

      // Get -- should be empty
      const getRes3 = await sendMessage(MESSAGE_TYPES.GET_RULES);
      expect(getRes3.data).toHaveLength(0);
    });

    it('toggle flips enabled state twice to restore original', async () => {
      mockStorage.rules = [{ id: 'r1', enabled: true, priority: 0 }];
      mockStorage.activeTabId = null;

      await sendMessage(MESSAGE_TYPES.TOGGLE_RULE, { id: 'r1' });
      let rules = (await sendMessage(MESSAGE_TYPES.GET_RULES)).data as Array<{ enabled: boolean }>;
      expect(rules[0].enabled).toBe(false);

      await sendMessage(MESSAGE_TYPES.TOGGLE_RULE, { id: 'r1' });
      rules = (await sendMessage(MESSAGE_TYPES.GET_RULES)).data as Array<{ enabled: boolean }>;
      expect(rules[0].enabled).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Collections CRUD round-trip
  // -----------------------------------------------------------------------

  describe('Collections CRUD round-trip', () => {
    it('create -> get -> delete with rule cleanup', async () => {
      mockStorage.collections = [];
      mockStorage.rules = [{ id: 'r1', collectionId: null }];
      mockStorage.activeTabId = null;

      // Create collection
      const col = { id: 'c1', name: 'Test Col', enabled: true };
      const createRes = await sendMessage(MESSAGE_TYPES.CREATE_COLLECTION, col);
      expect(createRes).toEqual({ ok: true, data: col });

      // Get
      const getRes = await sendMessage(MESSAGE_TYPES.GET_COLLECTIONS);
      expect(getRes.data).toHaveLength(1);

      // Assign rule to collection, then delete collection
      mockStorage.rules = [{ id: 'r1', collectionId: 'c1' }];
      await sendMessage(MESSAGE_TYPES.DELETE_COLLECTION, { id: 'c1' });

      // Rule should have collectionId cleared
      const rulesAfter = (await sendMessage(MESSAGE_TYPES.GET_RULES)).data as Array<{ collectionId: string | null }>;
      expect(rulesAfter[0].collectionId).toBeNull();

      // Collection gone
      const colsAfter = await sendMessage(MESSAGE_TYPES.GET_COLLECTIONS);
      expect(colsAfter.data).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Auth message flow
  // -----------------------------------------------------------------------

  describe('Auth message flow', () => {
    it('LOGIN delegates to signInWithEmail and returns user', async () => {
      const mockUser = { uid: 'u1', email: 'test@example.com' };
      mockSignInWithEmail.mockResolvedValue(mockUser);

      const res = await sendMessage(MESSAGE_TYPES.LOGIN, { email: 'test@example.com', password: 'password123' });
      expect(res).toEqual({ ok: true, data: mockUser });
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('REGISTER delegates to registerWithEmail', async () => {
      const mockUser = { uid: 'u2', email: 'new@example.com' };
      mockRegisterWithEmail.mockResolvedValue(mockUser);

      const res = await sendMessage(MESSAGE_TYPES.REGISTER, { email: 'new@example.com', password: 'password123' });
      expect(res).toEqual({ ok: true, data: mockUser });
    });

    it('LOGIN_GOOGLE delegates to signInWithGoogle', async () => {
      mockSignInWithGoogle.mockResolvedValue({ uid: 'g1' });
      const res = await sendMessage(MESSAGE_TYPES.LOGIN_GOOGLE);
      expect(res.ok).toBe(true);
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });

    it('LOGIN_GITHUB delegates to signInWithGithub', async () => {
      mockSignInWithGithub.mockResolvedValue({ uid: 'gh1' });
      const res = await sendMessage(MESSAGE_TYPES.LOGIN_GITHUB);
      expect(res.ok).toBe(true);
      expect(mockSignInWithGithub).toHaveBeenCalled();
    });

    it('LOGOUT delegates to signOut', async () => {
      mockSignOut.mockResolvedValue(undefined);
      const res = await sendMessage(MESSAGE_TYPES.LOGOUT);
      expect(res.ok).toBe(true);
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('GET_CURRENT_USER returns current user', async () => {
      mockGetCurrentUser.mockResolvedValue({ uid: 'u1' });
      const res = await sendMessage(MESSAGE_TYPES.GET_CURRENT_USER);
      expect(res).toEqual({ ok: true, data: { uid: 'u1' } });
    });

    it('LOGIN error returns { ok: false }', async () => {
      mockSignInWithEmail.mockRejectedValue(new Error('Invalid credentials'));
      const res = await sendMessage(MESSAGE_TYPES.LOGIN, { email: 'bad@test.com', password: 'wrong' });
      expect(res).toEqual({ ok: false, error: 'Invalid credentials' });
    });
  });

  // -----------------------------------------------------------------------
  // Unknown message type
  // -----------------------------------------------------------------------

  describe('Unknown message type', () => {
    it('returns error response for unregistered message type', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const res = await sendMessage('NONEXISTENT_TYPE');
      expect(res).toEqual({ ok: false, error: 'Unknown message type' });
      warnSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // Version history
  // -----------------------------------------------------------------------

  describe('Version history message flow', () => {
    it('GET_VERSION_HISTORY delegates correctly', async () => {
      const versions = [{ id: 'v1', version: 1 }];
      mockGetVersionHistory.mockResolvedValue(versions);

      const res = await sendMessage(MESSAGE_TYPES.GET_VERSION_HISTORY, {
        teamId: 't1', collectionId: 'c1',
      });
      expect(res).toEqual({ ok: true, data: versions });
      expect(mockGetVersionHistory).toHaveBeenCalledWith('t1', 'c1', { limit: 20, startAfter: undefined });
    });

    it('GET_VERSION delegates correctly', async () => {
      const version = { id: 'v1', version: 1 };
      mockGetVersion.mockResolvedValue(version);

      const res = await sendMessage(MESSAGE_TYPES.GET_VERSION, {
        teamId: 't1', collectionId: 'c1', versionId: 'v1',
      });
      expect(res).toEqual({ ok: true, data: version });
    });

    it('RESTORE_VERSION delegates correctly', async () => {
      mockRestoreVersion.mockResolvedValue({ success: true });

      const res = await sendMessage(MESSAGE_TYPES.RESTORE_VERSION, {
        teamId: 't1', collectionId: 'c1', versionId: 'v1',
      });
      expect(res.ok).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Teams
  // -----------------------------------------------------------------------

  describe('Teams message flow', () => {
    it('CREATE_TEAM delegates and returns result', async () => {
      mockCreateTeam.mockResolvedValue({ id: 't1', name: 'My Team' });
      const res = await sendMessage(MESSAGE_TYPES.CREATE_TEAM, { name: 'My Team' });
      expect(res).toEqual({ ok: true, data: { id: 't1', name: 'My Team' } });
    });

    it('GET_USER_TEAMS fails when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const res = await sendMessage(MESSAGE_TYPES.GET_USER_TEAMS);
      expect(res).toEqual({ ok: false, error: 'Not authenticated' });
    });

    it('GET_USER_TEAMS succeeds when authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue({ uid: 'u1', email: 'dev@test.com' });
      mockGetUserTeams.mockResolvedValue([{ id: 't1' }]);

      const res = await sendMessage(MESSAGE_TYPES.GET_USER_TEAMS);
      expect(res).toEqual({ ok: true, data: [{ id: 't1' }] });
      expect(mockGetUserTeams).toHaveBeenCalledWith('u1');
    });
  });

  // -----------------------------------------------------------------------
  // Broadcast verification
  // -----------------------------------------------------------------------

  describe('Rule mutations broadcast to active tabs', () => {
    it('CREATE_RULE broadcasts enabled rules sorted by priority', async () => {
      mockStorage.rules = [
        { id: 'r1', enabled: true, priority: 1 },
        { id: 'r2', enabled: false, priority: 0 },
      ];
      mockStorage.activeTabId = 10;

      await sendMessage(MESSAGE_TYPES.CREATE_RULE, { id: 'r3', enabled: true, priority: 2 });

      const calls = (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mock.calls;
      const injectCalls = calls.filter((c) => c[1]?.type === MESSAGE_TYPES.INJECT_RULES);
      expect(injectCalls.length).toBe(1);
      expect(injectCalls[0][0]).toBe(10);

      // Only enabled rules, sorted by priority
      const sentRules = injectCalls[0][1].payload as Array<{ id: string }>;
      expect(sentRules.map((r) => r.id)).toEqual(['r1', 'r3']);
    });
  });
});
