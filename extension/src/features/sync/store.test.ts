import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSyncStore } from './store';

const mockSendMessage = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn() },
});

function mockSuccess(data: unknown = undefined) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: true, data });
    },
  );
}

function mockError(error: string) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: false, error });
    },
  );
}

describe('useSyncStore', () => {
  beforeEach(() => {
    useSyncStore.setState(useSyncStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with correct defaults', () => {
      const state = useSyncStore.getState();
      expect(state.syncing).toBe(false);
      expect(state.lastSyncAt).toBeNull();
      expect(state.conflict).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('pushToCloud', () => {
    it('sets lastSyncAt on success', async () => {
      mockSuccess(undefined);

      await useSyncStore.getState().pushToCloud();

      expect(useSyncStore.getState().syncing).toBe(false);
      expect(useSyncStore.getState().lastSyncAt).toBeDefined();
      expect(useSyncStore.getState().error).toBeNull();
    });

    it('sends PUSH_COLLECTION message', async () => {
      mockSuccess(undefined);

      await useSyncStore.getState().pushToCloud();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'PUSH_COLLECTION', payload: undefined },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Push failed');

      await useSyncStore.getState().pushToCloud();

      expect(useSyncStore.getState().syncing).toBe(false);
      expect(useSyncStore.getState().error).toBe('Push failed');
    });

    it('clears error on new push', async () => {
      useSyncStore.setState({ error: 'Previous error' });
      mockSuccess(undefined);

      await useSyncStore.getState().pushToCloud();

      expect(useSyncStore.getState().error).toBeNull();
    });
  });

  describe('pullFromCloud', () => {
    it('sets lastSyncAt on success without conflict', async () => {
      mockSuccess({});

      await useSyncStore.getState().pullFromCloud();

      expect(useSyncStore.getState().syncing).toBe(false);
      expect(useSyncStore.getState().lastSyncAt).toBeDefined();
      expect(useSyncStore.getState().conflict).toBeNull();
    });

    it('sets conflict when response contains conflict', async () => {
      const conflict = { local: { name: 'Local' }, remote: { name: 'Remote' } };
      mockSuccess({ conflict });

      await useSyncStore.getState().pullFromCloud();

      expect(useSyncStore.getState().syncing).toBe(false);
      expect(useSyncStore.getState().conflict).toEqual(conflict);
      expect(useSyncStore.getState().lastSyncAt).toBeNull();
    });

    it('sends PULL_COLLECTION message', async () => {
      mockSuccess({});

      await useSyncStore.getState().pullFromCloud();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'PULL_COLLECTION', payload: undefined },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Pull failed');

      await useSyncStore.getState().pullFromCloud();

      expect(useSyncStore.getState().syncing).toBe(false);
      expect(useSyncStore.getState().error).toBe('Pull failed');
    });

    it('handles null result (no conflict)', async () => {
      mockSuccess(null);

      await useSyncStore.getState().pullFromCloud();

      expect(useSyncStore.getState().conflict).toBeNull();
      expect(useSyncStore.getState().lastSyncAt).toBeDefined();
    });
  });

  describe('resolveConflict', () => {
    it('clears conflict and sets lastSyncAt on success', async () => {
      useSyncStore.setState({
        conflict: { local: { name: 'Local' }, remote: { name: 'Remote' } },
      });
      mockSuccess(undefined);

      await useSyncStore.getState().resolveConflict('merge');

      expect(useSyncStore.getState().syncing).toBe(false);
      expect(useSyncStore.getState().conflict).toBeNull();
      expect(useSyncStore.getState().lastSyncAt).toBeDefined();
    });

    it('sends PULL_COLLECTION message with strategy', async () => {
      mockSuccess(undefined);

      await useSyncStore.getState().resolveConflict('replace-local');

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'PULL_COLLECTION',
          payload: { strategy: 'replace-local' },
        },
        expect.any(Function),
      );
    });

    it('sends correct strategy for replace-cloud', async () => {
      mockSuccess(undefined);

      await useSyncStore.getState().resolveConflict('replace-cloud');

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'PULL_COLLECTION',
          payload: { strategy: 'replace-cloud' },
        },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Resolve failed');

      await useSyncStore.getState().resolveConflict('merge');

      expect(useSyncStore.getState().syncing).toBe(false);
      expect(useSyncStore.getState().error).toBe('Resolve failed');
    });
  });
});
