import type { MockRule } from '@/features/rules';
import { findMatchingRule } from './rule-matcher';
import { MESSAGE_PREFIX } from '@/shared/constants';

let activeRules: MockRule[] = [];
const originalFetch = window.fetch;

function createMockResponse(rule: MockRule): Response {
  const headers = new Headers(rule.responseHeaders);
  return new Response(rule.responseBody, {
    status: rule.statusCode,
    statusText: getStatusText(rule.statusCode),
    headers,
  });
}

function getStatusText(code: number): string {
  const map: Record<number, string> = {
    200: 'OK', 201: 'Created', 204: 'No Content',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict',
    422: 'Unprocessable Entity', 429: 'Too Many Requests',
    500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable',
  };
  return map[code] ?? '';
}

async function extractBody(input: RequestInfo | URL, init?: RequestInit): Promise<string | null> {
  if (init?.body) {
    if (typeof init.body === 'string') return init.body;
    if (init.body instanceof ArrayBuffer) return new TextDecoder().decode(init.body);
    if (init.body instanceof Blob) return await init.body.text();
    return null;
  }
  if (input instanceof Request) {
    try {
      const cloned = input.clone();
      return await cloned.text();
    } catch {
      return null;
    }
  }
  return null;
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;
  return String(input);
}

function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

const interceptedFetch: typeof fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = extractUrl(input);
  const method = extractMethod(input, init);
  const body = await extractBody(input, init);
  const startTime = performance.now();

  const { matched, rule } = findMatchingRule(activeRules, { url, method, body });

  if (matched && rule) {
    if (rule.delay > 0) {
      await new Promise((r) => setTimeout(r, rule.delay));
    }

    const response = createMockResponse(rule);
    const duration = performance.now() - startTime;

    // Report to content script
    window.postMessage({
      type: `${MESSAGE_PREFIX}_REQUEST_LOG`,
      payload: {
        method, url, body,
        statusCode: rule.statusCode,
        responseBody: rule.responseBody,
        responseHeaders: rule.responseHeaders,
        duration: Math.round(duration),
        mocked: true,
        matchedRuleId: rule.id,
      },
    }, '*');

    return response;
  }

  // Pass through to real fetch
  const response = await originalFetch(input, init);
  const duration = performance.now() - startTime;

  // Log real request (clone to read body without consuming)
  try {
    const cloned = response.clone();
    const responseBody = await cloned.text();
    const responseHeaders: Record<string, string> = {};
    cloned.headers.forEach((v, k) => { responseHeaders[k] = v; });

    window.postMessage({
      type: `${MESSAGE_PREFIX}_REQUEST_LOG`,
      payload: {
        method, url, body,
        statusCode: response.status,
        responseBody: responseBody.substring(0, 102400), // Limit to 100KB for logging
        responseHeaders,
        duration: Math.round(duration),
        mocked: false,
        matchedRuleId: null,
      },
    }, '*');
  } catch {
    // Ignore logging errors
  }

  return response;
};

export function installFetchInterceptor() {
  window.fetch = interceptedFetch;
}

export function uninstallFetchInterceptor() {
  window.fetch = originalFetch;
}

export function updateFetchRules(rules: MockRule[]) {
  activeRules = rules.filter((r) => r.requestType !== 'websocket');
}
