import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamPanel } from './TeamPanel';
import type { TeamMember, TeamInvite } from '@/shared/types';

const members: TeamMember[] = [
  { userId: 'u1', email: 'alice@test.com', displayName: 'Alice', role: 'owner', joinedAt: '2026-01-01T00:00:00Z' },
  { userId: 'u2', email: 'bob@test.com', displayName: 'Bob', role: 'member', joinedAt: '2026-01-01T00:00:00Z' },
];

const pendingInvites: TeamInvite[] = [
  {
    id: 'inv1',
    teamId: 't1',
    teamName: 'Acme Corp',
    email: 'carol@test.com',
    invitedBy: 'u1',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const defaultProps = {
  teamId: 't1',
  members,
  pendingInvites: [] as TeamInvite[],
  currentUserId: 'u1',
  canManage: true,
  error: null as string | null,
  onInvite: vi.fn(),
  onRemoveMember: vi.fn(),
  onAcceptInvite: vi.fn(),
  onDeclineInvite: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TeamPanel — members', () => {
  it('renders member list', () => {
    render(<TeamPanel {...defaultProps} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows member email when no displayName', () => {
    const noNameMembers = [
      { ...members[0], displayName: null },
    ];
    render(<TeamPanel {...defaultProps} members={noNameMembers} />);

    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  });

  it('shows Remove button for non-owner members when canManage', () => {
    render(<TeamPanel {...defaultProps} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(1);
  });

  it('hides Remove button when canManage is false', () => {
    render(<TeamPanel {...defaultProps} canManage={false} />);

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('does not show Remove for current user', () => {
    render(<TeamPanel {...defaultProps} currentUserId="u1" />);

    // Only Bob (u2) should have Remove, not Alice (u1 = currentUser)
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(1);
  });

  it('calls onRemoveMember when Remove is clicked', async () => {
    const user = userEvent.setup();
    const onRemoveMember = vi.fn();
    render(<TeamPanel {...defaultProps} onRemoveMember={onRemoveMember} />);

    await user.click(screen.getByRole('button', { name: /remove/i }));

    expect(onRemoveMember).toHaveBeenCalledWith('t1', 'u2');
  });
});

describe('TeamPanel — invite form', () => {
  it('renders invite form when canManage', () => {
    render(<TeamPanel {...defaultProps} />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
  });

  it('hides invite form when canManage is false', () => {
    render(<TeamPanel {...defaultProps} canManage={false} />);

    expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
  });

  it('calls onInvite with email when Invite is clicked', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<TeamPanel {...defaultProps} onInvite={onInvite} />);

    await user.type(screen.getByPlaceholderText(/email/i), 'dave@test.com');
    await user.click(screen.getByRole('button', { name: /invite/i }));

    expect(onInvite).toHaveBeenCalledWith('t1', 'dave@test.com');
  });

  it('disables Invite button when email is empty', () => {
    render(<TeamPanel {...defaultProps} />);

    expect(screen.getByRole('button', { name: /invite/i })).toBeDisabled();
  });
});

describe('TeamPanel — pending invites', () => {
  it('renders pending invites', () => {
    render(<TeamPanel {...defaultProps} pendingInvites={pendingInvites} />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows Accept and Decline buttons for invites', () => {
    render(<TeamPanel {...defaultProps} pendingInvites={pendingInvites} />);

    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
  });

  it('calls onAcceptInvite when Accept is clicked', async () => {
    const user = userEvent.setup();
    const onAcceptInvite = vi.fn();
    render(<TeamPanel {...defaultProps} pendingInvites={pendingInvites} onAcceptInvite={onAcceptInvite} />);

    await user.click(screen.getByRole('button', { name: /accept/i }));

    expect(onAcceptInvite).toHaveBeenCalledWith('inv1');
  });

  it('calls onDeclineInvite when Decline is clicked', async () => {
    const user = userEvent.setup();
    const onDeclineInvite = vi.fn();
    render(<TeamPanel {...defaultProps} pendingInvites={pendingInvites} onDeclineInvite={onDeclineInvite} />);

    await user.click(screen.getByRole('button', { name: /decline/i }));

    expect(onDeclineInvite).toHaveBeenCalledWith('inv1');
  });

  it('hides pending invites section when no invites', () => {
    render(<TeamPanel {...defaultProps} pendingInvites={[]} />);

    expect(screen.queryByText(/pending invites/i)).not.toBeInTheDocument();
  });
});

describe('TeamPanel — error', () => {
  it('renders error message when error is set', () => {
    render(<TeamPanel {...defaultProps} error="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not render error when error is null', () => {
    render(<TeamPanel {...defaultProps} error={null} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
