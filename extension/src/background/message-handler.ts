import { MESSAGE_TYPES } from '@/shared/constants';
import { getStorage, setStorage, updateStorage } from './storage';
import { addLogEntry, clearLog as clearLogEntries } from './logger';
import { startRecording, stopRecording, addRecordedResponse, getRecordedResponses, isRecording, getRecordingTabId } from './recorder';
import type { MockRule, Collection, LogEntry } from '@/shared/types';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  signInWithGithub,
  signOut,
  getCurrentUser,
} from './firebase-auth';
import {
  createTeam,
  inviteMember,
  acceptInvite,
  declineInvite,
  updateMemberRole,
  removeMember,
  deleteTeam,
  getTeam,
  getUserTeams,
  getPendingInvites,
} from './firestore-teams';
import {
  pushCollection as pushCollectionToCloud,
  pullCollection as pullCollectionFromCloud,
  detectConflicts,
  resolveConflict,
  getLastSyncTimestamp,
} from './firestore-sync';
import {
  getVersionHistory,
  getVersion,
  restoreVersion,
} from './firestore-versions';
import type { TeamRole, ConflictStrategy } from '@/shared/types';

type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

interface Message {
  type: MessageType;
  payload?: unknown;
}

type Handler = (
  payload: unknown,
  sender: chrome.runtime.MessageSender,
) => Promise<unknown>;

const handlers = new Map<MessageType, Handler>();

function registerHandler(type: MessageType, handler: Handler) {
  handlers.set(type, handler);
}

export function setupMessageHandler() {
  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    const handler = handlers.get(message.type);
    if (!handler) {
      console.warn(`[Request Interceptor] Unknown message type: ${message.type}`);
      sendResponse({ ok: false, error: 'Unknown message type' });
      return true;
    }

    handler(message.payload, sender)
      .then((result) => sendResponse({ ok: true, data: result }))
      .catch((err: Error) => sendResponse({ ok: false, error: err.message }));

    return true; // Keep message channel open for async response
  });

  registerHandlers();
}

function registerHandlers() {
  // --- Tab management ---
  registerHandler(MESSAGE_TYPES.GET_ACTIVE_TABS, async () => {
    return getStorage('ACTIVE_TAB_IDS');
  });

  registerHandler(MESSAGE_TYPES.TOGGLE_TAB, async (payload) => {
    const { tabId, enabled } = payload as { tabId: number; enabled: boolean };
    return updateStorage('ACTIVE_TAB_IDS', (tabs) => {
      if (enabled && !tabs.includes(tabId)) {
        return [...tabs, tabId];
      }
      if (!enabled) {
        return tabs.filter((id) => id !== tabId);
      }
      return tabs;
    });
  });

  // --- Rules ---
  registerHandler(MESSAGE_TYPES.GET_RULES, async () => {
    return getStorage('RULES');
  });

  registerHandler(MESSAGE_TYPES.CREATE_RULE, async (payload) => {
    const rule = payload as MockRule;
    await updateStorage('RULES', (rules) => [...rules, rule]);
    await broadcastRulesToActiveTabs();
    return rule;
  });

  registerHandler(MESSAGE_TYPES.UPDATE_RULE, async (payload) => {
    const { id, changes } = payload as { id: string; changes: Partial<MockRule> };
    await updateStorage('RULES', (rules) =>
      rules.map((r) => (r.id === id ? { ...r, ...changes, updatedAt: new Date().toISOString() } : r)),
    );
    await broadcastRulesToActiveTabs();
  });

  registerHandler(MESSAGE_TYPES.DELETE_RULE, async (payload) => {
    const { id } = payload as { id: string };
    await updateStorage('RULES', (rules) => rules.filter((r) => r.id !== id));
    await broadcastRulesToActiveTabs();
  });

  registerHandler(MESSAGE_TYPES.TOGGLE_RULE, async (payload) => {
    const { id } = payload as { id: string };
    await updateStorage('RULES', (rules) =>
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r)),
    );
    await broadcastRulesToActiveTabs();
  });

  registerHandler(MESSAGE_TYPES.REORDER_RULES, async (payload) => {
    const { orderedIds } = payload as { orderedIds: string[] };
    await updateStorage('RULES', (rules) => {
      const ruleMap = new Map(rules.map((r) => [r.id, r]));
      return orderedIds
        .map((id, i) => {
          const rule = ruleMap.get(id);
          return rule ? { ...rule, priority: i } : null;
        })
        .filter((r): r is MockRule => r !== null);
    });
    await broadcastRulesToActiveTabs();
  });

  // --- Collections ---
  registerHandler(MESSAGE_TYPES.GET_COLLECTIONS, async () => {
    return getStorage('COLLECTIONS');
  });

  registerHandler(MESSAGE_TYPES.CREATE_COLLECTION, async (payload) => {
    const collection = payload as Collection;
    await updateStorage('COLLECTIONS', (cols) => [...cols, collection]);
    return collection;
  });

  registerHandler(MESSAGE_TYPES.UPDATE_COLLECTION, async (payload) => {
    const { id, changes } = payload as { id: string; changes: Partial<Collection> };
    await updateStorage('COLLECTIONS', (cols) =>
      cols.map((c) => (c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c)),
    );
  });

  registerHandler(MESSAGE_TYPES.DELETE_COLLECTION, async (payload) => {
    const { id } = payload as { id: string };
    await updateStorage('COLLECTIONS', (cols) => cols.filter((c) => c.id !== id));
    // Remove collection reference from rules
    await updateStorage('RULES', (rules) =>
      rules.map((r) => (r.collectionId === id ? { ...r, collectionId: null } : r)),
    );
  });

  registerHandler(MESSAGE_TYPES.TOGGLE_COLLECTION, async (payload) => {
    const { id } = payload as { id: string };
    const collections = await getStorage('COLLECTIONS');
    const collection = collections.find((c) => c.id === id);
    if (!collection) return;

    const newEnabled = !collection.enabled;
    await setStorage(
      'COLLECTIONS',
      collections.map((c) => (c.id === id ? { ...c, enabled: newEnabled } : c)),
    );

    // Toggle all rules in this collection
    await updateStorage('RULES', (rules) =>
      rules.map((r) => (r.collectionId === id ? { ...r, enabled: newEnabled } : r)),
    );
    await broadcastRulesToActiveTabs();
  });

  // --- Log ---
  registerHandler(MESSAGE_TYPES.LOG_ENTRY, async (payload, sender) => {
    const data = payload as Omit<LogEntry, 'id' | 'timestamp'>;
    const entry = await addLogEntry({ ...data, tabId: sender.tab?.id ?? 0 });

    // If recording, also buffer the response
    const recording = await isRecording();
    if (recording) {
      const recordingTabId = await getRecordingTabId();
      if (sender.tab?.id === recordingTabId && !data.mocked) {
        addRecordedResponse(entry);
      }
    }

    // Broadcast to side panel for real-time updates
    try {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.LOG_ENTRY, payload: entry });
    } catch {
      // Side panel may not be open
    }

    return entry;
  });

  registerHandler(MESSAGE_TYPES.CLEAR_LOG, async () => {
    await clearLogEntries();
  });

  // --- Recording ---
  registerHandler(MESSAGE_TYPES.START_RECORDING, async (payload) => {
    const { tabId } = payload as { tabId: number };

    // Ensure the tab is active so the interceptor is injected
    const activeTabIds = await getStorage('ACTIVE_TAB_IDS');
    if (!activeTabIds.includes(tabId)) {
      await updateStorage('ACTIVE_TAB_IDS', (tabs) => [...tabs, tabId]);
    }

    // Inject interceptor and start recording
    const { injectInterceptor } = await import('./tab-manager');
    await injectInterceptor(tabId);
    await startRecording(tabId);
  });

  registerHandler(MESSAGE_TYPES.STOP_RECORDING, async () => {
    return stopRecording();
  });

  registerHandler(MESSAGE_TYPES.RECORDING_DATA, async () => {
    return getRecordedResponses();
  });

  // --- Auth ---
  registerHandler(MESSAGE_TYPES.LOGIN, async (payload) => {
    const { email, password } = payload as { email: string; password: string };
    return signInWithEmail(email, password);
  });

  registerHandler(MESSAGE_TYPES.REGISTER, async (payload) => {
    const { email, password } = payload as { email: string; password: string };
    return registerWithEmail(email, password);
  });

  registerHandler(MESSAGE_TYPES.LOGIN_GOOGLE, async () => {
    return signInWithGoogle();
  });

  registerHandler(MESSAGE_TYPES.LOGIN_GITHUB, async () => {
    return signInWithGithub();
  });

  registerHandler(MESSAGE_TYPES.LOGOUT, async () => {
    await signOut();
  });

  registerHandler(MESSAGE_TYPES.GET_CURRENT_USER, async () => {
    return getCurrentUser();
  });

  // --- Teams ---
  registerHandler(MESSAGE_TYPES.CREATE_TEAM, async (payload) => {
    const { name } = payload as { name: string };
    return createTeam(name);
  });

  registerHandler(MESSAGE_TYPES.GET_TEAM, async (payload) => {
    const { teamId } = payload as { teamId: string };
    return getTeam(teamId);
  });

  registerHandler(MESSAGE_TYPES.GET_USER_TEAMS, async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    return getUserTeams(user.uid);
  });

  registerHandler(MESSAGE_TYPES.DELETE_TEAM, async (payload) => {
    const { teamId } = payload as { teamId: string };
    await deleteTeam(teamId);
  });

  registerHandler(MESSAGE_TYPES.INVITE_MEMBER, async (payload) => {
    const { teamId, email } = payload as { teamId: string; email: string };
    return inviteMember(teamId, email);
  });

  registerHandler(MESSAGE_TYPES.ACCEPT_INVITE, async (payload) => {
    const { inviteId } = payload as { inviteId: string };
    await acceptInvite(inviteId);
  });

  registerHandler(MESSAGE_TYPES.DECLINE_INVITE, async (payload) => {
    const { inviteId } = payload as { inviteId: string };
    await declineInvite(inviteId);
  });

  registerHandler(MESSAGE_TYPES.GET_PENDING_INVITES, async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    if (!user.email) throw new Error('User email not available');
    return getPendingInvites(user.email);
  });

  registerHandler(MESSAGE_TYPES.UPDATE_MEMBER_ROLE, async (payload) => {
    const { teamId, userId, role } = payload as { teamId: string; userId: string; role: TeamRole };
    await updateMemberRole(teamId, userId, role);
  });

  registerHandler(MESSAGE_TYPES.REMOVE_MEMBER, async (payload) => {
    const { teamId, userId } = payload as { teamId: string; userId: string };
    await removeMember(teamId, userId);
  });

  // --- Cloud Sync ---
  registerHandler(MESSAGE_TYPES.PUSH_COLLECTION, async (payload) => {
    const { teamId, collectionId } = payload as {
      teamId: string;
      collectionId: string;
    };

    const collections = await getStorage('COLLECTIONS');
    const rules = await getStorage('RULES');

    const col = collections.find((c) => c.id === collectionId);
    if (!col) throw new Error('Collection not found');

    const colRules = rules.filter((r) => r.collectionId === collectionId);
    return pushCollectionToCloud(teamId, col, colRules);
  });

  registerHandler(MESSAGE_TYPES.PULL_COLLECTION, async (payload) => {
    const { teamId, collectionId, strategy } = payload as {
      teamId: string;
      collectionId: string;
      strategy?: ConflictStrategy;
    };

    const result = await pullCollectionFromCloud(teamId, collectionId);
    if (!result) throw new Error('Collection not found in cloud');

    const collections = await getStorage('COLLECTIONS');
    const localCol = collections.find((c) => c.id === collectionId);

    if (localCol && !strategy) {
      const conflictResult = detectConflicts(localCol, result.collection as Collection);
      if (conflictResult.hasConflict) {
        return { conflict: conflictResult };
      }
    }

    const effectiveStrategy = strategy ?? 'replace-local';
    const resolved = resolveConflict(effectiveStrategy, localCol ?? result.collection as Collection, result.collection as Collection);

    await setStorage(
      'COLLECTIONS',
      localCol
        ? collections.map((c) => (c.id === collectionId ? resolved : c))
        : [...collections, resolved],
    );

    return { conflict: null };
  });

  registerHandler(MESSAGE_TYPES.GET_SYNC_STATUS, async (payload) => {
    const { teamId, collectionId } = payload as { teamId: string; collectionId: string };
    const lastSync = await getLastSyncTimestamp(teamId, collectionId);
    return { lastSync };
  });

  // --- Version History ---
  registerHandler(MESSAGE_TYPES.GET_VERSION_HISTORY, async (payload) => {
    const { teamId, collectionId, startAfterId } = payload as {
      teamId: string;
      collectionId: string;
      startAfterId?: string;
    };
    return getVersionHistory(teamId, collectionId, { limit: 20, startAfter: startAfterId });
  });

  registerHandler(MESSAGE_TYPES.GET_VERSION, async (payload) => {
    const { teamId, collectionId, versionId } = payload as {
      teamId: string;
      collectionId: string;
      versionId: string;
    };
    return getVersion(teamId, collectionId, versionId);
  });

  registerHandler(MESSAGE_TYPES.RESTORE_VERSION, async (payload) => {
    const { teamId, collectionId, versionId } = payload as {
      teamId: string;
      collectionId: string;
      versionId: string;
    };
    return restoreVersion(teamId, collectionId, versionId);
  });

  // --- Billing ---
  registerHandler(MESSAGE_TYPES.CREATE_CHECKOUT_SESSION, async (payload) => {
    const { priceId, successUrl, cancelUrl } = payload as { priceId: string; successUrl: string; cancelUrl: string };
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const createCheckout = httpsCallable(functions, 'createCheckoutSession');
    const result = await createCheckout({ priceId, successUrl, cancelUrl });
    return result.data;
  });

  registerHandler(MESSAGE_TYPES.CREATE_CUSTOMER_PORTAL_SESSION, async (payload) => {
    const { returnUrl } = payload as { returnUrl: string };
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const createPortal = httpsCallable(functions, 'createCustomerPortalSession');
    const result = await createPortal({ returnUrl });
    return result.data;
  });
}

async function broadcastRulesToActiveTabs() {
  const [rules, activeTabIds] = await Promise.all([
    getStorage('RULES'),
    getStorage('ACTIVE_TAB_IDS'),
  ]);

  const enabledRules = rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const tabId of activeTabIds) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: MESSAGE_TYPES.INJECT_RULES,
        payload: enabledRules,
      });
    } catch {
      // Tab may have been closed
    }
  }
}
