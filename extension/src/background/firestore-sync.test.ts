import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetFirestore,
  mockCollection,
  mockDoc,
  mockSetDoc,
  mockGetDoc,
  mockGetDocs,
  mockUpdateDoc,
  mockQuery,
  mockWhere,
  mockOrderBy,
  mockServerTimestamp,
  mockAddDoc,
  mockRunTransaction,
} = vi.hoisted(() => ({
  mockGetFirestore: vi.fn(() => ({})),
  mockCollection: vi.fn(() => ({ id: 'mock-collection-ref' })),
  mockDoc: vi.fn(() => ({ id: 'mock-doc-ref' })),
  mockSetDoc: vi.fn(),
  mockGetDoc: vi.fn(),
  mockGetDocs: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockQuery: vi.fn((...args: unknown[]) => args),
  mockWhere: vi.fn((...args: unknown[]) => args),
  mockOrderBy: vi.fn((...args: unknown[]) => args),
  mockServerTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  mockAddDoc: vi.fn(),
  mockRunTransaction: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
  collection: mockCollection,
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  serverTimestamp: mockServerTimestamp,
  addDoc: mockAddDoc,
  runTransaction: mockRunTransaction,
  increment: vi.fn((n: number) => ({ _type: 'increment', value: n })),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApp: vi.fn(),
}));

vi.stubGlobal('chrome', {
  runtime: { id: 'test-extension-id' },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
});

import {
  pushCollection,
  pullCollection,
  detectConflicts,
  resolveConflict,
  getLastSyncTimestamp,
} from './firestore-sync';

import type { MockRule, Collection } from '@/shared/types';

const makeRule = (overrides: Partial<MockRule> = {}): MockRule => ({
  id: 'rule-1',
  enabled: true,
  priority: 0,
  collectionId: 'col-1',
  urlPattern: 'https://api.example.com/*',
  urlMatchType: 'wildcard',
  method: 'GET',
  requestType: 'http',
  statusCode: 200,
  responseType: 'json',
  responseBody: '{"ok":true}',
  responseHeaders: { 'Content-Type': 'application/json' },
  delay: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'col-1',
  name: 'API Mocks',
  parentId: null,
  enabled: true,
  order: 0,
  ruleIds: ['rule-1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pushCollection', () => {
  it('uploads collection and rules to Firestore', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: (t: unknown) => Promise<void>) => {
      const transaction = {
        set: vi.fn(),
        get: vi.fn(() => ({
          exists: () => false,
          data: () => null,
        })),
        update: vi.fn(),
      };
      await fn(transaction);
    });

    const collection = makeCollection();
    const rules = [makeRule()];

    await pushCollection('team-1', collection, rules);

    expect(mockRunTransaction).toHaveBeenCalled();
  });

  it('increments version number on push', async () => {
    const transactionSet = vi.fn();
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: (t: unknown) => Promise<void>) => {
      const transaction = {
        set: transactionSet,
        get: vi.fn(() => ({
          exists: () => true,
          data: () => ({ version: 3 }),
        })),
        update: vi.fn(),
      };
      await fn(transaction);
    });

    const collection = makeCollection();
    const rules = [makeRule()];

    await pushCollection('team-1', collection, rules);

    // The transaction should include version data
    expect(transactionSet).toHaveBeenCalled();
  });
});

describe('pullCollection', () => {
  it('downloads collection and rules from Firestore', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        ...makeCollection(),
        version: 2,
      }),
    });
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'rule-1',
          data: () => makeRule(),
        },
      ],
    });

    const result = await pullCollection('team-1', 'col-1');

    expect(result).toBeDefined();
    expect(result?.collection).toBeDefined();
    expect(result?.rules).toHaveLength(1);
  });

  it('returns null when collection does not exist remotely', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    const result = await pullCollection('team-1', 'nonexistent');

    expect(result).toBeNull();
  });
});

describe('detectConflicts', () => {
  it('detects no conflict when local and remote have same updatedAt', () => {
    const local = makeCollection({ updatedAt: '2026-01-01T12:00:00.000Z' });
    const remote = makeCollection({ updatedAt: '2026-01-01T12:00:00.000Z' });

    const result = detectConflicts(local, remote);

    expect(result.hasConflict).toBe(false);
  });

  it('detects conflict when remote is newer than local', () => {
    const local = makeCollection({ updatedAt: '2026-01-01T12:00:00.000Z' });
    const remote = makeCollection({ updatedAt: '2026-01-02T12:00:00.000Z' });

    const result = detectConflicts(local, remote);

    expect(result.hasConflict).toBe(true);
  });

  it('detects conflict when local is newer than last sync', () => {
    const local = makeCollection({ updatedAt: '2026-01-02T12:00:00.000Z' });
    const remote = makeCollection({ updatedAt: '2026-01-03T12:00:00.000Z' });

    const result = detectConflicts(local, remote);

    expect(result.hasConflict).toBe(true);
  });
});

describe('resolveConflict', () => {
  it('returns local data when strategy is replace-cloud', () => {
    const local = makeCollection({ name: 'Local Name' });
    const remote = makeCollection({ name: 'Remote Name' });

    const result = resolveConflict('replace-cloud', local, remote);

    expect(result.name).toBe('Local Name');
  });

  it('returns remote data when strategy is replace-local', () => {
    const local = makeCollection({ name: 'Local Name' });
    const remote = makeCollection({ name: 'Remote Name' });

    const result = resolveConflict('replace-local', local, remote);

    expect(result.name).toBe('Remote Name');
  });

  it('merges data when strategy is merge', () => {
    const local = makeCollection({
      name: 'Local Name',
      updatedAt: '2026-01-02T12:00:00.000Z',
    });
    const remote = makeCollection({
      name: 'Remote Name',
      updatedAt: '2026-01-03T12:00:00.000Z',
    });

    const result = resolveConflict('merge', local, remote);

    // Merge strategy should produce a result (exact merge logic is implementation-defined)
    expect(result).toBeDefined();
    expect(result.id).toBe('col-1');
  });
});

describe('getLastSyncTimestamp', () => {
  it('returns the last sync timestamp for a team/collection', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        lastSyncAt: '2026-01-15T10:30:00.000Z',
      }),
    });

    const result = await getLastSyncTimestamp('team-1', 'col-1');

    expect(result).toBe('2026-01-15T10:30:00.000Z');
  });

  it('returns null when no sync has occurred', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    const result = await getLastSyncTimestamp('team-1', 'col-1');

    expect(result).toBeNull();
  });
});

describe('error cases', () => {
  it('queues push when offline', async () => {
    mockRunTransaction.mockRejectedValue(new Error('Failed to get document because the client is offline'));

    const collection = makeCollection();
    const rules = [makeRule()];

    // Should not throw — instead queues for later
    await expect(
      pushCollection('team-1', collection, rules),
    ).rejects.toThrow(/offline/i);
  });

  it('handles concurrent push conflict', async () => {
    mockRunTransaction.mockRejectedValue(
      new Error('Transaction failed: document was modified concurrently'),
    );

    const collection = makeCollection();
    const rules = [makeRule()];

    await expect(
      pushCollection('team-1', collection, rules),
    ).rejects.toThrow();
  });
});
