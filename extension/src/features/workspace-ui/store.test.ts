import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkspaceUIStore } from './store';

const mockSessionGet = vi.fn();
const mockSessionSet = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn(),
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: mockSessionGet, set: mockSessionSet },
  },
  tabs: { query: vi.fn() },
});

describe('useWorkspaceUIStore', () => {
  beforeEach(() => {
    useWorkspaceUIStore.setState({
      activeTypeTab: 'http',
      collapsedCollections: new Set(),
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with http tab and no collapsed collections', () => {
      const state = useWorkspaceUIStore.getState();
      expect(state.activeTypeTab).toBe('http');
      expect(state.collapsedCollections.size).toBe(0);
    });
  });

  describe('setActiveTypeTab', () => {
    it('sets active tab to websocket', () => {
      useWorkspaceUIStore.getState().setActiveTypeTab('websocket');
      expect(useWorkspaceUIStore.getState().activeTypeTab).toBe('websocket');
    });

    it('sets active tab to graphql', () => {
      useWorkspaceUIStore.getState().setActiveTypeTab('graphql');
      expect(useWorkspaceUIStore.getState().activeTypeTab).toBe('graphql');
    });

    it('sets active tab back to http', () => {
      useWorkspaceUIStore.setState({ activeTypeTab: 'websocket' });
      useWorkspaceUIStore.getState().setActiveTypeTab('http');
      expect(useWorkspaceUIStore.getState().activeTypeTab).toBe('http');
    });
  });

  describe('toggleCollectionCollapsed', () => {
    it('adds collection id when not collapsed', async () => {
      mockSessionSet.mockResolvedValue(undefined);

      await useWorkspaceUIStore
        .getState()
        .toggleCollectionCollapsed('col-1');

      expect(
        useWorkspaceUIStore.getState().collapsedCollections.has('col-1'),
      ).toBe(true);
    });

    it('removes collection id when already collapsed', async () => {
      useWorkspaceUIStore.setState({
        collapsedCollections: new Set(['col-1']),
      });
      mockSessionSet.mockResolvedValue(undefined);

      await useWorkspaceUIStore
        .getState()
        .toggleCollectionCollapsed('col-1');

      expect(
        useWorkspaceUIStore.getState().collapsedCollections.has('col-1'),
      ).toBe(false);
    });

    it('persists collapsed state to chrome.storage.session', async () => {
      mockSessionSet.mockResolvedValue(undefined);

      await useWorkspaceUIStore
        .getState()
        .toggleCollectionCollapsed('col-1');

      expect(mockSessionSet).toHaveBeenCalledWith({
        collapsedCollections: ['col-1'],
      });
    });

    it('persists after removing an id', async () => {
      useWorkspaceUIStore.setState({
        collapsedCollections: new Set(['col-1', 'col-2']),
      });
      mockSessionSet.mockResolvedValue(undefined);

      await useWorkspaceUIStore
        .getState()
        .toggleCollectionCollapsed('col-1');

      expect(mockSessionSet).toHaveBeenCalledWith({
        collapsedCollections: ['col-2'],
      });
    });
  });

  describe('loadCollapsedState', () => {
    it('loads collapsed state from chrome.storage.session', async () => {
      mockSessionGet.mockResolvedValue({
        collapsedCollections: ['col-1', 'col-2'],
      });

      await useWorkspaceUIStore.getState().loadCollapsedState();

      const collapsed = useWorkspaceUIStore.getState().collapsedCollections;
      expect(collapsed.has('col-1')).toBe(true);
      expect(collapsed.has('col-2')).toBe(true);
      expect(collapsed.size).toBe(2);
    });

    it('defaults to empty set when no data in storage', async () => {
      mockSessionGet.mockResolvedValue({});

      await useWorkspaceUIStore.getState().loadCollapsedState();

      expect(useWorkspaceUIStore.getState().collapsedCollections.size).toBe(0);
    });

    it('calls chrome.storage.session.get with correct key', async () => {
      mockSessionGet.mockResolvedValue({});

      await useWorkspaceUIStore.getState().loadCollapsedState();

      expect(mockSessionGet).toHaveBeenCalledWith(['collapsedCollections']);
    });
  });
});
