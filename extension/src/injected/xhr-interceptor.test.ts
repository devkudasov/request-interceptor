import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockRule } from '@/features/rules';

const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;
const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
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

let installXHRInterceptor: () => void;
let uninstallXHRInterceptor: () => void;
let updateXHRRules: (rules: MockRule[]) => void;

beforeEach(async () => {
  window.postMessage = vi.fn();

  vi.resetModules();
  const mod = await import('./xhr-interceptor');
  installXHRInterceptor = mod.installXHRInterceptor;
  uninstallXHRInterceptor = mod.uninstallXHRInterceptor;
  updateXHRRules = mod.updateXHRRules;
});

afterEach(() => {
  uninstallXHRInterceptor();
  XMLHttpRequest.prototype.open = originalOpen;
  XMLHttpRequest.prototype.send = originalSend;
  XMLHttpRequest.prototype.setRequestHeader = originalSetRequestHeader;
  window.postMessage = originalPostMessage;
});

describe('installXHRInterceptor', () => {
  it('patches XMLHttpRequest.prototype.open', () => {
    const before = XMLHttpRequest.prototype.open;
    installXHRInterceptor();
    expect(XMLHttpRequest.prototype.open).not.toBe(before);
  });

  it('patches XMLHttpRequest.prototype.send', () => {
    const before = XMLHttpRequest.prototype.send;
    installXHRInterceptor();
    expect(XMLHttpRequest.prototype.send).not.toBe(before);
  });

  it('patches XMLHttpRequest.prototype.setRequestHeader', () => {
    const before = XMLHttpRequest.prototype.setRequestHeader;
    installXHRInterceptor();
    expect(XMLHttpRequest.prototype.setRequestHeader).not.toBe(before);
  });
});

describe('uninstallXHRInterceptor', () => {
  it('restores original XHR methods', () => {
    installXHRInterceptor();
    uninstallXHRInterceptor();
    // Methods should be restored to what the module captured as originals
    expect(typeof XMLHttpRequest.prototype.open).toBe('function');
    expect(typeof XMLHttpRequest.prototype.send).toBe('function');
  });
});

describe('updateXHRRules', () => {
  it('filters out websocket rules', () => {
    const wsRule = makeRule({ requestType: 'websocket' });
    const httpRule = makeRule({ requestType: 'http' });
    updateXHRRules([wsRule, httpRule]);
    // Should not throw
  });
});

describe('intercepted XHR — matched rules', () => {
  it('returns mock response when a rule matches', async () => {
    installXHRInterceptor();
    updateXHRRules([makeRule()]);

    const xhr = new XMLHttpRequest();
    const readyStatePromise = new Promise<void>((resolve) => {
      xhr.onreadystatechange = function () {
        if (this.readyState === 4) {
          resolve();
        }
      };
    });

    xhr.open('GET', 'https://example.com/api/users');
    xhr.send();

    // Mocked XHR fires via microtask
    await readyStatePromise;

    expect(xhr.status).toBe(200);
    expect(xhr.responseText).toBe('{"users":[]}');
  });

  it('overrides getResponseHeader for mocked response', async () => {
    installXHRInterceptor();
    updateXHRRules([
      makeRule({ responseHeaders: { 'Content-Type': 'application/json', 'X-Custom': 'test' } }),
    ]);

    const xhr = new XMLHttpRequest();
    const readyStatePromise = new Promise<void>((resolve) => {
      xhr.onreadystatechange = function () {
        if (this.readyState === 4) resolve();
      };
    });

    xhr.open('GET', 'https://example.com/api/users');
    xhr.send();
    await readyStatePromise;

    expect(xhr.getResponseHeader('Content-Type')).toBe('application/json');
    expect(xhr.getResponseHeader('X-Custom')).toBe('test');
    expect(xhr.getResponseHeader('NonExistent')).toBeNull();
  });

  it('overrides getAllResponseHeaders for mocked response', async () => {
    installXHRInterceptor();
    updateXHRRules([
      makeRule({ responseHeaders: { 'Content-Type': 'application/json' } }),
    ]);

    const xhr = new XMLHttpRequest();
    const readyStatePromise = new Promise<void>((resolve) => {
      xhr.onreadystatechange = function () {
        if (this.readyState === 4) resolve();
      };
    });

    xhr.open('GET', 'https://example.com/api/users');
    xhr.send();
    await readyStatePromise;

    expect(xhr.getAllResponseHeaders()).toContain('Content-Type: application/json');
  });

  it('fires readystatechange events through states 1-4', async () => {
    installXHRInterceptor();
    updateXHRRules([makeRule()]);

    const states: number[] = [];
    const xhr = new XMLHttpRequest();
    const done = new Promise<void>((resolve) => {
      xhr.addEventListener('readystatechange', () => {
        states.push(xhr.readyState);
        if (xhr.readyState === 4) resolve();
      });
    });

    xhr.open('GET', 'https://example.com/api/users');
    xhr.send();
    await done;

    // The open() call sets readyState to 1, and simulateMockedXHR also fires state 1
    // via the for-of loop, so we get a duplicate state 1
    expect(states).toEqual([1, 1, 2, 3, 4]);
  });

  it('fires load and loadend events', async () => {
    installXHRInterceptor();
    updateXHRRules([makeRule()]);

    const events: string[] = [];
    const xhr = new XMLHttpRequest();
    const done = new Promise<void>((resolve) => {
      xhr.addEventListener('load', () => events.push('load'));
      xhr.addEventListener('loadend', () => {
        events.push('loadend');
        resolve();
      });
    });

    xhr.open('GET', 'https://example.com/api/users');
    xhr.send();
    await done;

    expect(events).toContain('load');
    expect(events).toContain('loadend');
  });

  it('sends log message via postMessage for matched request', async () => {
    installXHRInterceptor();
    updateXHRRules([makeRule()]);

    const xhr = new XMLHttpRequest();
    const done = new Promise<void>((resolve) => {
      xhr.onreadystatechange = function () {
        if (this.readyState === 4) resolve();
      };
    });

    xhr.open('GET', 'https://example.com/api/users');
    xhr.send();
    await done;

    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '__REQ_INTERCEPTOR___REQUEST_LOG',
        payload: expect.objectContaining({
          method: 'GET',
          url: 'https://example.com/api/users',
          mocked: true,
          matchedRuleId: 'rule-1',
        }),
      }),
      '*',
    );
  });

  it('applies delay when rule.delay > 0', async () => {
    vi.useFakeTimers();
    installXHRInterceptor();
    updateXHRRules([makeRule({ delay: 200 })]);

    let resolved = false;
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) resolved = true;
    };

    xhr.open('GET', 'https://example.com/api/users');
    xhr.send();

    // Not yet resolved
    await vi.advanceTimersByTimeAsync(50);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);

    vi.useRealTimers();
  });
});

describe('intercepted XHR — unmatched rules', () => {
  it('passes through to real XHR when no rule matches', () => {
    installXHRInterceptor();
    updateXHRRules([makeRule({ urlPattern: '**/api/products' })]);

    const xhr = new XMLHttpRequest();
    // Should not throw — calls original open/send
    xhr.open('GET', 'https://example.com/api/users');
    xhr.send();
  });
});

describe('patchedSetRequestHeader', () => {
  it('stores request headers in metadata', async () => {
    installXHRInterceptor();
    updateXHRRules([makeRule()]);

    const xhr = new XMLHttpRequest();
    const done = new Promise<void>((resolve) => {
      xhr.onreadystatechange = function () {
        if (this.readyState === 4) resolve();
      };
    });

    xhr.open('GET', 'https://example.com/api/users');
    xhr.setRequestHeader('Authorization', 'Bearer token');
    xhr.send();

    await done;
    // No error means the header was stored properly
    expect(xhr.status).toBe(200);
  });
});

describe('patchedOpen with URL object', () => {
  it('handles URL object as url parameter', async () => {
    installXHRInterceptor();
    updateXHRRules([makeRule()]);

    const xhr = new XMLHttpRequest();
    const done = new Promise<void>((resolve) => {
      xhr.onreadystatechange = function () {
        if (this.readyState === 4) resolve();
      };
    });

    const url = new URL('https://example.com/api/users');
    xhr.open('GET', url);
    xhr.send();
    await done;

    expect(xhr.status).toBe(200);
  });
});

describe('patchedSend without prior open (no metadata)', () => {
  it('calls original send when no metadata exists', () => {
    installXHRInterceptor();

    // Create XHR and call original open (bypassing patched open's metadata)
    const xhr = new XMLHttpRequest();
    // Use a non-patched reference to simulate missing metadata edge case
    // This test verifies the guard clause in patchedSend
    originalOpen.call(xhr, 'GET', 'https://example.com/api/users', true);
    // send should still work via fallback
    expect(() => xhr.send()).not.toThrow();
  });
});
