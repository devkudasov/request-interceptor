import { describe, it, expect } from 'vitest';
import { convertEntriesToRules } from './convertToRules';
import type { LogEntry } from '@/features/logging/types';

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
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '{"ok":true}',
    responseSize: 100,
    duration: 50,
    mocked: false,
    matchedRuleId: null,
    ...overrides,
  };
}

describe('convertEntriesToRules', () => {
  it('returns empty array for empty entries', () => {
    const result = convertEntriesToRules([]);
    expect(result).toEqual([]);
  });

  it('converts a single LogEntry to MockRule shape', () => {
    const entry = makeLogEntry();
    const [rule] = convertEntriesToRules([entry]);

    expect(rule).toEqual({
      urlPattern: 'https://api.example.com/data',
      urlMatchType: 'exact',
      method: 'GET',
      requestType: 'http',
      statusCode: 200,
      responseType: 'json',
      responseBody: '{"ok":true}',
      responseHeaders: { 'content-type': 'application/json' },
      delay: 0,
      enabled: true,
      collectionId: null,
    });
  });

  it('maps GET method correctly', () => {
    const [rule] = convertEntriesToRules([makeLogEntry({ method: 'GET' })]);
    expect(rule.method).toBe('GET');
  });

  it('maps POST method correctly', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({ method: 'POST', url: 'https://api.example.com/post' }),
    ]);
    expect(rule.method).toBe('POST');
  });

  it('maps PUT method correctly', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({ method: 'PUT', url: 'https://api.example.com/put' }),
    ]);
    expect(rule.method).toBe('PUT');
  });

  it('maps PATCH method correctly', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({ method: 'PATCH', url: 'https://api.example.com/patch' }),
    ]);
    expect(rule.method).toBe('PATCH');
  });

  it('maps DELETE method correctly', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({ method: 'DELETE', url: 'https://api.example.com/delete' }),
    ]);
    expect(rule.method).toBe('DELETE');
  });

  it('maps HEAD method correctly', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({ method: 'HEAD', url: 'https://api.example.com/head', responseBody: 'x' }),
    ]);
    expect(rule.method).toBe('HEAD');
  });

  it('maps OPTIONS method correctly', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({ method: 'OPTIONS', url: 'https://api.example.com/options', responseBody: 'x' }),
    ]);
    expect(rule.method).toBe('OPTIONS');
  });

  it('defaults unknown method to GET', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({ method: 'FOOBAR' }),
    ]);
    expect(rule.method).toBe('GET');
  });

  it('detects application/json Content-Type as json responseType', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({
        responseHeaders: { 'content-type': 'application/json; charset=utf-8' },
      }),
    ]);
    expect(rule.responseType).toBe('json');
  });

  it('detects text/plain Content-Type as raw responseType', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({
        url: 'https://api.example.com/text',
        responseHeaders: { 'content-type': 'text/plain' },
      }),
    ]);
    expect(rule.responseType).toBe('raw');
  });

  it('defaults to json responseType when Content-Type is missing', () => {
    const [rule] = convertEntriesToRules([
      makeLogEntry({
        url: 'https://api.example.com/no-ct',
        responseHeaders: {},
      }),
    ]);
    expect(rule.responseType).toBe('json');
  });

  it('deduplicates by URL+method keeping the last entry', () => {
    const entries = [
      makeLogEntry({
        id: 'first',
        url: 'https://api.example.com/data',
        method: 'GET',
        responseBody: '{"version":1}',
      }),
      makeLogEntry({
        id: 'second',
        url: 'https://api.example.com/data',
        method: 'GET',
        responseBody: '{"version":2}',
      }),
    ];

    const result = convertEntriesToRules(entries);

    expect(result).toHaveLength(1);
    expect(result[0].responseBody).toBe('{"version":2}');
  });

  it('keeps entries with different methods as separate rules', () => {
    const entries = [
      makeLogEntry({
        id: 'get',
        url: 'https://api.example.com/data',
        method: 'GET',
      }),
      makeLogEntry({
        id: 'post',
        url: 'https://api.example.com/data',
        method: 'POST',
      }),
    ];

    const result = convertEntriesToRules(entries);

    expect(result).toHaveLength(2);
    expect(result[0].method).toBe('GET');
    expect(result[1].method).toBe('POST');
  });

  it('filters out entries with null responseBody', () => {
    const entries = [
      makeLogEntry({ id: '1', responseBody: null, url: 'https://api.example.com/a' }),
      makeLogEntry({ id: '2', responseBody: '{"data":1}', url: 'https://api.example.com/b' }),
    ];

    const result = convertEntriesToRules(entries);

    expect(result).toHaveLength(1);
    expect(result[0].urlPattern).toBe('https://api.example.com/b');
  });

  it('converts multiple entries correctly', () => {
    const entries = [
      makeLogEntry({
        id: '1',
        url: 'https://api.example.com/users',
        method: 'GET',
        statusCode: 200,
        responseBody: '[{"id":1}]',
      }),
      makeLogEntry({
        id: '2',
        url: 'https://api.example.com/users',
        method: 'POST',
        statusCode: 201,
        responseBody: '{"id":2}',
      }),
      makeLogEntry({
        id: '3',
        url: 'https://api.example.com/settings',
        method: 'GET',
        statusCode: 200,
        responseBody: '{"theme":"dark"}',
      }),
    ];

    const result = convertEntriesToRules(entries);

    expect(result).toHaveLength(3);
    expect(result[0].urlPattern).toBe('https://api.example.com/users');
    expect(result[0].method).toBe('GET');
    expect(result[0].statusCode).toBe(200);
    expect(result[1].urlPattern).toBe('https://api.example.com/users');
    expect(result[1].method).toBe('POST');
    expect(result[1].statusCode).toBe(201);
    expect(result[2].urlPattern).toBe('https://api.example.com/settings');
  });

  it('sets responseBody from entry responseBody', () => {
    const body = '{"users":[{"id":1,"name":"Alice"}]}';
    const [rule] = convertEntriesToRules([
      makeLogEntry({ responseBody: body }),
    ]);
    expect(rule.responseBody).toBe(body);
  });
});
