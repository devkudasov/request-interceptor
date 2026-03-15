import type { LogEntry } from '@/features/logging/types';
import type { MockRule, HttpMethod, ResponseType } from '@/features/rules/types';

type RuleData = Omit<MockRule, 'id' | 'createdAt' | 'updatedAt' | 'priority'>;

const VALID_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function detectResponseType(headers: Record<string, string>): ResponseType {
  const ct = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? '';
  if (ct.includes('application/json')) return 'json';
  if (ct.includes('text/')) return 'raw';
  return 'json';
}

export function convertEntriesToRules(entries: LogEntry[]): RuleData[] {
  const withBody = entries.filter((e) => e.responseBody !== null);

  const deduped = new Map<string, LogEntry>();
  for (const entry of withBody) {
    deduped.set(`${entry.url}::${entry.method}`, entry);
  }

  return Array.from(deduped.values()).map((entry) => ({
    urlPattern: entry.url,
    urlMatchType: 'exact' as const,
    method: VALID_METHODS.includes(entry.method as HttpMethod)
      ? (entry.method as HttpMethod)
      : 'GET',
    requestType: 'http' as const,
    statusCode: entry.statusCode,
    responseType: detectResponseType(entry.responseHeaders),
    responseBody: entry.responseBody!,
    responseHeaders: entry.responseHeaders,
    delay: 0,
    enabled: true,
    collectionId: null,
  }));
}
