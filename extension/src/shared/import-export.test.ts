import { describe, it, expect } from 'vitest';
import { exportCollections, parseImportFile, resolveConflicts } from './import-export';
import type { MockRule, Collection } from './types';

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'Test Collection',
    parentId: null,
    enabled: true,
    order: 0,
    ruleIds: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'rule-1',
    enabled: true,
    priority: 0,
    collectionId: 'col-1',
    urlPattern: '**/api/test',
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

describe('exportCollections', () => {
  it('exports all collections with their rules', () => {
    const cols = [makeCollection()];
    const rules = [makeRule()];
    const result = exportCollections(cols, rules);

    expect(result.version).toBe(1);
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].rules).toHaveLength(1);
  });

  it('exports only selected collections', () => {
    const cols = [makeCollection({ id: 'a' }), makeCollection({ id: 'b', name: 'B' })];
    const rules = [makeRule({ collectionId: 'a' }), makeRule({ id: 'r2', collectionId: 'b' })];
    const result = exportCollections(cols, rules, ['a']);

    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].id).toBe('a');
  });
});

describe('parseImportFile', () => {
  it('parses valid export file', () => {
    const data = exportCollections([makeCollection()], [makeRule()]);
    const result = parseImportFile(JSON.stringify(data), []);

    expect(result.collections).toHaveLength(1);
    expect(result.rules).toHaveLength(1);
    expect(result.conflicts).toHaveLength(0);
  });

  it('detects conflicts by name', () => {
    const data = exportCollections([makeCollection()], [makeRule()]);
    const existing = [makeCollection({ id: 'existing-id' })];
    const result = parseImportFile(JSON.stringify(data), existing);

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].existingId).toBe('existing-id');
  });

  it('throws on invalid format', () => {
    expect(() => parseImportFile('{}', [])).toThrow('Invalid import file format');
  });
});

describe('resolveConflicts', () => {
  it('skip leaves existing data unchanged', () => {
    const existing = [makeCollection({ id: 'existing' })];
    const existingRules = [makeRule({ id: 'er1', collectionId: 'existing' })];
    const importResult = {
      collections: [makeCollection({ id: 'imported' })],
      rules: [makeRule({ id: 'ir1', collectionId: 'imported' })],
      conflicts: [{ type: 'collection' as const, name: 'Test Collection', existingId: 'existing', importedId: 'imported' }],
    };

    const resolutions = new Map([['imported', 'skip' as const]]);
    const result = resolveConflicts(importResult, resolutions, existing, existingRules);

    expect(result.collections).toHaveLength(1);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].id).toBe('er1');
  });

  it('merge adds imported rules to existing collection', () => {
    const existing = [makeCollection({ id: 'existing' })];
    const existingRules = [makeRule({ id: 'er1', collectionId: 'existing' })];
    const importResult = {
      collections: [makeCollection({ id: 'imported' })],
      rules: [makeRule({ id: 'ir1', collectionId: 'imported' })],
      conflicts: [{ type: 'collection' as const, name: 'Test Collection', existingId: 'existing', importedId: 'imported' }],
    };

    const resolutions = new Map([['imported', 'merge' as const]]);
    const result = resolveConflicts(importResult, resolutions, existing, existingRules);

    expect(result.rules).toHaveLength(2);
    expect(result.rules[1].collectionId).toBe('existing');
  });
});
