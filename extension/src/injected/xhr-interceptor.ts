import type { MockRule } from '@/features/rules';
import { findMatchingRule } from './rule-matcher';
import { MESSAGE_PREFIX } from '@/shared/constants';

let activeRules: MockRule[] = [];

const OriginalXHR = window.XMLHttpRequest;
const originalOpen = OriginalXHR.prototype.open;
const originalSend = OriginalXHR.prototype.send;
const originalSetRequestHeader = OriginalXHR.prototype.setRequestHeader;

interface XHRMetadata {
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  startTime: number;
}

const xhrMetadataMap = new WeakMap<XMLHttpRequest, XHRMetadata>();

function patchedOpen(
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  async?: boolean,
  username?: string | null,
  password?: string | null,
) {
  xhrMetadataMap.set(this, {
    method: method.toUpperCase(),
    url: typeof url === 'string' ? url : url.href,
    requestHeaders: {},
    startTime: performance.now(),
  });
  return originalOpen.call(this, method, url, async ?? true, username, password);
}

function patchedSetRequestHeader(this: XMLHttpRequest, name: string, value: string) {
  const meta = xhrMetadataMap.get(this);
  if (meta) {
    meta.requestHeaders[name] = value;
  }
  return originalSetRequestHeader.call(this, name, value);
}

function patchedSend(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
  const meta = xhrMetadataMap.get(this);
  if (!meta) {
    return originalSend.call(this, body);
  }

  meta.startTime = performance.now();
  const bodyStr = typeof body === 'string' ? body : null;

  const { matched, rule } = findMatchingRule(activeRules, {
    url: meta.url,
    method: meta.method,
    body: bodyStr,
  });

  if (matched && rule) {
    simulateMockedXHR(this, rule, meta, bodyStr);
    return;
  }

  // Real XHR — intercept response for logging
  const originalOnReadyStateChange = this.onreadystatechange;

  this.onreadystatechange = function (ev) {
    if (this.readyState === 4) {
      const duration = performance.now() - meta.startTime;
      const responseHeaders: Record<string, string> = {};
      const headerStr = this.getAllResponseHeaders();
      headerStr.split('\r\n').forEach((line) => {
        const idx = line.indexOf(': ');
        if (idx > 0) responseHeaders[line.substring(0, idx)] = line.substring(idx + 2);
      });

      window.postMessage({
        type: `${MESSAGE_PREFIX}_REQUEST_LOG`,
        payload: {
          method: meta.method,
          url: meta.url,
          body: bodyStr,
          statusCode: this.status,
          responseBody: (this.responseText || '').substring(0, 102400),
          responseHeaders,
          duration: Math.round(duration),
          mocked: false,
          matchedRuleId: null,
        },
      }, '*');
    }
    if (originalOnReadyStateChange) {
      originalOnReadyStateChange.call(this, ev);
    }
  };

  return originalSend.call(this, body);
}

function simulateMockedXHR(
  xhr: XMLHttpRequest,
  rule: MockRule,
  meta: XHRMetadata,
  requestBody: string | null,
) {
  const delay = rule.delay || 0;

  const fireEvents = () => {
    // Build response headers string
    const headersStr = Object.entries(rule.responseHeaders)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');

    // Override readonly properties
    Object.defineProperties(xhr, {
      status: { value: rule.statusCode, writable: false },
      statusText: { value: '', writable: false },
      responseText: { value: rule.responseBody, writable: false },
      response: { value: rule.responseBody, writable: false },
      readyState: { value: 4, writable: true },
    });

    // Override getResponseHeader / getAllResponseHeaders
    xhr.getResponseHeader = (name: string) => rule.responseHeaders[name] ?? null;
    xhr.getAllResponseHeaders = () => headersStr;

    // Fire readystatechange events
    for (const state of [1, 2, 3, 4]) {
      Object.defineProperty(xhr, 'readyState', { value: state, writable: true });
      xhr.dispatchEvent(new Event('readystatechange'));
      if (xhr.onreadystatechange) {
        xhr.onreadystatechange(new Event('readystatechange') as ProgressEvent);
      }
    }

    xhr.dispatchEvent(new ProgressEvent('load'));
    xhr.dispatchEvent(new ProgressEvent('loadend'));

    // Log
    const duration = performance.now() - meta.startTime;
    window.postMessage({
      type: `${MESSAGE_PREFIX}_REQUEST_LOG`,
      payload: {
        method: meta.method,
        url: meta.url,
        body: requestBody,
        statusCode: rule.statusCode,
        responseBody: rule.responseBody,
        responseHeaders: rule.responseHeaders,
        duration: Math.round(duration),
        mocked: true,
        matchedRuleId: rule.id,
      },
    }, '*');
  };

  if (delay > 0) {
    setTimeout(fireEvents, delay);
  } else {
    // Use microtask to simulate async
    Promise.resolve().then(fireEvents);
  }
}

export function installXHRInterceptor() {
  XMLHttpRequest.prototype.open = patchedOpen as typeof XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.send = patchedSend;
  XMLHttpRequest.prototype.setRequestHeader = patchedSetRequestHeader;
}

export function uninstallXHRInterceptor() {
  XMLHttpRequest.prototype.open = originalOpen;
  XMLHttpRequest.prototype.send = originalSend;
  XMLHttpRequest.prototype.setRequestHeader = originalSetRequestHeader;
}

export function updateXHRRules(rules: MockRule[]) {
  activeRules = rules.filter((r) => r.requestType !== 'websocket');
}
