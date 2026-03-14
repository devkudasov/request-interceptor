import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { ConflictStrategy } from './types';

interface SyncState {
  syncing: boolean;
  lastSyncAt: string | null;
  conflict: { local: { name: string }; remote: { name: string } } | null;
  error: string | null;
  pushToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  resolveConflict: (strategy: ConflictStrategy) => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  syncing: false,
  lastSyncAt: null,
  conflict: null,
  error: null,

  pushToCloud: async () => {
    set({ syncing: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.PUSH_COLLECTION);
      set({ syncing: false, lastSyncAt: new Date().toISOString() });
    } catch (err) {
      set({ syncing: false, error: (err as Error).message });
    }
  },

  pullFromCloud: async () => {
    set({ syncing: true, error: null });
    try {
      const result = await sendMessage<{ conflict?: { local: { name: string }; remote: { name: string } } }>(
        MESSAGE_TYPES.PULL_COLLECTION,
      );
      if (result?.conflict) {
        set({ syncing: false, conflict: result.conflict });
      } else {
        set({ syncing: false, lastSyncAt: new Date().toISOString(), conflict: null });
      }
    } catch (err) {
      set({ syncing: false, error: (err as Error).message });
    }
  },

  resolveConflict: async (strategy) => {
    set({ syncing: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.PULL_COLLECTION, { strategy });
      set({ syncing: false, conflict: null, lastSyncAt: new Date().toISOString() });
    } catch (err) {
      set({ syncing: false, error: (err as Error).message });
    }
  },
}));
