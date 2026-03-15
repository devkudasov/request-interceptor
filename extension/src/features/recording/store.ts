import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { LogEntry } from '@/features/logging/types';
import type { MockRule } from '@/features/rules/types';
import { convertEntriesToRules } from './utils/convertToRules';
import { useRulesStore } from '@/features/rules/store';

interface RecordingState {
  isRecording: boolean;
  recordingTabId: number | null;
  recordedEntries: LogEntry[];
  startRecording: (tabId: number) => Promise<void>;
  stopRecording: () => Promise<LogEntry[]>;
  fetchRecordingData: () => Promise<void>;
  saveRecordedAsRules: () => Promise<MockRule[]>;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
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

  saveRecordedAsRules: async () => {
    const { recordedEntries } = get();
    const ruleDataArr = convertEntriesToRules(recordedEntries);
    if (ruleDataArr.length === 0) return [];

    const { createRule } = useRulesStore.getState();
    const created: MockRule[] = [];
    for (const ruleData of ruleDataArr) {
      const rule = await createRule(ruleData);
      created.push(rule);
    }
    set({ recordedEntries: [] });
    return created;
  },
}));
