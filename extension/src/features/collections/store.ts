import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { Collection } from './types';

interface CollectionsState {
  collections: Collection[];
  loading: boolean;
  fetchCollections: () => Promise<void>;
  createCollection: (name: string, parentId?: string | null) => Promise<Collection>;
  updateCollection: (id: string, changes: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  toggleCollection: (id: string) => Promise<void>;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  loading: false,

  fetchCollections: async () => {
    set({ loading: true });
    const collections = await sendMessage<Collection[]>(MESSAGE_TYPES.GET_COLLECTIONS);
    set({ collections, loading: false });
  },

  createCollection: async (name, parentId = null) => {
    const now = new Date().toISOString();
    const collection: Collection = {
      id: uuid(),
      name,
      parentId,
      enabled: true,
      order: get().collections.length,
      ruleIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await sendMessage(MESSAGE_TYPES.CREATE_COLLECTION, collection);
    set((s) => ({ collections: [...s.collections, collection] }));
    return collection;
  },

  updateCollection: async (id, changes) => {
    await sendMessage(MESSAGE_TYPES.UPDATE_COLLECTION, { id, changes });
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c,
      ),
    }));
  },

  deleteCollection: async (id) => {
    await sendMessage(MESSAGE_TYPES.DELETE_COLLECTION, { id });
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
  },

  toggleCollection: async (id) => {
    await sendMessage(MESSAGE_TYPES.TOGGLE_COLLECTION, { id });
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c,
      ),
    }));
  },
}));
