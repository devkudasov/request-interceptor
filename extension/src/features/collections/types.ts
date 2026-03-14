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
