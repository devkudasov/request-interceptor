import { describe, it, expect } from 'vitest';
import type { MockRule } from './types';

describe('types', () => {
  it('should allow creating a valid MockRule object', () => {
    const rule: MockRule = {
      id: 'test-id',
      enabled: true,
      priority: 0,
      collectionId: null,
      urlPattern: '**/api/users',
      urlMatchType: 'wildcard',
      method: 'GET',
      requestType: 'http',
      statusCode: 200,
      responseType: 'json',
      responseBody: '{"users": []}',
      responseHeaders: { 'Content-Type': 'application/json' },
      delay: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(rule.id).toBe('test-id');
    expect(rule.enabled).toBe(true);
    expect(rule.method).toBe('GET');
  });
});
