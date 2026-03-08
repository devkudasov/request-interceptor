import { v4 as uuid } from 'uuid';
import type { LogEntry } from '@/shared/types';
import { getStorage, setStorage } from './storage';

const MAX_LOG_ENTRIES = 1000;

export async function addLogEntry(
  data: Omit<LogEntry, 'id' | 'timestamp'> & { tabId?: number },
): Promise<LogEntry> {
  const entry: LogEntry = {
    id: uuid(),
    timestamp: new Date().toISOString(),
    tabId: data.tabId ?? 0,
    method: data.method,
    url: data.url,
    requestHeaders: data.requestHeaders ?? {},
    requestBody: data.requestBody ?? null,
    statusCode: data.statusCode,
    responseHeaders: data.responseHeaders ?? {},
    responseBody: data.responseBody
      ? data.responseBody.substring(0, 102400) // 100KB limit
      : null,
    responseSize: data.responseSize ?? 0,
    duration: data.duration,
    mocked: data.mocked,
    matchedRuleId: data.matchedRuleId ?? null,
  };

  const log = await getStorage('REQUEST_LOG');
  const updated = [entry, ...log].slice(0, MAX_LOG_ENTRIES);
  await setStorage('REQUEST_LOG', updated);

  return entry;
}

export async function clearLog(): Promise<void> {
  await setStorage('REQUEST_LOG', []);
}
