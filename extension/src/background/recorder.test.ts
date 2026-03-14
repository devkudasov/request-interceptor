import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | null) => {
        if (keys === null) return Promise.resolve({ ...mockStorage });
        if (typeof keys === 'string') return Promise.resolve({ [keys]: mockStorage[keys] });
        const result: Record<string, unknown> = {};
        for (const key of keys as string[]) result[key] = mockStorage[key];
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
});

vi.mock('@/shared/constants', async () => {
  const actual = await vi.importActual<typeof import('@/shared/constants')>('@/shared/constants');
  return {
    ...actual,
    PLAN_PRICE_IDS: { pro: '', team: '' },
  };
});

import {
  startRecording,
  stopRecording,
  isRecording,
  getRecordingTabId,
  addRecordedResponse,
  getRecordedResponses,
} from './recorder';
import type { LogEntry } from '@/features/logging';

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'entry-1',
    timestamp: '2026-03-15T12:00:00.000Z',
    tabId: 1,
    method: 'GET',
    url: 'https://example.com',
    requestHeaders: {},
    requestBody: null,
    statusCode: 200,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    duration: 100,
    mocked: false,
    matchedRuleId: null,
    ...overrides,
  };
}

describe('recorder', () => {
  beforeEach(async () => {
    mockStorage = {};
    vi.clearAllMocks();
    // Reset module-level state by stopping any active recording
    // The module has a local `recordedResponses` array that persists
    // We need to import fresh or reset by calling stopRecording
    await stopRecording();
  });

  describe('startRecording', () => {
    it('sets IS_RECORDING to true in storage', async () => {
      await startRecording(5);
      expect(mockStorage.isRecording).toBe(true);
    });

    it('sets RECORDING_TAB_ID in storage', async () => {
      await startRecording(42);
      expect(mockStorage.recordingTabId).toBe(42);
    });

    it('clears previously recorded responses', async () => {
      addRecordedResponse(makeLogEntry({ id: 'old' }));
      await startRecording(1);
      expect(getRecordedResponses()).toEqual([]);
    });
  });

  describe('stopRecording', () => {
    it('sets IS_RECORDING to false', async () => {
      await startRecording(1);
      await stopRecording();
      expect(mockStorage.isRecording).toBe(false);
    });

    it('sets RECORDING_TAB_ID to null', async () => {
      await startRecording(1);
      await stopRecording();
      expect(mockStorage.recordingTabId).toBeNull();
    });

    it('returns captured responses', async () => {
      await startRecording(1);
      const entry1 = makeLogEntry({ id: 'e1' });
      const entry2 = makeLogEntry({ id: 'e2' });
      addRecordedResponse(entry1);
      addRecordedResponse(entry2);

      const result = await stopRecording();
      expect(result).toEqual([entry1, entry2]);
    });

    it('clears the internal buffer after stopping', async () => {
      await startRecording(1);
      addRecordedResponse(makeLogEntry({ id: 'e1' }));
      await stopRecording();

      expect(getRecordedResponses()).toEqual([]);
    });
  });

  describe('addRecordedResponse', () => {
    it('adds an entry to the buffer', async () => {
      await startRecording(1);
      const entry = makeLogEntry({ id: 'new-entry' });
      addRecordedResponse(entry);
      expect(getRecordedResponses()).toEqual([entry]);
    });

    it('accumulates multiple entries', async () => {
      await startRecording(1);
      addRecordedResponse(makeLogEntry({ id: 'a' }));
      addRecordedResponse(makeLogEntry({ id: 'b' }));
      addRecordedResponse(makeLogEntry({ id: 'c' }));
      expect(getRecordedResponses()).toHaveLength(3);
    });
  });

  describe('getRecordedResponses', () => {
    it('returns a copy of the buffer', async () => {
      await startRecording(1);
      const entry = makeLogEntry();
      addRecordedResponse(entry);

      const result = getRecordedResponses();
      result.push(makeLogEntry({ id: 'extra' }));

      // Original buffer should not be modified
      expect(getRecordedResponses()).toHaveLength(1);
    });

    it('returns empty array when no responses recorded', async () => {
      await startRecording(1);
      expect(getRecordedResponses()).toEqual([]);
    });
  });

  describe('isRecording', () => {
    it('returns true when recording is active', async () => {
      await startRecording(1);
      const result = await isRecording();
      expect(result).toBe(true);
    });

    it('returns false when not recording', async () => {
      const result = await isRecording();
      expect(result).toBe(false);
    });

    it('returns false after stopping', async () => {
      await startRecording(1);
      await stopRecording();
      const result = await isRecording();
      expect(result).toBe(false);
    });
  });

  describe('getRecordingTabId', () => {
    it('returns the tab id when recording', async () => {
      await startRecording(99);
      const result = await getRecordingTabId();
      expect(result).toBe(99);
    });

    it('returns null when not recording', async () => {
      const result = await getRecordingTabId();
      expect(result).toBeNull();
    });

    it('returns null after stopping', async () => {
      await startRecording(5);
      await stopRecording();
      const result = await getRecordingTabId();
      expect(result).toBeNull();
    });
  });
});
