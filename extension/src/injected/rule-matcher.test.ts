import { describe, it, expect } from 'vitest';
import { findMatchingRule, extractGraphQLOperation, isGraphQLRequest } from './rule-matcher';
import type { MockRule } from '@/shared/types';

function makeRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'rule-1',
    enabled: true,
    priority: 0,
    collectionId: null,
    urlPattern: '**/api/users',
    urlMatchType: 'wildcard',
    method: 'GET',
    requestType: 'http',
    statusCode: 200,
    responseType: 'json',
    responseBody: '{"users":[]}',
    responseHeaders: { 'Content-Type': 'application/json' },
    delay: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('findMatchingRule', () => {
  it('matches by URL and method', () => {
    const rules = [makeRule()];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/api/users',
      method: 'GET',
    });
    expect(result.matched).toBe(true);
    expect(result.rule?.id).toBe('rule-1');
  });

  it('rejects wrong method', () => {
    const rules = [makeRule({ method: 'POST' })];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/api/users',
      method: 'GET',
    });
    expect(result.matched).toBe(false);
  });

  it('matches ANY method', () => {
    const rules = [makeRule({ method: 'ANY' })];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/api/users',
      method: 'DELETE',
    });
    expect(result.matched).toBe(true);
  });

  it('skips disabled rules', () => {
    const rules = [makeRule({ enabled: false })];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/api/users',
      method: 'GET',
    });
    expect(result.matched).toBe(false);
  });

  it('returns first matching rule (priority order)', () => {
    const rules = [
      makeRule({ id: 'rule-1', priority: 0, statusCode: 200 }),
      makeRule({ id: 'rule-2', priority: 1, statusCode: 404 }),
    ];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/api/users',
      method: 'GET',
    });
    expect(result.rule?.id).toBe('rule-1');
  });

  it('matches with body pattern', () => {
    const rules = [makeRule({ method: 'POST', bodyMatch: '{"email":"*"}' })];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/api/users',
      method: 'POST',
      body: '{"email":"test@test.com","name":"John"}',
    });
    expect(result.matched).toBe(true);
  });

  it('matches GraphQL by operation name', () => {
    const rules = [
      makeRule({
        method: 'POST',
        urlPattern: '**/graphql',
        graphqlOperation: 'GetUsers',
      }),
    ];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/graphql',
      method: 'POST',
      body: JSON.stringify({ query: 'query GetUsers { users { id } }', operationName: 'GetUsers' }),
    });
    expect(result.matched).toBe(true);
  });

  it('rejects wrong GraphQL operation', () => {
    const rules = [
      makeRule({
        method: 'POST',
        urlPattern: '**/graphql',
        graphqlOperation: 'GetUsers',
      }),
    ];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/graphql',
      method: 'POST',
      body: JSON.stringify({ query: 'query GetPosts { posts { id } }', operationName: 'GetPosts' }),
    });
    expect(result.matched).toBe(false);
  });

  it('skips websocket rules', () => {
    const rules = [makeRule({ requestType: 'websocket' })];
    const result = findMatchingRule(rules, {
      url: 'https://api.example.com/api/users',
      method: 'GET',
    });
    expect(result.matched).toBe(false);
  });
});

describe('extractGraphQLOperation', () => {
  it('extracts from operationName field', () => {
    expect(extractGraphQLOperation(JSON.stringify({ operationName: 'GetUsers', query: '...' }))).toBe('GetUsers');
  });

  it('extracts from query string', () => {
    expect(extractGraphQLOperation(JSON.stringify({ query: 'mutation CreateUser { ... }' }))).toBe('CreateUser');
  });

  it('handles batched queries', () => {
    expect(extractGraphQLOperation(JSON.stringify([{ operationName: 'First', query: '...' }]))).toBe('First');
  });

  it('returns null for non-GraphQL', () => {
    expect(extractGraphQLOperation('plain text')).toBe(null);
    expect(extractGraphQLOperation(null)).toBe(null);
  });
});

describe('isGraphQLRequest', () => {
  it('detects GraphQL request', () => {
    expect(isGraphQLRequest('/graphql', JSON.stringify({ query: 'query { users { id } }' }))).toBe(true);
  });

  it('rejects non-GraphQL', () => {
    expect(isGraphQLRequest('/api/users', JSON.stringify({ email: 'test' }))).toBe(false);
    expect(isGraphQLRequest('/api', null)).toBe(false);
  });
});
