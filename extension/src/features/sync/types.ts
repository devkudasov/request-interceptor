export type ConflictStrategy = 'merge' | 'replace-local' | 'replace-cloud';

export interface SyncConflict {
  collectionId: string;
  collectionName: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  localVersion: number;
  cloudVersion: number;
}

export interface CloudCollection {
  id: string;
  name: string;
  parentId: string | null;
  enabled: boolean;
  order: number;
  rules: import('@/features/rules/types').MockRule[];
  version: number;
  updatedBy: string;
  updatedAt: string;
  lastPushedBy: string;
}
