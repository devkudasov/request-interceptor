import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRecordingStore } from './store';
import type { LogEntry } from '@/features/logging/types';

const mockSendMessage = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn() },
});

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'log-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    tabId: 1,
    method: 'GET',
    url: 'https://api.example.com/data',
    requestHeaders: {},
    requestBody: null,
    statusCode: 200,
    responseHeaders: {},
    responseBody: '{"ok":true}',
    responseSize: 100,
    duration: 50,
    mocked: true,
    matchedRuleId: 'rule-1',
    ...overrides,
  };
}

function mockSuccess(data: unknown = undefined) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: true, data });
    },
  );
}

function mockError(error: string) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: false, error });
    },
  );
}

describe('useRecordingStore', () => {
  beforeEach(() => {
    useRecordingStore.setState(useRecordingStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with correct defaults', () => {
      const state = useRecordingStore.getState();
      expect(state.isRecording).toBe(false);
      expect(state.recordingTabId).toBeNull();
      expect(state.recordedEntries).toEqual([]);
    });
  });

  describe('startRecording', () => {
    it('sets isRecording and recordingTabId', async () => {
      mockSuccess(undefined);

      await useRecordingStore.getState().startRecording(42);

      expect(useRecordingStore.getState().isRecording).toBe(true);
      expect(useRecordingStore.getState().recordingTabId).toBe(42);
      expect(useRecordingStore.getState().recordedEntries).toEqual([]);
    });

    it('sends START_RECORDING message with tabId', async () => {
      mockSuccess(undefined);

      await useRecordingStore.getState().startRecording(42);

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'START_RECORDING', payload: { tabId: 42 } },
        expect.any(Function),
      );
    });

    it('clears previous recorded entries', async () => {
      useRecordingStore.setState({ recordedEntries: [makeLogEntry()] });
      mockSuccess(undefined);

      await useRecordingStore.getState().startRecording(1);

      expect(useRecordingStore.getState().recordedEntries).toEqual([]);
    });

    it('rejects on error', async () => {
      mockError('Start failed');

      await expect(
        useRecordingStore.getState().startRecording(1),
      ).rejects.toThrow('Start failed');
    });
  });

  describe('stopRecording', () => {
    it('sets isRecording to false and stores entries', async () => {
      const entries = [makeLogEntry({ id: 'e1' }), makeLogEntry({ id: 'e2' })];
      mockSuccess(entries);

      useRecordingStore.setState({ isRecording: true, recordingTabId: 42 });
      const result = await useRecordingStore.getState().stopRecording();

      expect(useRecordingStore.getState().isRecording).toBe(false);
      expect(useRecordingStore.getState().recordingTabId).toBeNull();
      expect(useRecordingStore.getState().recordedEntries).toEqual(entries);
      expect(result).toEqual(entries);
    });

    it('sends STOP_RECORDING message', async () => {
      mockSuccess([]);

      await useRecordingStore.getState().stopRecording();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'STOP_RECORDING', payload: undefined },
        expect.any(Function),
      );
    });

    it('returns the recorded entries', async () => {
      const entries = [makeLogEntry()];
      mockSuccess(entries);

      const result = await useRecordingStore.getState().stopRecording();

      expect(result).toEqual(entries);
    });
  });

  describe('fetchRecordingData', () => {
    it('sets recordedEntries', async () => {
      const entries = [makeLogEntry({ id: 'e1' })];
      mockSuccess(entries);

      await useRecordingStore.getState().fetchRecordingData();

      expect(useRecordingStore.getState().recordedEntries).toEqual(entries);
    });

    it('sends RECORDING_DATA message', async () => {
      mockSuccess([]);

      await useRecordingStore.getState().fetchRecordingData();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'RECORDING_DATA', payload: undefined },
        expect.any(Function),
      );
    });
  });
});
