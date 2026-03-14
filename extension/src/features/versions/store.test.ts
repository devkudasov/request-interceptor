import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVersionStore } from './store';
import type { VersionSnapshot } from './types';

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

function makeVersion(overrides: Partial<VersionSnapshot> = {}): VersionSnapshot {
  return {
    id: 'ver-1',
    version: 1,
    rules: [],
    rulesSnapshot: [],
    author: { uid: 'user-1', displayName: 'Test User' },
    createdBy: 'user-1',
    createdByEmail: 'test@example.com',
    createdAt: '2024-01-01T00:00:00.000Z',
    message: 'Initial version',
    ...overrides,
  };
}

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

describe('useVersionStore', () => {
  beforeEach(() => {
    useVersionStore.setState(useVersionStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with correct defaults', () => {
      const state = useVersionStore.getState();
      expect(state.versions).toEqual([]);
      expect(state.selectedVersion).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.hasMore).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchVersions', () => {
    it('sets versions on success', async () => {
      const versions = [makeVersion({ id: 'v1' }), makeVersion({ id: 'v2' })];
      mockSuccess(versions);

      await useVersionStore.getState().fetchVersions('team-1', 'col-1');

      expect(useVersionStore.getState().versions).toEqual(versions);
      expect(useVersionStore.getState().loading).toBe(false);
    });

    it('resets versions and selectedVersion before fetching', async () => {
      useVersionStore.setState({
        versions: [makeVersion()],
        selectedVersion: makeVersion(),
      });
      mockSuccess([]);

      await useVersionStore.getState().fetchVersions('team-1', 'col-1');

      expect(useVersionStore.getState().versions).toEqual([]);
      expect(useVersionStore.getState().selectedVersion).toBeNull();
    });

    it('sets hasMore true when 20 or more versions returned', async () => {
      const versions = Array.from({ length: 20 }, (_, i) =>
        makeVersion({ id: `v-${i}` }),
      );
      mockSuccess(versions);

      await useVersionStore.getState().fetchVersions('team-1', 'col-1');

      expect(useVersionStore.getState().hasMore).toBe(true);
    });

    it('sets hasMore false when fewer than 20 versions returned', async () => {
      mockSuccess([makeVersion()]);

      await useVersionStore.getState().fetchVersions('team-1', 'col-1');

      expect(useVersionStore.getState().hasMore).toBe(false);
    });

    it('sends GET_VERSION_HISTORY message', async () => {
      mockSuccess([]);

      await useVersionStore.getState().fetchVersions('team-1', 'col-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'GET_VERSION_HISTORY',
          payload: { teamId: 'team-1', collectionId: 'col-1' },
        },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Fetch versions failed');

      await useVersionStore.getState().fetchVersions('team-1', 'col-1');

      expect(useVersionStore.getState().error).toBe('Fetch versions failed');
      expect(useVersionStore.getState().loading).toBe(false);
    });
  });

  describe('loadMore', () => {
    it('appends more versions to existing list', async () => {
      const existing = [makeVersion({ id: 'v1' })];
      useVersionStore.setState({ versions: existing });

      const more = [makeVersion({ id: 'v2' }), makeVersion({ id: 'v3' })];
      mockSuccess(more);

      await useVersionStore.getState().loadMore('team-1', 'col-1');

      expect(useVersionStore.getState().versions).toHaveLength(3);
      expect(useVersionStore.getState().versions.map((v) => v.id)).toEqual([
        'v1',
        'v2',
        'v3',
      ]);
    });

    it('sends startAfterId from last version', async () => {
      useVersionStore.setState({
        versions: [makeVersion({ id: 'last-id' })],
      });
      mockSuccess([]);

      await useVersionStore.getState().loadMore('team-1', 'col-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'GET_VERSION_HISTORY',
          payload: {
            teamId: 'team-1',
            collectionId: 'col-1',
            startAfterId: 'last-id',
          },
        },
        expect.any(Function),
      );
    });

    it('returns early if no versions exist', async () => {
      useVersionStore.setState({ versions: [] });

      await useVersionStore.getState().loadMore('team-1', 'col-1');

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('sets hasMore based on returned count', async () => {
      useVersionStore.setState({ versions: [makeVersion()] });
      const moreVersions = Array.from({ length: 20 }, (_, i) =>
        makeVersion({ id: `m-${i}` }),
      );
      mockSuccess(moreVersions);

      await useVersionStore.getState().loadMore('team-1', 'col-1');

      expect(useVersionStore.getState().hasMore).toBe(true);
    });

    it('sets error on failure', async () => {
      useVersionStore.setState({ versions: [makeVersion()] });
      mockError('Load more failed');

      await useVersionStore.getState().loadMore('team-1', 'col-1');

      expect(useVersionStore.getState().error).toBe('Load more failed');
    });
  });

  describe('selectVersion', () => {
    it('sets selectedVersion on success', async () => {
      const version = makeVersion({ id: 'selected' });
      mockSuccess(version);

      await useVersionStore
        .getState()
        .selectVersion('team-1', 'col-1', 'selected');

      expect(useVersionStore.getState().selectedVersion).toEqual(version);
      expect(useVersionStore.getState().loading).toBe(false);
    });

    it('handles null response', async () => {
      mockSuccess(null);

      await useVersionStore
        .getState()
        .selectVersion('team-1', 'col-1', 'nonexistent');

      expect(useVersionStore.getState().selectedVersion).toBeNull();
    });

    it('sends GET_VERSION message', async () => {
      mockSuccess(null);

      await useVersionStore
        .getState()
        .selectVersion('team-1', 'col-1', 'ver-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'GET_VERSION',
          payload: {
            teamId: 'team-1',
            collectionId: 'col-1',
            versionId: 'ver-1',
          },
        },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Select failed');

      await useVersionStore
        .getState()
        .selectVersion('team-1', 'col-1', 'ver-1');

      expect(useVersionStore.getState().error).toBe('Select failed');
    });
  });

  describe('restoreVersion', () => {
    it('sets loading false on success', async () => {
      mockSuccess(undefined);

      await useVersionStore.getState().restoreVersion('ver-1');

      expect(useVersionStore.getState().loading).toBe(false);
    });

    it('sends RESTORE_VERSION message', async () => {
      mockSuccess(undefined);

      await useVersionStore.getState().restoreVersion('ver-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'RESTORE_VERSION', payload: { versionId: 'ver-1' } },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Restore failed');

      await useVersionStore.getState().restoreVersion('ver-1');

      expect(useVersionStore.getState().error).toBe('Restore failed');
    });
  });

  describe('clearSelection', () => {
    it('sets selectedVersion to null', () => {
      useVersionStore.setState({ selectedVersion: makeVersion() });

      useVersionStore.getState().clearSelection();

      expect(useVersionStore.getState().selectedVersion).toBeNull();
    });
  });
});
