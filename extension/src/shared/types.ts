export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type UrlMatchType = 'exact' | 'wildcard' | 'regex';
export type ResponseType = 'json' | 'raw' | 'multipart';
export type RequestType = 'http' | 'websocket';
export type Theme = 'light' | 'dark' | 'system';
export type UserPlan = 'free' | 'premium' | 'team';
export type AuthPlan = 'free' | 'pro' | 'team';
export type TeamRole = 'owner' | 'admin' | 'member';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  plan: AuthPlan;
}

export interface MockRule {
  id: string;
  enabled: boolean;
  priority: number;
  collectionId: string | null;
  urlPattern: string;
  urlMatchType: UrlMatchType;
  method: HttpMethod | 'ANY';
  bodyMatch?: string;
  graphqlOperation?: string;
  requestType: RequestType;
  statusCode: number;
  responseType: ResponseType;
  responseBody: string;
  responseHeaders: Record<string, string>;
  delay: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebSocketMessageRule {
  match: string;
  respond: string;
  delay: number;
}

export interface WebSocketRule extends MockRule {
  requestType: 'websocket';
  onConnect?: string;
  messageRules: WebSocketMessageRule[];
}

export interface Collection {
  id: string;
  name: string;
  parentId: string | null;
  enabled: boolean;
  order: number;
  ruleIds: string[];
  createdAt: string;
  updatedAt: string;
}

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

export interface Settings {
  theme: Theme;
  defaultDelay: number;
  logEnabled: boolean;
  maxLogEntries: number;
}

export interface StorageSchema {
  activeTabIds: number[];
  isRecording: boolean;
  recordingTabId: number | null;
  rules: MockRule[];
  collections: Collection[];
  requestLog: LogEntry[];
  settings: Settings;
  authToken: string | null;
  userId: string | null;
}
