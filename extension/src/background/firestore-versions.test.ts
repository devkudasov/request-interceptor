import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetFirestore,
  mockCollection,
  mockDoc,
  mockSetDoc,
  mockGetDoc,
  mockGetDocs,
  mockQuery,
  mockWhere,
  mockOrderBy,
  mockLimit,
  mockStartAfter,
  mockServerTimestamp,
  mockAddDoc,
} = vi.hoisted(() => ({
  mockGetFirestore: vi.fn(() => ({})),
  mockCollection: vi.fn(() => ({ id: 'mock-collection-ref' })),
  mockDoc: vi.fn(() => ({ id: 'mock-doc-ref' })),
  mockSetDoc: vi.fn(),
  mockGetDoc: vi.fn(),
  mockGetDocs: vi.fn(),
  mockQuery: vi.fn((...args: unknown[]) => args),
  mockWhere: vi.fn((...args: unknown[]) => args),
  mockOrderBy: vi.fn((...args: unknown[]) => args),
  mockLimit: vi.fn((...args: unknown[]) => args),
  mockStartAfter: vi.fn((...args: unknown[]) => args),
  mockServerTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  mockAddDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
  collection: mockCollection,
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  startAfter: mockStartAfter,
  serverTimestamp: mockServerTimestamp,
  addDoc: mockAddDoc,
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApp: vi.fn(),
}));

vi.stubGlobal('chrome', {
  runtime: { id: 'test-extension-id' },
  storage: {
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
});

import {
  getVersionHistory,
  getVersion,
  restoreVersion,
} from './firestore-versions';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getVersionHistory', () => {
  it('returns a list of versions for a collection', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'v-3',
          data: () => ({
            version: 3,
            createdAt: '2026-03-03T00:00:00.000Z',
            author: { uid: 'user-1', displayName: 'User One' },
            collectionSnapshot: { name: 'API Mocks' },
          }),
        },
        {
          id: 'v-2',
          data: () => ({
            version: 2,
            createdAt: '2026-03-02T00:00:00.000Z',
            author: { uid: 'user-2', displayName: 'User Two' },
            collectionSnapshot: { name: 'API Mocks' },
          }),
        },
        {
          id: 'v-1',
          data: () => ({
            version: 1,
            createdAt: '2026-03-01T00:00:00.000Z',
            author: { uid: 'user-1', displayName: 'User One' },
            collectionSnapshot: { name: 'API Mocks' },
          }),
        },
      ],
    });

    const result = await getVersionHistory('team-1', 'col-1');

    expect(result).toHaveLength(3);
    expect(result[0].version).toBe(3);
    expect(result[2].version).toBe(1);
  });

  it('returns empty array when no versions exist', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    const result = await getVersionHistory('team-1', 'col-1');

    expect(result).toEqual([]);
  });

  it('supports pagination for 100+ versions', async () => {
    // First page
    const firstPageDocs = Array.from({ length: 50 }, (_, i) => ({
      id: `v-${50 - i}`,
      data: () => ({
        version: 50 - i,
        createdAt: `2026-01-${String(50 - i).padStart(2, '0')}T00:00:00.000Z`,
        author: { uid: 'user-1', displayName: 'User One' },
        collectionSnapshot: { name: 'API Mocks' },
      }),
    }));

    mockGetDocs.mockResolvedValue({
      docs: firstPageDocs,
    });

    const result = await getVersionHistory('team-1', 'col-1', {
      limit: 50,
    });

    expect(result).toHaveLength(50);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('uses cursor for subsequent pages', async () => {
    const lastDoc = {
      id: 'v-50',
      data: () => ({
        version: 50,
        createdAt: '2026-02-19T00:00:00.000Z',
        author: { uid: 'user-1', displayName: 'User One' },
      }),
    };

    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'v-49',
          data: () => ({
            version: 49,
            createdAt: '2026-02-18T00:00:00.000Z',
            author: { uid: 'user-1', displayName: 'User One' },
            collectionSnapshot: { name: 'API Mocks' },
          }),
        },
      ],
    });

    const result = await getVersionHistory('team-1', 'col-1', {
      limit: 50,
      startAfter: lastDoc,
    });

    expect(result).toBeDefined();
    expect(mockStartAfter).toHaveBeenCalled();
  });
});

describe('getVersion', () => {
  it('returns a specific version by id', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'v-2',
      data: () => ({
        version: 2,
        createdAt: '2026-03-02T00:00:00.000Z',
        author: { uid: 'user-1', displayName: 'User One' },
        collectionSnapshot: { name: 'API Mocks', ruleIds: ['rule-1'] },
        rulesSnapshot: [
          {
            id: 'rule-1',
            urlPattern: 'https://api.example.com/*',
            method: 'GET',
            statusCode: 200,
            responseBody: '{"ok":true}',
          },
        ],
      }),
    });

    const result = await getVersion('team-1', 'col-1', 'v-2');

    expect(result).toBeDefined();
    expect(result?.version).toBe(2);
    expect(result?.rulesSnapshot).toHaveLength(1);
  });

  it('returns null when version does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    const result = await getVersion('team-1', 'col-1', 'nonexistent');

    expect(result).toBeNull();
  });
});

describe('restoreVersion', () => {
  it('restores a version and creates a new version entry', async () => {
    // Mock getting the version to restore
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'v-2',
      data: () => ({
        version: 2,
        createdAt: '2026-03-02T00:00:00.000Z',
        author: { uid: 'user-1', displayName: 'User One' },
        collectionSnapshot: { name: 'API Mocks', ruleIds: ['rule-1'] },
        rulesSnapshot: [
          {
            id: 'rule-1',
            urlPattern: 'https://api.example.com/*',
            method: 'GET',
            statusCode: 200,
            responseBody: '{"ok":true}',
          },
        ],
      }),
    });
    mockAddDoc.mockResolvedValue({ id: 'v-4' });
    mockSetDoc.mockResolvedValue(undefined);

    await restoreVersion('team-1', 'col-1', 'v-2');

    // Should create a new version (the restored version)
    expect(mockAddDoc).toHaveBeenCalled();
  });

  it('throws when version to restore does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    await expect(
      restoreVersion('team-1', 'col-1', 'nonexistent'),
    ).rejects.toThrow();
  });
});
