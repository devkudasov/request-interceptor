import { MESSAGE_TYPES } from '@/shared/constants';
import { getStorage, setStorage, updateStorage } from './storage';
import { addLogEntry, clearLog as clearLogEntries } from './logger';
import { startRecording, stopRecording, addRecordedResponse, getRecordedResponses, isRecording, getRecordingTabId } from './recorder';
import type { MockRule, Collection, LogEntry } from '@/shared/types';

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
    await startRecording(tabId);
  });

  registerHandler(MESSAGE_TYPES.STOP_RECORDING, async () => {
    return stopRecording();
  });

  registerHandler(MESSAGE_TYPES.RECORDING_DATA, async () => {
    return getRecordedResponses();
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
