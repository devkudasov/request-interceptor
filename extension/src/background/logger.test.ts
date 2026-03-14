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

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

vi.mock('@/shared/constants', async () => {
  const actual = await vi.importActual<typeof import('@/shared/constants')>('@/shared/constants');
  return {
    ...actual,
    PLAN_PRICE_IDS: { pro: '', team: '' },
  };
});

import { addLogEntry, clearLog } from './logger';
import type { LogEntry } from '@/features/logging';

function makeEntryData(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    url: 'https://api.example.com/data',
    statusCode: 200,
    duration: 150,
    mocked: false,
    tabId: 1,
    requestHeaders: {},
    requestBody: null,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    matchedRuleId: null,
    ...overrides,
  } as Omit<LogEntry, 'id' | 'timestamp'> & { tabId?: number };
}

describe('logger', () => {
  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
  });

  describe('addLogEntry', () => {
    it('creates a log entry with id and timestamp', async () => {
      const entry = await addLogEntry(makeEntryData());

      expect(entry.id).toBe('test-uuid-123');
      expect(entry.timestamp).toBe('2026-03-15T12:00:00.000Z');
      expect(entry.method).toBe('GET');
      expect(entry.url).toBe('https://api.example.com/data');
      expect(entry.statusCode).toBe(200);
      expect(entry.duration).toBe(150);
      expect(entry.mocked).toBe(false);
    });

    it('defaults tabId to 0 when not provided', async () => {
      const data = makeEntryData();
      delete (data as Record<string, unknown>).tabId;
      const entry = await addLogEntry(data);
      expect(entry.tabId).toBe(0);
    });

    it('uses provided tabId', async () => {
      const entry = await addLogEntry(makeEntryData({ tabId: 42 }));
      expect(entry.tabId).toBe(42);
    });

    it('defaults optional fields', async () => {
      const entry = await addLogEntry(makeEntryData({ method: 'POST', statusCode: 201, duration: 50, mocked: true }));

      expect(entry.requestHeaders).toEqual({});
      expect(entry.requestBody).toBeNull();
      expect(entry.responseHeaders).toEqual({});
      expect(entry.responseBody).toBeNull();
      expect(entry.responseSize).toBe(0);
      expect(entry.matchedRuleId).toBeNull();
    });

    it('uses provided optional fields', async () => {
      const entry = await addLogEntry(makeEntryData({
        method: 'POST',
        mocked: true,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: '{"key":"value"}',
        responseHeaders: { 'X-Custom': 'header' },
        responseBody: '{"result":"ok"}',
        responseSize: 1024,
        matchedRuleId: 'rule-1',
      }));

      expect(entry.requestHeaders).toEqual({ 'Content-Type': 'application/json' });
      expect(entry.requestBody).toBe('{"key":"value"}');
      expect(entry.responseHeaders).toEqual({ 'X-Custom': 'header' });
      expect(entry.responseBody).toBe('{"result":"ok"}');
      expect(entry.responseSize).toBe(1024);
      expect(entry.matchedRuleId).toBe('rule-1');
    });

    it('truncates responseBody to 100KB', async () => {
      const largeBody = 'x'.repeat(200000);
      const entry = await addLogEntry(makeEntryData({ responseBody: largeBody }));

      expect(entry.responseBody!.length).toBe(102400);
    });

    it('prepends new entry to the log', async () => {
      const existingEntry: LogEntry = {
        id: 'old-entry',
        timestamp: '2026-03-15T11:00:00.000Z',
        tabId: 1,
        method: 'GET',
        url: 'https://old.com',
        requestHeaders: {},
        requestBody: null,
        statusCode: 200,
        responseHeaders: {},
        responseBody: null,
        responseSize: 0,
        duration: 50,
        mocked: false,
        matchedRuleId: null,
      };
      mockStorage.requestLog = [existingEntry];

      await addLogEntry(makeEntryData({ url: 'https://new.com', method: 'POST', statusCode: 201 }));

      const storedLog = mockStorage.requestLog as LogEntry[];
      expect(storedLog.length).toBe(2);
      expect(storedLog[0].url).toBe('https://new.com');
      expect(storedLog[1].url).toBe('https://old.com');
    });

    it('limits log to 1000 entries', async () => {
      const existingEntries: LogEntry[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `entry-${i}`,
        timestamp: '2026-03-15T11:00:00.000Z',
        tabId: 1,
        method: 'GET',
        url: `https://example.com/${i}`,
        requestHeaders: {},
        requestBody: null,
        statusCode: 200,
        responseHeaders: {},
        responseBody: null,
        responseSize: 0,
        duration: 50,
        mocked: false,
        matchedRuleId: null,
      }));
      mockStorage.requestLog = existingEntries;

      await addLogEntry(makeEntryData({ url: 'https://newest.com' }));

      const storedLog = mockStorage.requestLog as LogEntry[];
      expect(storedLog.length).toBe(1000);
      expect(storedLog[0].url).toBe('https://newest.com');
      expect(storedLog[999].url).toBe('https://example.com/998');
    });

    it('returns the created entry', async () => {
      const entry = await addLogEntry(makeEntryData({
        method: 'DELETE',
        url: 'https://example.com/resource/1',
        statusCode: 204,
        duration: 30,
        mocked: true,
        matchedRuleId: 'rule-x',
      }));

      expect(entry).toEqual(expect.objectContaining({
        id: 'test-uuid-123',
        method: 'DELETE',
        url: 'https://example.com/resource/1',
        statusCode: 204,
        mocked: true,
        matchedRuleId: 'rule-x',
      }));
    });
  });

  describe('clearLog', () => {
    it('sets the request log to an empty array', async () => {
      mockStorage.requestLog = [{ id: 'entry-1' }];
      await clearLog();
      expect(mockStorage.requestLog).toEqual([]);
    });

    it('calls setStorage with REQUEST_LOG key', async () => {
      await clearLog();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ requestLog: [] });
    });
  });
});
