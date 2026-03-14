import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCollectionsStore } from './store';
import type { Collection } from './types';

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-col' }));

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

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'My Collection',
    parentId: null,
    enabled: true,
    order: 0,
    ruleIds: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
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

describe('useCollectionsStore', () => {
  beforeEach(() => {
    useCollectionsStore.setState(useCollectionsStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with empty collections and loading false', () => {
      const state = useCollectionsStore.getState();
      expect(state.collections).toEqual([]);
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchCollections', () => {
    it('fetches collections and sets state', async () => {
      const collections = [makeCollection({ id: 'c1' }), makeCollection({ id: 'c2' })];
      mockSuccess(collections);

      await useCollectionsStore.getState().fetchCollections();

      const state = useCollectionsStore.getState();
      expect(state.collections).toEqual(collections);
      expect(state.loading).toBe(false);
    });

    it('sets loading to true during fetch', async () => {
      mockSendMessage.mockImplementation(() => {
        expect(useCollectionsStore.getState().loading).toBe(true);
      });
    });

    it('sends GET_COLLECTIONS message', async () => {
      mockSuccess([]);
      await useCollectionsStore.getState().fetchCollections();
      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'GET_COLLECTIONS', payload: undefined },
        expect.any(Function),
      );
    });

    it('rejects on error', async () => {
      mockError('Fetch failed');
      await expect(
        useCollectionsStore.getState().fetchCollections(),
      ).rejects.toThrow('Fetch failed');
    });
  });

  describe('createCollection', () => {
    it('creates a collection with generated id', async () => {
      mockSuccess(undefined);

      const result = await useCollectionsStore
        .getState()
        .createCollection('Test Collection');

      expect(result.id).toBe('mock-uuid-col');
      expect(result.name).toBe('Test Collection');
      expect(result.parentId).toBeNull();
      expect(result.enabled).toBe(true);
      expect(result.ruleIds).toEqual([]);
    });

    it('creates collection with parentId', async () => {
      mockSuccess(undefined);

      const result = await useCollectionsStore
        .getState()
        .createCollection('Child', 'parent-id');

      expect(result.parentId).toBe('parent-id');
    });

    it('sets order based on collections length', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({
        collections: [makeCollection(), makeCollection({ id: 'c2' })],
      });

      const result = await useCollectionsStore
        .getState()
        .createCollection('Third');

      expect(result.order).toBe(2);
    });

    it('appends collection to state', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({ collections: [makeCollection()] });

      await useCollectionsStore.getState().createCollection('New');

      expect(useCollectionsStore.getState().collections).toHaveLength(2);
    });

    it('sends CREATE_COLLECTION message', async () => {
      mockSuccess(undefined);

      await useCollectionsStore.getState().createCollection('Test');

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'CREATE_COLLECTION',
          payload: expect.objectContaining({
            id: 'mock-uuid-col',
            name: 'Test',
          }),
        },
        expect.any(Function),
      );
    });

    it('defaults parentId to null when not provided', async () => {
      mockSuccess(undefined);

      const result = await useCollectionsStore
        .getState()
        .createCollection('No Parent');

      expect(result.parentId).toBeNull();
    });
  });

  describe('updateCollection', () => {
    it('updates the specified collection', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({
        collections: [makeCollection({ id: 'c1', name: 'Old Name' })],
      });

      await useCollectionsStore
        .getState()
        .updateCollection('c1', { name: 'New Name' });

      const updated = useCollectionsStore
        .getState()
        .collections.find((c) => c.id === 'c1');
      expect(updated?.name).toBe('New Name');
      expect(updated?.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
    });

    it('does not modify other collections', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({
        collections: [
          makeCollection({ id: 'c1', name: 'First' }),
          makeCollection({ id: 'c2', name: 'Second' }),
        ],
      });

      await useCollectionsStore
        .getState()
        .updateCollection('c1', { name: 'Updated' });

      const other = useCollectionsStore
        .getState()
        .collections.find((c) => c.id === 'c2');
      expect(other?.name).toBe('Second');
    });

    it('sends UPDATE_COLLECTION message', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({ collections: [makeCollection()] });

      await useCollectionsStore
        .getState()
        .updateCollection('col-1', { name: 'New' });

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'UPDATE_COLLECTION',
          payload: { id: 'col-1', changes: { name: 'New' } },
        },
        expect.any(Function),
      );
    });
  });

  describe('deleteCollection', () => {
    it('removes the collection from state', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({
        collections: [
          makeCollection({ id: 'c1' }),
          makeCollection({ id: 'c2' }),
        ],
      });

      await useCollectionsStore.getState().deleteCollection('c1');

      expect(useCollectionsStore.getState().collections).toHaveLength(1);
      expect(useCollectionsStore.getState().collections[0].id).toBe('c2');
    });

    it('sends DELETE_COLLECTION message', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({ collections: [makeCollection()] });

      await useCollectionsStore.getState().deleteCollection('col-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'DELETE_COLLECTION', payload: { id: 'col-1' } },
        expect.any(Function),
      );
    });
  });

  describe('toggleCollection', () => {
    it('toggles enabled from true to false', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({
        collections: [makeCollection({ id: 'c1', enabled: true })],
      });

      await useCollectionsStore.getState().toggleCollection('c1');

      expect(
        useCollectionsStore.getState().collections[0].enabled,
      ).toBe(false);
    });

    it('toggles enabled from false to true', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({
        collections: [makeCollection({ id: 'c1', enabled: false })],
      });

      await useCollectionsStore.getState().toggleCollection('c1');

      expect(
        useCollectionsStore.getState().collections[0].enabled,
      ).toBe(true);
    });

    it('sends TOGGLE_COLLECTION message', async () => {
      mockSuccess(undefined);
      useCollectionsStore.setState({ collections: [makeCollection()] });

      await useCollectionsStore.getState().toggleCollection('col-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'TOGGLE_COLLECTION', payload: { id: 'col-1' } },
        expect.any(Function),
      );
    });
  });
});
