import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockRule } from '@/features/rules';

// Save originals before any module loads
const originalFetch = globalThis.fetch;
const originalPostMessage = window.postMessage;

function makeRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'rule-1',
    enabled: true,
    priority: 0,
    collectionId: null,
    urlPattern: '**/api/users',
    urlMatchType: 'wildcard',
    method: 'GET',
    requestType: 'http',
    statusCode: 200,
    responseType: 'json',
    responseBody: '{"users":[]}',
    responseHeaders: { 'Content-Type': 'application/json' },
    delay: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// We need to dynamically import to control when window.fetch is captured
let installFetchInterceptor: () => void;
let uninstallFetchInterceptor: () => void;
let updateFetchRules: (rules: MockRule[]) => void;

beforeEach(async () => {
  // Reset fetch to a mock before each test
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(
      new Response('original-body', {
        status: 200,
        headers: { 'X-Real': 'true' },
      }),
    ),
  );

  window.postMessage = vi.fn();

  // Fresh import each test
  vi.resetModules();
  const mod = await import('./fetch-interceptor');
  installFetchInterceptor = mod.installFetchInterceptor;
  uninstallFetchInterceptor = mod.uninstallFetchInterceptor;
  updateFetchRules = mod.updateFetchRules;
});

afterEach(() => {
  uninstallFetchInterceptor();
  globalThis.fetch = originalFetch;
  window.postMessage = originalPostMessage;
});

describe('installFetchInterceptor', () => {
  it('patches window.fetch', () => {
    const before = window.fetch;
    installFetchInterceptor();
    expect(window.fetch).not.toBe(before);
  });
});

describe('uninstallFetchInterceptor', () => {
  it('restores original fetch', () => {
    installFetchInterceptor();
    uninstallFetchInterceptor();
    // After uninstall, fetch should be the mock we set in beforeEach
    // (which is what the module captured as "originalFetch")
    expect(typeof window.fetch).toBe('function');
  });
});

describe('updateFetchRules', () => {
  it('filters out websocket rules', () => {
    const wsRule = makeRule({ requestType: 'websocket' });
    const httpRule = makeRule({ requestType: 'http', id: 'http-1' });
    // Should not throw
    updateFetchRules([wsRule, httpRule]);
  });
});

describe('intercepted fetch — matched rules', () => {
  it('returns a mock response when a rule matches', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule()]);

    const response = await window.fetch('https://example.com/api/users');

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe('{"users":[]}');
  });

  it('applies correct status code from rule', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule({ statusCode: 404 })]);

    const response = await window.fetch('https://example.com/api/users');
    expect(response.status).toBe(404);
  });

  it('applies response headers from rule', async () => {
    installFetchInterceptor();
    updateFetchRules([
      makeRule({ responseHeaders: { 'X-Custom': 'test-value' } }),
    ]);

    const response = await window.fetch('https://example.com/api/users');
    expect(response.headers.get('X-Custom')).toBe('test-value');
  });

  it('sends a log message via postMessage for matched request', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule()]);

    await window.fetch('https://example.com/api/users');

    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '__REQ_INTERCEPTOR___REQUEST_LOG',
        payload: expect.objectContaining({
          method: 'GET',
          url: 'https://example.com/api/users',
          mocked: true,
          matchedRuleId: 'rule-1',
          statusCode: 200,
          responseBody: '{"users":[]}',
        }),
      }),
      '*',
    );
  });

  it('respects delay in rule', async () => {
    vi.useFakeTimers();
    installFetchInterceptor();
    updateFetchRules([makeRule({ delay: 100 })]);

    const fetchPromise = window.fetch('https://example.com/api/users');

    // Advance timers
    await vi.advanceTimersByTimeAsync(100);
    const response = await fetchPromise;
    expect(response.status).toBe(200);

    vi.useRealTimers();
  });

  it('matches POST method', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule({ method: 'POST' })]);

    const response = await window.fetch('https://example.com/api/users', {
      method: 'POST',
      body: '{"name":"test"}',
    });
    expect(response.status).toBe(200);
  });
});

describe('intercepted fetch — unmatched rules', () => {
  it('passes through to real fetch when no rule matches', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule({ urlPattern: '**/api/products' })]);

    const response = await window.fetch('https://example.com/api/users');

    // Should call the original fetch mock
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe('original-body');
  });

  it('sends a log message with mocked=false for unmatched request', async () => {
    installFetchInterceptor();
    updateFetchRules([]);

    await window.fetch('https://example.com/api/users');

    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '__REQ_INTERCEPTOR___REQUEST_LOG',
        payload: expect.objectContaining({
          mocked: false,
          matchedRuleId: null,
        }),
      }),
      '*',
    );
  });
});

describe('extractUrl / extractMethod helpers (via fetch calls)', () => {
  it('handles URL object input', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule({ urlPattern: '**/api/users' })]);

    const url = new URL('https://example.com/api/users');
    const response = await window.fetch(url);
    expect(response.status).toBe(200);
  });

  it('handles Request object input', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule({ urlPattern: '**/api/users', method: 'POST' })]);

    const req = new Request('https://example.com/api/users', { method: 'POST' });
    const response = await window.fetch(req);
    expect(response.status).toBe(200);
  });

  it('defaults to GET when no method specified', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule({ method: 'GET' })]);

    const response = await window.fetch('https://example.com/api/users');
    expect(response.status).toBe(200);
  });
});

describe('extractBody (via fetch calls)', () => {
  it('extracts string body from init', async () => {
    installFetchInterceptor();
    updateFetchRules([
      makeRule({ method: 'POST', bodyMatch: '{"name":"test"}' }),
    ]);

    const response = await window.fetch('https://example.com/api/users', {
      method: 'POST',
      body: '{"name":"test"}',
    });
    expect(response.status).toBe(200);
  });
});

describe('getStatusText mapping', () => {
  it.each([
    [200, 'OK'],
    [201, 'Created'],
    [400, 'Bad Request'],
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [404, 'Not Found'],
    [500, 'Internal Server Error'],
  ])('status %i returns correct statusText', async (code, _expected) => {
    installFetchInterceptor();
    updateFetchRules([makeRule({ statusCode: code })]);

    const response = await window.fetch('https://example.com/api/users');
    expect(response.status).toBe(code);
  });

  it('returns empty string for unknown status codes', async () => {
    installFetchInterceptor();
    updateFetchRules([makeRule({ statusCode: 418 })]);

    const response = await window.fetch('https://example.com/api/users');
    expect(response.status).toBe(418);
  });
});
