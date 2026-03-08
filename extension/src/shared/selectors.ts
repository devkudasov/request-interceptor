import type { MockRule, Collection } from './types';

export type RuleTypeTab = 'http' | 'websocket' | 'graphql';

/** Categorize a rule into its type tab */
export function getRuleTypeTab(rule: MockRule): RuleTypeTab {
  if (rule.requestType === 'websocket') return 'websocket';
  if (rule.graphqlOperation) return 'graphql';
  return 'http';
}

/** Filter rules by type tab */
export function filterRulesByType(rules: MockRule[], tab: RuleTypeTab): MockRule[] {
  return rules.filter((rule) => getRuleTypeTab(rule) === tab);
}

/** Count rules per type tab */
export function countRulesByType(rules: MockRule[]): Record<RuleTypeTab, number> {
  const counts: Record<RuleTypeTab, number> = { http: 0, websocket: 0, graphql: 0 };
  for (const rule of rules) {
    counts[getRuleTypeTab(rule)]++;
  }
  return counts;
}

/** Group rules by collection ID */
export function groupRulesByCollection(rules: MockRule[]): Map<string | null, MockRule[]> {
  const map = new Map<string | null, MockRule[]>();
  for (const rule of rules) {
    const key = rule.collectionId;
    const group = map.get(key);
    if (group) {
      group.push(rule);
    } else {
      map.set(key, [rule]);
    }
  }
  return map;
}

/** Get root collections (no parentId), sorted by order */
export function buildCollectionTree(collections: Collection[]): Collection[] {
  return collections
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.order - b.order);
}

/** Get child collections for a given parent, sorted by order */
export function getChildCollections(collections: Collection[], parentId: string): Collection[] {
  return collections
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}
