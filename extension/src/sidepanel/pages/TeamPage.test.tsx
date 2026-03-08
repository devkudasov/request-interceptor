import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockCreateTeam = vi.fn();
const mockInviteMember = vi.fn();
const mockRemoveMember = vi.fn();
const mockAcceptInvite = vi.fn();
const mockDeclineInvite = vi.fn();
const mockFetchTeam = vi.fn();

let mockTeamsStoreState = {
  team: null as {
    id: string;
    name: string;
    members: Array<{
      userId: string;
      email: string;
      displayName: string;
      role: 'owner' | 'admin' | 'member';
    }>;
  } | null,
  pendingInvites: [] as Array<{
    id: string;
    email: string;
    teamId: string;
    teamName: string;
    status: 'pending';
  }>,
  loading: false,
  error: null as string | null,
  createTeam: mockCreateTeam,
  inviteMember: mockInviteMember,
  removeMember: mockRemoveMember,
  acceptInvite: mockAcceptInvite,
  declineInvite: mockDeclineInvite,
  fetchTeam: mockFetchTeam,
};

let mockAuthStoreState = {
  user: {
    uid: 'user-1',
    email: 'owner@example.com',
    displayName: 'Owner User',
    photoURL: null,
    emailVerified: true,
    plan: 'team' as const,
  },
  loading: false,
  error: null,
};

vi.mock('@/shared/store', () => ({
  useTeamsStore: vi.fn(() => mockTeamsStoreState),
  useAuthStore: vi.fn(() => mockAuthStoreState),
}));

import { TeamPage } from './TeamPage';

beforeEach(() => {
  vi.clearAllMocks();
  mockTeamsStoreState = {
    team: null,
    pendingInvites: [],
    loading: false,
    error: null,
    createTeam: mockCreateTeam,
    inviteMember: mockInviteMember,
    removeMember: mockRemoveMember,
    acceptInvite: mockAcceptInvite,
    declineInvite: mockDeclineInvite,
    fetchTeam: mockFetchTeam,
  };
  mockAuthStoreState = {
    user: {
      uid: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner User',
      photoURL: null,
      emailVerified: true,
      plan: 'team',
    },
    loading: false,
    error: null,
  };
});

describe('TeamPage — no team', () => {
  it('shows "Create Team" when user has no team', () => {
    render(<TeamPage />);

    expect(
      screen.getByRole('button', { name: /create team/i }),
    ).toBeInTheDocument();
  });

  it('calls createTeam when the form is submitted', async () => {
    render(<TeamPage />);
    const user = userEvent.setup();

    const input = screen.getByLabelText(/team name/i);
    await user.type(input, 'New Team');
    await user.click(screen.getByRole('button', { name: /create team/i }));

    expect(mockCreateTeam).toHaveBeenCalledWith('New Team');
  });
});

describe('TeamPage — team exists', () => {
  beforeEach(() => {
    mockTeamsStoreState.team = {
      id: 'team-1',
      name: 'Alpha Team',
      members: [
        {
          userId: 'user-1',
          email: 'owner@example.com',
          displayName: 'Owner User',
          role: 'owner',
        },
        {
          userId: 'user-2',
          email: 'admin@example.com',
          displayName: 'Admin User',
          role: 'admin',
        },
        {
          userId: 'user-3',
          email: 'member@example.com',
          displayName: 'Regular Member',
          role: 'member',
        },
      ],
    };
  });

  it('shows team name when team exists', () => {
    render(<TeamPage />);

    expect(screen.getByText('Alpha Team')).toBeInTheDocument();
  });

  it('shows member list with all members', () => {
    render(<TeamPage />);

    expect(screen.getByText('Owner User')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Regular Member')).toBeInTheDocument();
  });

  it('shows role badges (Owner, Admin, Member)', () => {
    render(<TeamPage />);

    expect(screen.getByText(/owner/i)).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    expect(screen.getByText(/member/i)).toBeInTheDocument();
  });

  it('shows invite form for Owner', () => {
    render(<TeamPage />);

    expect(screen.getByLabelText(/invite.*email/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /invite/i }),
    ).toBeInTheDocument();
  });

  it('invite button calls inviteMember store action', async () => {
    render(<TeamPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/invite.*email/i);
    await user.type(emailInput, 'newuser@example.com');
    await user.click(screen.getByRole('button', { name: /invite/i }));

    expect(mockInviteMember).toHaveBeenCalledWith(
      'team-1',
      'newuser@example.com',
    );
  });

  it('shows remove member button for Owner/Admin', () => {
    render(<TeamPage />);

    // Owner should see remove buttons for other members
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it('remove member button calls removeMember', async () => {
    render(<TeamPage />);
    const user = userEvent.setup();

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(mockRemoveMember).toHaveBeenCalled();
  });
});

describe('TeamPage — pending invites', () => {
  it('shows "You have pending invites" when invites exist', () => {
    mockTeamsStoreState.pendingInvites = [
      {
        id: 'invite-1',
        email: 'owner@example.com',
        teamId: 'team-2',
        teamName: 'Beta Team',
        status: 'pending',
      },
    ];

    render(<TeamPage />);

    expect(
      screen.getByText(/pending invite/i),
    ).toBeInTheDocument();
  });

  it('shows team name in pending invite', () => {
    mockTeamsStoreState.pendingInvites = [
      {
        id: 'invite-1',
        email: 'owner@example.com',
        teamId: 'team-2',
        teamName: 'Beta Team',
        status: 'pending',
      },
    ];

    render(<TeamPage />);

    expect(screen.getByText(/Beta Team/)).toBeInTheDocument();
  });

  it('shows accept and decline buttons for pending invites', () => {
    mockTeamsStoreState.pendingInvites = [
      {
        id: 'invite-1',
        email: 'owner@example.com',
        teamId: 'team-2',
        teamName: 'Beta Team',
        status: 'pending',
      },
    ];

    render(<TeamPage />);

    expect(
      screen.getByRole('button', { name: /accept/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /decline/i }),
    ).toBeInTheDocument();
  });
});
