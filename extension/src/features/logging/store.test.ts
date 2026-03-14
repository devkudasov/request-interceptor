import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLogStore, useLogPanelStore } from './store';
import type { LogEntry } from './types';

const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
const mockStorageGet = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: mockAddListener },
  },
  storage: {
    local: { get: mockStorageGet, set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn() },
});

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'log-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    tabId: 1,
    method: 'GET',
    url: 'https://api.example.com/data',
    requestHeaders: {},
    requestBody: null,
    statusCode: 200,
    responseHeaders: {},
    responseBody: '{"ok":true}',
    responseSize: 100,
    duration: 50,
    mocked: true,
    matchedRuleId: 'rule-1',
    ...overrides,
  };
}

function mockSendMessageSuccess(data: unknown = undefined) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: true, data });
    },
  );
}

describe('useLogStore', () => {
  beforeEach(() => {
    useLogStore.setState(useLogStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with empty entries and not paused', () => {
      const state = useLogStore.getState();
      expect(state.entries).toEqual([]);
      expect(state.paused).toBe(false);
    });
  });

  describe('fetchLog', () => {
    it('fetches entries from chrome.storage.local', async () => {
      const entries = [makeLogEntry({ id: 'e1' }), makeLogEntry({ id: 'e2' })];
      mockStorageGet.mockResolvedValue({ requestLog: entries });

      await useLogStore.getState().fetchLog();

      expect(useLogStore.getState().entries).toEqual(entries);
    });

    it('defaults to empty array when no requestLog in storage', async () => {
      mockStorageGet.mockResolvedValue({});

      await useLogStore.getState().fetchLog();

      expect(useLogStore.getState().entries).toEqual([]);
    });

    it('calls chrome.storage.local.get with requestLog key', async () => {
      mockStorageGet.mockResolvedValue({});

      await useLogStore.getState().fetchLog();

      expect(mockStorageGet).toHaveBeenCalledWith('requestLog');
    });
  });

  describe('clearLog', () => {
    it('clears entries and sends CLEAR_LOG message', async () => {
      useLogStore.setState({ entries: [makeLogEntry()] });
      mockSendMessageSuccess(undefined);

      await useLogStore.getState().clearLog();

      expect(useLogStore.getState().entries).toEqual([]);
      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'CLEAR_LOG', payload: undefined },
        expect.any(Function),
      );
    });
  });

  describe('togglePause', () => {
    it('toggles paused from false to true', () => {
      useLogStore.getState().togglePause();
      expect(useLogStore.getState().paused).toBe(true);
    });

    it('toggles paused from true to false', () => {
      useLogStore.setState({ paused: true });
      useLogStore.getState().togglePause();
      expect(useLogStore.getState().paused).toBe(false);
    });
  });

  describe('addEntry', () => {
    it('prepends entry when not paused', () => {
      const existing = makeLogEntry({ id: 'existing' });
      useLogStore.setState({ entries: [existing] });

      const newEntry = makeLogEntry({ id: 'new' });
      useLogStore.getState().addEntry(newEntry);

      const entries = useLogStore.getState().entries;
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe('new');
      expect(entries[1].id).toBe('existing');
    });

    it('does not add entry when paused', () => {
      useLogStore.setState({ paused: true, entries: [] });

      useLogStore.getState().addEntry(makeLogEntry());

      expect(useLogStore.getState().entries).toEqual([]);
    });

    it('limits entries to 1000', () => {
      const entries = Array.from({ length: 1000 }, (_, i) =>
        makeLogEntry({ id: `e-${i}` }),
      );
      useLogStore.setState({ entries });

      useLogStore.getState().addEntry(makeLogEntry({ id: 'newest' }));

      const result = useLogStore.getState().entries;
      expect(result).toHaveLength(1000);
      expect(result[0].id).toBe('newest');
      expect(result[999].id).toBe('e-998');
    });
  });

  describe('startListening', () => {
    it('registers a chrome.runtime.onMessage listener', () => {
      useLogStore.getState().startListening();
      expect(mockAddListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('adds entry on LOG_ENTRY message', () => {
      useLogStore.getState().startListening();

      const listener = mockAddListener.mock.calls[0][0];
      const entry = makeLogEntry({ id: 'from-listener' });
      listener({ type: 'LOG_ENTRY', payload: entry });

      expect(useLogStore.getState().entries[0].id).toBe('from-listener');
    });

    it('ignores messages without payload', () => {
      useLogStore.getState().startListening();

      const listener = mockAddListener.mock.calls[0][0];
      listener({ type: 'LOG_ENTRY' });

      expect(useLogStore.getState().entries).toEqual([]);
    });

    it('ignores non-LOG_ENTRY messages', () => {
      useLogStore.getState().startListening();

      const listener = mockAddListener.mock.calls[0][0];
      listener({ type: 'OTHER_TYPE', payload: makeLogEntry() });

      expect(useLogStore.getState().entries).toEqual([]);
    });
  });
});

describe('useLogPanelStore', () => {
  beforeEach(() => {
    useLogPanelStore.setState(useLogPanelStore.getInitialState());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with correct defaults', () => {
      const state = useLogPanelStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.panelHeight).toBe(250);
      expect(state.unseenCount).toBe(0);
    });
  });

  describe('togglePanel', () => {
    it('toggles isOpen from false to true', () => {
      useLogPanelStore.getState().togglePanel();
      expect(useLogPanelStore.getState().isOpen).toBe(true);
    });

    it('toggles isOpen from true to false', () => {
      useLogPanelStore.setState({ isOpen: true });
      useLogPanelStore.getState().togglePanel();
      expect(useLogPanelStore.getState().isOpen).toBe(false);
    });
  });

  describe('setPanelHeight', () => {
    it('sets panel height to given value', () => {
      useLogPanelStore.getState().setPanelHeight(300);
      expect(useLogPanelStore.getState().panelHeight).toBe(300);
    });

    it('clamps to minimum of 150', () => {
      useLogPanelStore.getState().setPanelHeight(50);
      expect(useLogPanelStore.getState().panelHeight).toBe(150);
    });

    it('clamps to maximum of 500', () => {
      useLogPanelStore.getState().setPanelHeight(800);
      expect(useLogPanelStore.getState().panelHeight).toBe(500);
    });

    it('allows exact minimum value', () => {
      useLogPanelStore.getState().setPanelHeight(150);
      expect(useLogPanelStore.getState().panelHeight).toBe(150);
    });

    it('allows exact maximum value', () => {
      useLogPanelStore.getState().setPanelHeight(500);
      expect(useLogPanelStore.getState().panelHeight).toBe(500);
    });
  });

  describe('incrementUnseen', () => {
    it('increments unseen count by 1', () => {
      useLogPanelStore.getState().incrementUnseen();
      expect(useLogPanelStore.getState().unseenCount).toBe(1);
    });

    it('increments multiple times', () => {
      useLogPanelStore.getState().incrementUnseen();
      useLogPanelStore.getState().incrementUnseen();
      useLogPanelStore.getState().incrementUnseen();
      expect(useLogPanelStore.getState().unseenCount).toBe(3);
    });
  });

  describe('resetUnseen', () => {
    it('resets unseen count to 0', () => {
      useLogPanelStore.setState({ unseenCount: 5 });
      useLogPanelStore.getState().resetUnseen();
      expect(useLogPanelStore.getState().unseenCount).toBe(0);
    });
  });
});
