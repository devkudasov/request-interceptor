import { create } from 'zustand';

type WorkspaceTypeTab = 'http' | 'websocket' | 'graphql';

interface WorkspaceUIState {
  activeTypeTab: WorkspaceTypeTab;
  setActiveTypeTab: (tab: WorkspaceTypeTab) => void;
  collapsedCollections: Set<string>;
  toggleCollectionCollapsed: (id: string) => Promise<void>;
  loadCollapsedState: () => Promise<void>;
}

export const useWorkspaceUIStore = create<WorkspaceUIState>((set, get) => ({
  activeTypeTab: 'http',
  collapsedCollections: new Set(),

  setActiveTypeTab: (tab) => set({ activeTypeTab: tab }),

  toggleCollectionCollapsed: async (id) => {
    const { collapsedCollections } = get();
    const next = new Set(collapsedCollections);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ collapsedCollections: next });
    await chrome.storage.session.set({ collapsedCollections: [...next] });
  },

  loadCollapsedState: async () => {
    const result = await chrome.storage.session.get(['collapsedCollections']);
    const ids: string[] = result.collapsedCollections ?? [];
    set({ collapsedCollections: new Set(ids) });
  },
}));
