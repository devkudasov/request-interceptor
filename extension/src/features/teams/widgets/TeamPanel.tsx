import { useState } from 'react';
import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';
import type { TeamMember, TeamInvite } from '@/features/teams';

interface TeamPanelProps {
  teamId: string;
  members: TeamMember[];
  pendingInvites: TeamInvite[];
  currentUserId: string;
  canManage: boolean;
  error: string | null;
  onInvite: (teamId: string, email: string) => void;
  onRemoveMember: (teamId: string, userId: string) => void;
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
}

export function TeamPanel({
  teamId,
  members,
  pendingInvites,
  currentUserId,
  canManage,
  error,
  onInvite,
  onRemoveMember,
  onAcceptInvite,
  onDeclineInvite,
}: TeamPanelProps) {
  const [inviteEmail, setInviteEmail] = useState('');

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    onInvite(teamId, inviteEmail.trim());
    setInviteEmail('');
  };

  return (
    <div className="flex flex-col gap-sm px-md py-sm border border-border border-t-0 rounded-b-md bg-surface-primary">
      {error && (
        <div role="alert" className="bg-status-error/10 text-status-error px-md py-sm rounded-md text-sm">
          {error}
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-xs">
          <h4 className="text-xs font-medium text-content-muted uppercase">Pending Invites</h4>
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between bg-surface-card border border-border rounded-md p-sm"
            >
              <span className="text-sm font-medium">{invite.teamName}</span>
              <div className="flex gap-xs">
                <Button size="sm" onClick={() => onAcceptInvite(invite.id)}>Accept</Button>
                <Button size="sm" variant="ghost" onClick={() => onDeclineInvite(invite.id)}>Decline</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-xs">
        {members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center gap-sm bg-surface-card border border-border rounded-md p-sm"
          >
            <span className="flex-1 text-sm truncate">
              {member.displayName ?? member.email}
            </span>
            <span className="text-xs text-content-muted">{member.role}</span>
            {canManage && member.userId !== currentUserId && member.role !== 'owner' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveMember(teamId, member.userId)}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <div className="flex gap-sm items-end">
          <div className="flex-1">
            <Input
              placeholder="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={handleInvite} disabled={!inviteEmail.trim()}>
            Invite
          </Button>
        </div>
      )}
    </div>
  );
}
