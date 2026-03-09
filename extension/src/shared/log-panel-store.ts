import { create } from 'zustand';

interface LogPanelState {
  isOpen: boolean;
  panelHeight: number;
  unseenCount: number;
  togglePanel: () => void;
  setPanelHeight: (height: number) => void;
  incrementUnseen: () => void;
  resetUnseen: () => void;
}

export const useLogPanelStore = create<LogPanelState>((set) => ({
  isOpen: false,
  panelHeight: 250,
  unseenCount: 0,

  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),

  setPanelHeight: (height) =>
    set({ panelHeight: Math.min(500, Math.max(150, height)) }),

  incrementUnseen: () =>
    set((s) => ({ unseenCount: s.unseenCount + 1 })),

  resetUnseen: () => set({ unseenCount: 0 }),
}));
