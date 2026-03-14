export interface LogEntry {
  id: string;
  timestamp: string;
  tabId: number;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  responseSize: number;
  duration: number;
  mocked: boolean;
  matchedRuleId: string | null;
}
