import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetFirestore,
  mockCollection,
  mockDoc,
  mockSetDoc,
  mockGetDoc,
  mockGetDocs,
  mockDeleteDoc,
  mockUpdateDoc,
  mockQuery,
  mockWhere,
  mockOrderBy,
  mockServerTimestamp,
  mockAddDoc,
} = vi.hoisted(() => ({
  mockGetFirestore: vi.fn(() => ({})),
  mockCollection: vi.fn(() => ({ id: 'mock-collection-ref' })),
  mockDoc: vi.fn(() => ({ id: 'mock-doc-ref' })),
  mockSetDoc: vi.fn(),
  mockGetDoc: vi.fn(),
  mockGetDocs: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockQuery: vi.fn((...args: unknown[]) => args),
  mockWhere: vi.fn((...args: unknown[]) => args),
  mockOrderBy: vi.fn((...args: unknown[]) => args),
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
  deleteDoc: mockDeleteDoc,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  serverTimestamp: mockServerTimestamp,
  addDoc: mockAddDoc,
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApp: vi.fn(),
}));

// Mock chrome APIs
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
  createTeam,
  inviteMember,
  acceptInvite,
  declineInvite,
  updateMemberRole,
  removeMember,
  deleteTeam,
  getTeam,
  getUserTeams,
  getPendingInvites,
} from './firestore-teams';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createTeam', () => {
  it('creates a team doc in Firestore with the creator as owner', async () => {
    mockSetDoc.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({ id: 'team-1' });

    const result = await createTeam('My Team');

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'My Team',
      }),
    );
    expect(result).toBeDefined();
  });

  it('sets the creator role to owner', async () => {
    mockSetDoc.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({ id: 'team-1' });

    await createTeam('My Team');

    // Verify at least one setDoc call includes owner role
    const calls = mockSetDoc.mock.calls;
    const hasOwnerRole = calls.some(
      (call) => call[1]?.role === 'owner',
    );
    expect(hasOwnerRole).toBe(true);
  });

  it('returns the created team with its id', async () => {
    mockSetDoc.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({ id: 'team-abc' });

    const result = await createTeam('Test Team');

    expect(result).toEqual(
      expect.objectContaining({
        name: 'Test Team',
      }),
    );
  });
});

describe('inviteMember', () => {
  it('creates an invite doc with the target email', async () => {
    mockAddDoc.mockResolvedValue({ id: 'invite-1' });

    await inviteMember('team-1', 'user@example.com');

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: 'user@example.com',
        teamId: 'team-1',
        status: 'pending',
      }),
    );
  });

  it('returns the invite id', async () => {
    mockAddDoc.mockResolvedValue({ id: 'invite-42' });

    const result = await inviteMember('team-1', 'user@example.com');

    expect(result).toBeDefined();
  });
});

describe('acceptInvite', () => {
  it('moves user to team members and marks invite as accepted', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        email: 'user@example.com',
        teamId: 'team-1',
        status: 'pending',
      }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);

    await acceptInvite('invite-1');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'accepted' }),
    );
  });

  it('throws if invite does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    await expect(acceptInvite('nonexistent')).rejects.toThrow();
  });
});

describe('declineInvite', () => {
  it('deletes the invite doc', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        email: 'user@example.com',
        teamId: 'team-1',
        status: 'pending',
      }),
    });
    mockDeleteDoc.mockResolvedValue(undefined);

    await declineInvite('invite-1');

    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it('throws if invite does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    await expect(declineInvite('nonexistent')).rejects.toThrow();
  });
});

describe('updateMemberRole', () => {
  it('changes the role of a team member', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    await updateMemberRole('team-1', 'user-1', 'admin');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: 'admin' }),
    );
  });
});

describe('removeMember', () => {
  it('removes a member from the team', async () => {
    mockDeleteDoc.mockResolvedValue(undefined);
    // Mock that more than one admin exists
    mockGetDocs.mockResolvedValue({
      size: 2,
      docs: [
        { id: 'user-1', data: () => ({ role: 'admin' }) },
        { id: 'user-2', data: () => ({ role: 'admin' }) },
      ],
    });

    await removeMember('team-1', 'user-1');

    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it('throws when trying to remove the last admin', async () => {
    mockGetDocs.mockResolvedValue({
      size: 1,
      docs: [
        { id: 'user-1', data: () => ({ role: 'owner' }) },
      ],
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'owner' }),
    });

    await expect(removeMember('team-1', 'user-1')).rejects.toThrow();
  });

  it('throws when owner leaves without transferring ownership', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'owner' }),
    });
    mockGetDocs.mockResolvedValue({
      size: 1,
      docs: [{ id: 'user-1', data: () => ({ role: 'owner' }) }],
    });

    await expect(removeMember('team-1', 'user-1')).rejects.toThrow();
  });
});

describe('deleteTeam', () => {
  it('deletes the team and all subdocs', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { ref: { id: 'member-1' } },
        { ref: { id: 'member-2' } },
      ],
    });
    mockDeleteDoc.mockResolvedValue(undefined);

    await deleteTeam('team-1');

    // Should delete member docs + team doc
    expect(mockDeleteDoc).toHaveBeenCalled();
  });
});

describe('getTeam', () => {
  it('returns team data with members', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'team-1',
      data: () => ({
        name: 'My Team',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    });
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'user-1',
          data: () => ({
            email: 'owner@example.com',
            role: 'owner',
            displayName: 'Owner',
          }),
        },
        {
          id: 'user-2',
          data: () => ({
            email: 'member@example.com',
            role: 'member',
            displayName: 'Member',
          }),
        },
      ],
    });

    const result = await getTeam('team-1');

    expect(result).toBeDefined();
    expect(result?.name).toBe('My Team');
    expect(result?.members).toHaveLength(2);
    expect(result?.members[0].role).toBe('owner');
  });

  it('returns null when team does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    const result = await getTeam('nonexistent');

    expect(result).toBeNull();
  });
});

describe('getUserTeams', () => {
  it('returns all teams the user belongs to', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'membership-1',
          data: () => ({ teamId: 'team-1', role: 'owner' }),
        },
        {
          id: 'membership-2',
          data: () => ({ teamId: 'team-2', role: 'member' }),
        },
      ],
    });

    const result = await getUserTeams('user-1');

    expect(result).toHaveLength(2);
  });

  it('returns empty array when user has no teams', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [],
    });

    const result = await getUserTeams('user-1');

    expect(result).toEqual([]);
  });
});

describe('getPendingInvites', () => {
  it('returns pending invites for the given email', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'invite-1',
          data: () => ({
            email: 'user@example.com',
            teamId: 'team-1',
            status: 'pending',
            teamName: 'Alpha Team',
          }),
        },
      ],
    });

    const result = await getPendingInvites('user@example.com');

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
  });

  it('returns empty array when no pending invites', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [],
    });

    const result = await getPendingInvites('user@example.com');

    expect(result).toEqual([]);
  });
});

describe('error cases', () => {
  it('non-admin cannot manage members', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'member' }),
    });

    // A member should not be able to update roles
    await expect(
      updateMemberRole('team-1', 'user-2', 'admin'),
    ).rejects.toThrow();
  });
});
