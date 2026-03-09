export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type UrlMatchType = 'exact' | 'wildcard' | 'regex';
export type ResponseType = 'json' | 'raw' | 'multipart';
export type RequestType = 'http' | 'websocket';
export type Theme = 'light' | 'dark' | 'system';
export type UserPlan = 'free' | 'premium' | 'team';
export type AuthPlan = 'free' | 'pro' | 'team';
export type TeamRole = 'owner' | 'admin' | 'member';

export interface PlanLimits {
  maxRules: number;
  maxCollections: number;
  maxTeamMembers: number;
  cloudSync: boolean;
  versionHistory: boolean;
  importExport: boolean;
  storageBytes: number;
}

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  plan: AuthPlan;
  subscriptionStatus?: SubscriptionStatus | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
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

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface CloudCollection {
  id: string;
  name: string;
  parentId: string | null;
  enabled: boolean;
  order: number;
  rules: MockRule[];
  version: number;
  updatedBy: string;
  updatedAt: string;
  lastPushedBy: string;
}

export interface VersionSnapshot {
  id: string;
  version: number;
  rules: MockRule[];
  rulesSnapshot: Array<{
    id: string;
    urlPattern: string;
    method: string;
    statusCode: number;
  }>;
  author: { uid: string; displayName: string };
  createdBy: string;
  createdByEmail: string | null;
  createdAt: string;
  message: string;
  collectionSnapshot?: {
    name: string;
    ruleIds: string[];
  };
}

export type ConflictStrategy = 'merge' | 'replace-local' | 'replace-cloud';

export interface SyncConflict {
  collectionId: string;
  collectionName: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  localVersion: number;
  cloudVersion: number;
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
