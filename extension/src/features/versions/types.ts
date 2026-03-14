import type { MockRule } from '@/features/rules/types';

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
