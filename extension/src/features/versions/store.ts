import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { VersionSnapshot } from './types';

interface VersionHistoryState {
  versions: VersionSnapshot[];
  selectedVersion: VersionSnapshot | null;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  fetchVersions: (teamId: string, collectionId: string) => Promise<void>;
  loadMore: (teamId: string, collectionId: string) => Promise<void>;
  selectVersion: (teamId: string, collectionId: string, versionId: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  clearSelection: () => void;
}

export const useVersionStore = create<VersionHistoryState>((set, get) => ({
  versions: [],
  selectedVersion: null,
  loading: false,
  hasMore: false,
  error: null,

  fetchVersions: async (teamId, collectionId) => {
    set({ loading: true, error: null, versions: [], selectedVersion: null });
    try {
      const versions = await sendMessage<VersionSnapshot[]>(
        MESSAGE_TYPES.GET_VERSION_HISTORY,
        { teamId, collectionId },
      );
      set({ versions, loading: false, hasMore: versions.length >= 20 });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loadMore: async (teamId, collectionId) => {
    const { versions } = get();
    const lastVersion = versions[versions.length - 1];
    if (!lastVersion) return;

    set({ loading: true, error: null });
    try {
      const moreVersions = await sendMessage<VersionSnapshot[]>(
        MESSAGE_TYPES.GET_VERSION_HISTORY,
        { teamId, collectionId, startAfterId: lastVersion.id },
      );
      set((s) => ({
        versions: [...s.versions, ...moreVersions],
        loading: false,
        hasMore: moreVersions.length >= 20,
      }));
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  selectVersion: async (teamId, collectionId, versionId) => {
    set({ loading: true, error: null });
    try {
      const version = await sendMessage<VersionSnapshot | null>(
        MESSAGE_TYPES.GET_VERSION,
        { teamId, collectionId, versionId },
      );
      set({ selectedVersion: version, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  restoreVersion: async (versionId) => {
    set({ loading: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.RESTORE_VERSION, { versionId });
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  clearSelection: () => set({ selectedVersion: null }),
}));
