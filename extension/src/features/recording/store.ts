import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { LogEntry } from '@/features/logging/types';

interface RecordingState {
  isRecording: boolean;
  recordingTabId: number | null;
  recordedEntries: LogEntry[];
  startRecording: (tabId: number) => Promise<void>;
  stopRecording: () => Promise<LogEntry[]>;
  fetchRecordingData: () => Promise<void>;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  recordingTabId: null,
  recordedEntries: [],

  startRecording: async (tabId) => {
    await sendMessage(MESSAGE_TYPES.START_RECORDING, { tabId });
    set({ isRecording: true, recordingTabId: tabId, recordedEntries: [] });
  },

  stopRecording: async () => {
    const entries = await sendMessage<LogEntry[]>(MESSAGE_TYPES.STOP_RECORDING);
    set({ isRecording: false, recordingTabId: null, recordedEntries: entries });
    return entries;
  },

  fetchRecordingData: async () => {
    const entries = await sendMessage<LogEntry[]>(MESSAGE_TYPES.RECORDING_DATA);
    set({ recordedEntries: entries });
  },
}));
