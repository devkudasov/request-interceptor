import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { Team, TeamMember, TeamInvite, TeamRole } from './types';

interface TeamsState {
  team: (Team & { members: TeamMember[] }) | null;
  pendingInvites: TeamInvite[];
  loading: boolean;
  error: string | null;
  createTeam: (name: string) => Promise<void>;
  fetchTeam: (teamId?: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  inviteMember: (teamId: string, email: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  fetchInvites: () => Promise<void>;
  updateRole: (teamId: string, userId: string, role: TeamRole) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  team: null,
  pendingInvites: [],
  loading: false,
  error: null,

  createTeam: async (name) => {
    set({ loading: true, error: null });
    try {
      const team = await sendMessage<Team & { members: TeamMember[] }>(
        MESSAGE_TYPES.CREATE_TEAM,
        { name },
      );
      set({ team, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  fetchTeam: async (teamId) => {
    set({ loading: true, error: null });
    try {
      if (!teamId) {
        const teams = await sendMessage<Team[]>(MESSAGE_TYPES.GET_USER_TEAMS);
        if (teams.length > 0) {
          const team = await sendMessage<(Team & { members: TeamMember[] }) | null>(
            MESSAGE_TYPES.GET_TEAM,
            { teamId: teams[0].id },
          );
          set({ team, loading: false });
        } else {
          set({ team: null, loading: false });
        }
      } else {
        const team = await sendMessage<(Team & { members: TeamMember[] }) | null>(
          MESSAGE_TYPES.GET_TEAM,
          { teamId },
        );
        set({ team, loading: false });
      }
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  deleteTeam: async (teamId) => {
    set({ loading: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.DELETE_TEAM, { teamId });
      set({ team: null, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  inviteMember: async (teamId, email) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.INVITE_MEMBER, { teamId, email });
      await get().fetchTeam(teamId);
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  acceptInvite: async (inviteId) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.ACCEPT_INVITE, { inviteId });
      set((s) => ({ pendingInvites: s.pendingInvites.filter((i) => i.id !== inviteId) }));
      await get().fetchTeam();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  declineInvite: async (inviteId) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.DECLINE_INVITE, { inviteId });
      set((s) => ({ pendingInvites: s.pendingInvites.filter((i) => i.id !== inviteId) }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  fetchInvites: async () => {
    set({ error: null });
    try {
      const invites = await sendMessage<TeamInvite[]>(MESSAGE_TYPES.GET_PENDING_INVITES);
      set({ pendingInvites: invites });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updateRole: async (teamId, userId, role) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.UPDATE_MEMBER_ROLE, { teamId, userId, role });
      await get().fetchTeam(teamId);
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  removeMember: async (teamId, userId) => {
    set({ error: null });
    try {
      await sendMessage(MESSAGE_TYPES.REMOVE_MEMBER, { teamId, userId });
      await get().fetchTeam(teamId);
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
}));
