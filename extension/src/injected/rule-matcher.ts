// This runs in MAIN world — no chrome.* APIs available
// Rules are received via window.postMessage from content script

import type { MockRule } from '@/features/rules';
import { matchUrl, matchBody } from '@/shared/url-matcher';

export interface MatchResult {
  matched: boolean;
  rule: MockRule | null;
}

export function findMatchingRule(
  rules: MockRule[],
  request: {
    url: string;
    method: string;
    body?: string | null;
    graphqlOperation?: string | null;
  },
): MatchResult {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.requestType === 'websocket') continue;

    // Method match
    if (rule.method !== 'ANY' && rule.method !== request.method.toUpperCase()) continue;

    // URL match
    if (!matchUrl(request.url, rule.urlPattern, rule.urlMatchType)) continue;

    // Body match
    if (rule.bodyMatch && !matchBody(request.body, rule.bodyMatch)) continue;

    // GraphQL operation match
    if (rule.graphqlOperation) {
      const operation = extractGraphQLOperation(request.body);
      if (operation !== rule.graphqlOperation) continue;
    }

    return { matched: true, rule };
  }

  return { matched: false, rule: null };
}

export function extractGraphQLOperation(body: string | null | undefined): string | null {
  if (!body) return null;

  try {
    const parsed = JSON.parse(body);

    // Handle batched queries (array)
    const payload = Array.isArray(parsed) ? parsed[0] : parsed;

    // Check operationName field first
    if (payload.operationName) return payload.operationName;

    // Extract from query string
    if (payload.query) {
      const match = payload.query.match(/(?:query|mutation|subscription)\s+(\w+)/);
      if (match) return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

export function isGraphQLRequest(_url: string, body: string | null | undefined): boolean {
  if (!body) return false;

  try {
    const parsed = JSON.parse(body);
    const payload = Array.isArray(parsed) ? parsed[0] : parsed;
    return typeof payload.query === 'string' && payload.query.trim().length > 0;
  } catch {
    return false;
  }
}
