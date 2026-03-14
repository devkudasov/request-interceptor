import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTeamsStore } from './store';
import type { Team, TeamMember, TeamInvite } from './types';

const mockSendMessage = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn() },
});

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'My Team',
    ownerId: 'user-1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    userId: 'user-1',
    email: 'owner@test.com',
    displayName: 'Owner',
    role: 'owner',
    joinedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeInvite(overrides: Partial<TeamInvite> = {}): TeamInvite {
  return {
    id: 'invite-1',
    teamId: 'team-1',
    teamName: 'My Team',
    email: 'invitee@test.com',
    invitedBy: 'user-1',
    status: 'pending',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTeamWithMembers() {
  return { ...makeTeam(), members: [makeMember()] };
}

function mockSuccess(data: unknown = undefined) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: true, data });
    },
  );
}

function mockError(error: string) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: false, error });
    },
  );
}

describe('useTeamsStore', () => {
  beforeEach(() => {
    useTeamsStore.setState(useTeamsStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with null team, empty invites, no loading, no error', () => {
      const state = useTeamsStore.getState();
      expect(state.team).toBeNull();
      expect(state.pendingInvites).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('createTeam', () => {
    it('sets team on success', async () => {
      const team = makeTeamWithMembers();
      mockSuccess(team);

      await useTeamsStore.getState().createTeam('My Team');

      expect(useTeamsStore.getState().team).toEqual(team);
      expect(useTeamsStore.getState().loading).toBe(false);
    });

    it('sends CREATE_TEAM message', async () => {
      mockSuccess(makeTeamWithMembers());

      await useTeamsStore.getState().createTeam('New Team');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'CREATE_TEAM', payload: { name: 'New Team' } },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Team creation failed');

      await useTeamsStore.getState().createTeam('Fail Team');

      expect(useTeamsStore.getState().error).toBe('Team creation failed');
      expect(useTeamsStore.getState().loading).toBe(false);
    });
  });

  describe('fetchTeam', () => {
    it('fetches team by teamId', async () => {
      const team = makeTeamWithMembers();
      mockSuccess(team);

      await useTeamsStore.getState().fetchTeam('team-1');

      expect(useTeamsStore.getState().team).toEqual(team);
      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'GET_TEAM', payload: { teamId: 'team-1' } },
        expect.any(Function),
      );
    });

    it('fetches user teams first when no teamId provided', async () => {
      const teams = [makeTeam({ id: 'team-first' })];
      const teamWithMembers = { ...makeTeam({ id: 'team-first' }), members: [makeMember()] };

      let callCount = 0;
      mockSendMessage.mockImplementation(
        (_msg: unknown, cb: (response: unknown) => void) => {
          callCount++;
          if (callCount === 1) {
            // GET_USER_TEAMS
            cb({ ok: true, data: teams });
          } else {
            // GET_TEAM
            cb({ ok: true, data: teamWithMembers });
          }
        },
      );

      await useTeamsStore.getState().fetchTeam();

      expect(useTeamsStore.getState().team).toEqual(teamWithMembers);
    });

    it('sets team to null when user has no teams', async () => {
      mockSuccess([]);

      await useTeamsStore.getState().fetchTeam();

      expect(useTeamsStore.getState().team).toBeNull();
      expect(useTeamsStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockError('Fetch failed');

      await useTeamsStore.getState().fetchTeam('team-1');

      expect(useTeamsStore.getState().error).toBe('Fetch failed');
      expect(useTeamsStore.getState().loading).toBe(false);
    });
  });

  describe('deleteTeam', () => {
    it('clears team on success', async () => {
      useTeamsStore.setState({ team: makeTeamWithMembers() });
      mockSuccess(undefined);

      await useTeamsStore.getState().deleteTeam('team-1');

      expect(useTeamsStore.getState().team).toBeNull();
      expect(useTeamsStore.getState().loading).toBe(false);
    });

    it('sends DELETE_TEAM message', async () => {
      mockSuccess(undefined);

      await useTeamsStore.getState().deleteTeam('team-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'DELETE_TEAM', payload: { teamId: 'team-1' } },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Delete failed');

      await useTeamsStore.getState().deleteTeam('team-1');

      expect(useTeamsStore.getState().error).toBe('Delete failed');
    });
  });

  describe('inviteMember', () => {
    it('sends INVITE_MEMBER and re-fetches team', async () => {
      const team = makeTeamWithMembers();
      let callCount = 0;
      mockSendMessage.mockImplementation(
        (_msg: unknown, cb: (response: unknown) => void) => {
          callCount++;
          if (callCount === 1) {
            cb({ ok: true, data: undefined }); // INVITE_MEMBER
          } else {
            cb({ ok: true, data: team }); // GET_TEAM (fetchTeam)
          }
        },
      );

      await useTeamsStore.getState().inviteMember('team-1', 'new@test.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'INVITE_MEMBER', payload: { teamId: 'team-1', email: 'new@test.com' } },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Invite failed');

      await useTeamsStore.getState().inviteMember('team-1', 'bad@test.com');

      expect(useTeamsStore.getState().error).toBe('Invite failed');
    });
  });

  describe('acceptInvite', () => {
    it('removes invite from pendingInvites and re-fetches team', async () => {
      useTeamsStore.setState({
        pendingInvites: [makeInvite({ id: 'inv-1' }), makeInvite({ id: 'inv-2' })],
      });

      let callCount = 0;
      mockSendMessage.mockImplementation(
        (_msg: unknown, cb: (response: unknown) => void) => {
          callCount++;
          if (callCount === 1) {
            cb({ ok: true, data: undefined }); // ACCEPT_INVITE
          } else if (callCount === 2) {
            cb({ ok: true, data: [] }); // GET_USER_TEAMS (fetchTeam with no teamId)
          }
        },
      );

      await useTeamsStore.getState().acceptInvite('inv-1');

      expect(
        useTeamsStore.getState().pendingInvites.map((i) => i.id),
      ).toEqual(['inv-2']);
    });

    it('sends ACCEPT_INVITE message', async () => {
      let callCount = 0;
      mockSendMessage.mockImplementation(
        (_msg: unknown, cb: (response: unknown) => void) => {
          callCount++;
          if (callCount === 1) {
            cb({ ok: true, data: undefined });
          } else {
            cb({ ok: true, data: [] });
          }
        },
      );

      await useTeamsStore.getState().acceptInvite('inv-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'ACCEPT_INVITE', payload: { inviteId: 'inv-1' } },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Accept failed');

      await useTeamsStore.getState().acceptInvite('inv-1');

      expect(useTeamsStore.getState().error).toBe('Accept failed');
    });
  });

  describe('declineInvite', () => {
    it('removes invite from pendingInvites', async () => {
      useTeamsStore.setState({
        pendingInvites: [makeInvite({ id: 'inv-1' }), makeInvite({ id: 'inv-2' })],
      });
      mockSuccess(undefined);

      await useTeamsStore.getState().declineInvite('inv-1');

      expect(
        useTeamsStore.getState().pendingInvites.map((i) => i.id),
      ).toEqual(['inv-2']);
    });

    it('sends DECLINE_INVITE message', async () => {
      mockSuccess(undefined);

      await useTeamsStore.getState().declineInvite('inv-1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'DECLINE_INVITE', payload: { inviteId: 'inv-1' } },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Decline failed');

      await useTeamsStore.getState().declineInvite('inv-1');

      expect(useTeamsStore.getState().error).toBe('Decline failed');
    });
  });

  describe('fetchInvites', () => {
    it('sets pendingInvites on success', async () => {
      const invites = [makeInvite({ id: 'i1' }), makeInvite({ id: 'i2' })];
      mockSuccess(invites);

      await useTeamsStore.getState().fetchInvites();

      expect(useTeamsStore.getState().pendingInvites).toEqual(invites);
    });

    it('sends GET_PENDING_INVITES message', async () => {
      mockSuccess([]);

      await useTeamsStore.getState().fetchInvites();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'GET_PENDING_INVITES', payload: undefined },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Fetch invites failed');

      await useTeamsStore.getState().fetchInvites();

      expect(useTeamsStore.getState().error).toBe('Fetch invites failed');
    });
  });

  describe('updateRole', () => {
    it('sends UPDATE_MEMBER_ROLE and re-fetches team', async () => {
      const team = makeTeamWithMembers();
      let callCount = 0;
      mockSendMessage.mockImplementation(
        (_msg: unknown, cb: (response: unknown) => void) => {
          callCount++;
          if (callCount === 1) {
            cb({ ok: true, data: undefined });
          } else {
            cb({ ok: true, data: team });
          }
        },
      );

      await useTeamsStore.getState().updateRole('team-1', 'user-2', 'admin');

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'UPDATE_MEMBER_ROLE',
          payload: { teamId: 'team-1', userId: 'user-2', role: 'admin' },
        },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Update role failed');

      await useTeamsStore.getState().updateRole('team-1', 'user-2', 'admin');

      expect(useTeamsStore.getState().error).toBe('Update role failed');
    });
  });

  describe('removeMember', () => {
    it('sends REMOVE_MEMBER and re-fetches team', async () => {
      const team = makeTeamWithMembers();
      let callCount = 0;
      mockSendMessage.mockImplementation(
        (_msg: unknown, cb: (response: unknown) => void) => {
          callCount++;
          if (callCount === 1) {
            cb({ ok: true, data: undefined });
          } else {
            cb({ ok: true, data: team });
          }
        },
      );

      await useTeamsStore.getState().removeMember('team-1', 'user-2');

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'REMOVE_MEMBER',
          payload: { teamId: 'team-1', userId: 'user-2' },
        },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Remove failed');

      await useTeamsStore.getState().removeMember('team-1', 'user-2');

      expect(useTeamsStore.getState().error).toBe('Remove failed');
    });
  });
});
