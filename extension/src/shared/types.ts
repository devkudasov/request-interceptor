// Re-exports for backwards compatibility during migration
// New code should import types directly from feature modules

import type { MockRule } from '@/features/rules/types';
import type { Collection } from '@/features/collections/types';
import type { LogEntry } from '@/features/logging/types';

export type { MockRule, HttpMethod, UrlMatchType, ResponseType, RequestType, WebSocketRule, WebSocketMessageRule } from '@/features/rules/types';

export type { Collection } from '@/features/collections/types';

export type { AuthUser, AuthPlan, SubscriptionStatus } from '@/features/auth/types';

export type { LogEntry } from '@/features/logging/types';

export type { Team, TeamMember, TeamInvite, TeamRole } from '@/features/teams/types';

export type { ConflictStrategy, SyncConflict, CloudCollection } from '@/features/sync/types';

export type { VersionSnapshot } from '@/features/versions/types';

// Infrastructure types (kept here as the canonical source)
export type Theme = 'light' | 'dark' | 'system';
export type UserPlan = 'free' | 'premium' | 'team';

export interface PlanLimits {
  maxRules: number;
  maxCollections: number;
  maxTeamMembers: number;
  cloudSync: boolean;
  versionHistory: boolean;
  importExport: boolean;
  storageBytes: number;
}

export interface Settings {
  theme: Theme;
  defaultDelay: number;
  logEnabled: boolean;
  maxLogEntries: number;
}

export interface StorageSchema {
  activeTabId: number | null;
  rules: MockRule[];
  collections: Collection[];
  requestLog: LogEntry[];
  settings: Settings;
  authToken: string | null;
  userId: string | null;
}
