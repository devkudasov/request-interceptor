import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { LogEntry } from './types';

interface LogState {
  entries: LogEntry[];
  paused: boolean;
  fetchLog: () => Promise<void>;
  clearLog: () => Promise<void>;
  togglePause: () => void;
  addEntry: (entry: LogEntry) => void;
  startListening: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  paused: false,

  fetchLog: async () => {
    const result = await chrome.storage.local.get('requestLog');
    set({ entries: result.requestLog ?? [] });
  },

  clearLog: async () => {
    await sendMessage(MESSAGE_TYPES.CLEAR_LOG);
    set({ entries: [] });
  },

  togglePause: () => set((s) => ({ paused: !s.paused })),

  addEntry: (entry) =>
    set((s) => {
      if (s.paused) return s;
      return { entries: [entry, ...s.entries].slice(0, 1000) };
    }),

  startListening: () => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === MESSAGE_TYPES.LOG_ENTRY && message.payload) {
        useLogStore.getState().addEntry(message.payload as LogEntry);
      }
    });
  },
}));

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
