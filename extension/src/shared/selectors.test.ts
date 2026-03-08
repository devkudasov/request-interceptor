import { describe, it, expect } from 'vitest';
import type { MockRule, Collection } from './types';
import {
  getRuleTypeTab,
  filterRulesByType,
  countRulesByType,
  groupRulesByCollection,
  buildCollectionTree,
  getChildCollections,
} from './selectors';

function makeRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'r1',
    enabled: true,
    priority: 0,
    collectionId: null,
    urlPattern: '/api/test',
    urlMatchType: 'wildcard',
    method: 'GET',
    requestType: 'http',
    statusCode: 200,
    responseType: 'json',
    responseBody: '{}',
    responseHeaders: {},
    delay: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'c1',
    name: 'Collection 1',
    parentId: null,
    enabled: true,
    order: 0,
    ruleIds: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getRuleTypeTab', () => {
  it('returns http for standard HTTP rule', () => {
    expect(getRuleTypeTab(makeRule())).toBe('http');
  });

  it('returns websocket for websocket rule', () => {
    expect(getRuleTypeTab(makeRule({ requestType: 'websocket' }))).toBe('websocket');
  });

  it('returns graphql for HTTP rule with graphqlOperation', () => {
    expect(getRuleTypeTab(makeRule({ graphqlOperation: 'GetUsers' }))).toBe('graphql');
  });

  it('returns http for HTTP rule without graphqlOperation', () => {
    expect(getRuleTypeTab(makeRule({ graphqlOperation: undefined }))).toBe('http');
  });

  it('returns http for HTTP rule with empty graphqlOperation', () => {
    expect(getRuleTypeTab(makeRule({ graphqlOperation: '' }))).toBe('http');
  });
});

describe('filterRulesByType', () => {
  const httpRule = makeRule({ id: 'r1' });
  const wsRule = makeRule({ id: 'r2', requestType: 'websocket' });
  const gqlRule = makeRule({ id: 'r3', graphqlOperation: 'GetUsers' });
  const rules = [httpRule, wsRule, gqlRule];

  it('filters HTTP rules', () => {
    const result = filterRulesByType(rules, 'http');
    expect(result).toEqual([httpRule]);
  });

  it('filters WebSocket rules', () => {
    const result = filterRulesByType(rules, 'websocket');
    expect(result).toEqual([wsRule]);
  });

  it('filters GraphQL rules', () => {
    const result = filterRulesByType(rules, 'graphql');
    expect(result).toEqual([gqlRule]);
  });

  it('returns empty array when no rules match', () => {
    expect(filterRulesByType([httpRule], 'websocket')).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(filterRulesByType([], 'http')).toEqual([]);
  });
});

describe('countRulesByType', () => {
  it('counts rules by type', () => {
    const rules = [
      makeRule({ id: 'r1' }),
      makeRule({ id: 'r2', requestType: 'websocket' }),
      makeRule({ id: 'r3', graphqlOperation: 'GetUsers' }),
      makeRule({ id: 'r4' }),
    ];

    expect(countRulesByType(rules)).toEqual({
      http: 2,
      websocket: 1,
      graphql: 1,
    });
  });

  it('returns all zeros for empty array', () => {
    expect(countRulesByType([])).toEqual({
      http: 0,
      websocket: 0,
      graphql: 0,
    });
  });
});

describe('groupRulesByCollection', () => {
  it('groups rules by collectionId', () => {
    const rules = [
      makeRule({ id: 'r1', collectionId: 'c1' }),
      makeRule({ id: 'r2', collectionId: 'c1' }),
      makeRule({ id: 'r3', collectionId: 'c2' }),
      makeRule({ id: 'r4', collectionId: null }),
    ];

    const grouped = groupRulesByCollection(rules);
    expect(grouped.get('c1')).toHaveLength(2);
    expect(grouped.get('c2')).toHaveLength(1);
    expect(grouped.get(null)).toHaveLength(1);
  });

  it('returns empty map for empty array', () => {
    expect(groupRulesByCollection([])).toEqual(new Map());
  });

  it('handles all rules ungrouped', () => {
    const rules = [
      makeRule({ id: 'r1', collectionId: null }),
      makeRule({ id: 'r2', collectionId: null }),
    ];

    const grouped = groupRulesByCollection(rules);
    expect(grouped.get(null)).toHaveLength(2);
    expect(grouped.size).toBe(1);
  });
});

describe('buildCollectionTree', () => {
  it('returns only root collections (parentId is null)', () => {
    const collections = [
      makeCollection({ id: 'c1', parentId: null }),
      makeCollection({ id: 'c2', parentId: 'c1' }),
      makeCollection({ id: 'c3', parentId: null }),
    ];

    const roots = buildCollectionTree(collections);
    expect(roots).toHaveLength(2);
    expect(roots.map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('returns empty array when no collections', () => {
    expect(buildCollectionTree([])).toEqual([]);
  });

  it('returns empty array when all collections have parents', () => {
    const collections = [
      makeCollection({ id: 'c1', parentId: 'c0' }),
      makeCollection({ id: 'c2', parentId: 'c0' }),
    ];

    expect(buildCollectionTree(collections)).toEqual([]);
  });

  it('sorts root collections by order', () => {
    const collections = [
      makeCollection({ id: 'c1', parentId: null, order: 2 }),
      makeCollection({ id: 'c2', parentId: null, order: 0 }),
      makeCollection({ id: 'c3', parentId: null, order: 1 }),
    ];

    const roots = buildCollectionTree(collections);
    expect(roots.map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
  });
});

describe('getChildCollections', () => {
  it('returns children of a given parent', () => {
    const collections = [
      makeCollection({ id: 'c1', parentId: null }),
      makeCollection({ id: 'c2', parentId: 'c1' }),
      makeCollection({ id: 'c3', parentId: 'c1' }),
      makeCollection({ id: 'c4', parentId: 'c2' }),
    ];

    const children = getChildCollections(collections, 'c1');
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.id)).toEqual(['c2', 'c3']);
  });

  it('returns empty array when no children', () => {
    const collections = [makeCollection({ id: 'c1', parentId: null })];
    expect(getChildCollections(collections, 'c1')).toEqual([]);
  });

  it('sorts children by order', () => {
    const collections = [
      makeCollection({ id: 'c2', parentId: 'c1', order: 1 }),
      makeCollection({ id: 'c3', parentId: 'c1', order: 0 }),
    ];

    const children = getChildCollections(collections, 'c1');
    expect(children.map((c) => c.id)).toEqual(['c3', 'c2']);
  });
});
