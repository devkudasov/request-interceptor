export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}
