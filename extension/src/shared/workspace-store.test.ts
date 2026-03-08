import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock chrome.storage.session before importing store
const mockSessionStorage: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    session: {
      get: vi.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in mockSessionStorage) {
            result[key] = mockSessionStorage[key];
          }
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockSessionStorage, items);
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    lastError: null,
  },
});

import { useWorkspaceUIStore } from './store';

describe('useWorkspaceUIStore', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useWorkspaceUIStore.setState({
        activeTypeTab: 'http',
        collapsedCollections: new Set(),
      });
    });
    // Clear mock session storage
    for (const key of Object.keys(mockSessionStorage)) {
      delete mockSessionStorage[key];
    }
    vi.clearAllMocks();
  });

  it('has http as default activeTypeTab', () => {
    expect(useWorkspaceUIStore.getState().activeTypeTab).toBe('http');
  });

  it('sets activeTypeTab', () => {
    act(() => {
      useWorkspaceUIStore.getState().setActiveTypeTab('websocket');
    });

    expect(useWorkspaceUIStore.getState().activeTypeTab).toBe('websocket');
  });

  it('sets activeTypeTab to graphql', () => {
    act(() => {
      useWorkspaceUIStore.getState().setActiveTypeTab('graphql');
    });

    expect(useWorkspaceUIStore.getState().activeTypeTab).toBe('graphql');
  });

  it('has empty collapsedCollections by default', () => {
    expect(useWorkspaceUIStore.getState().collapsedCollections.size).toBe(0);
  });

  it('toggleCollectionCollapsed adds collection id to collapsed set', async () => {
    await act(async () => {
      await useWorkspaceUIStore.getState().toggleCollectionCollapsed('c1');
    });

    expect(useWorkspaceUIStore.getState().collapsedCollections.has('c1')).toBe(true);
  });

  it('toggleCollectionCollapsed removes collection id when already collapsed', async () => {
    await act(async () => {
      await useWorkspaceUIStore.getState().toggleCollectionCollapsed('c1');
    });
    expect(useWorkspaceUIStore.getState().collapsedCollections.has('c1')).toBe(true);

    await act(async () => {
      await useWorkspaceUIStore.getState().toggleCollectionCollapsed('c1');
    });
    expect(useWorkspaceUIStore.getState().collapsedCollections.has('c1')).toBe(false);
  });

  it('toggleCollectionCollapsed persists to chrome.storage.session', async () => {
    await act(async () => {
      await useWorkspaceUIStore.getState().toggleCollectionCollapsed('c1');
    });

    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      collapsedCollections: ['c1'],
    });
  });

  it('loadCollapsedState restores from chrome.storage.session', async () => {
    mockSessionStorage['collapsedCollections'] = ['c1', 'c2'];

    await act(async () => {
      await useWorkspaceUIStore.getState().loadCollapsedState();
    });

    const { collapsedCollections } = useWorkspaceUIStore.getState();
    expect(collapsedCollections.has('c1')).toBe(true);
    expect(collapsedCollections.has('c2')).toBe(true);
    expect(collapsedCollections.size).toBe(2);
  });

  it('loadCollapsedState handles empty storage', async () => {
    await act(async () => {
      await useWorkspaceUIStore.getState().loadCollapsedState();
    });

    expect(useWorkspaceUIStore.getState().collapsedCollections.size).toBe(0);
  });
});
