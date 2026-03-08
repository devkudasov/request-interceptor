import { useState } from 'react';
import { useTeamsStore, useAuthStore } from '@/shared/store';
import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';

export function TeamPage() {
  const { user } = useAuthStore();
  const {
    team,
    pendingInvites,
    loading,
    error,
    createTeam,
    inviteMember,
    removeMember,
    acceptInvite,
    declineInvite,
  } = useTeamsStore();

  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-2xl gap-md">
        <p className="text-content-secondary text-base">Sign in to manage your team.</p>
      </div>
    );
  }

  const userRole = team?.members.find((m) => m.userId === user.uid)?.role;
  const canManage = userRole === 'owner' || userRole === 'admin';

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    await createTeam(newTeamName.trim());
    setNewTeamName('');
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !team) return;
    await inviteMember(team.id, inviteEmail.trim());
    setInviteEmail('');
  };

  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-lg font-semibold">Team</h2>

      {error && (
        <div className="bg-status-error/10 text-status-error px-md py-sm rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-sm">
          <h3 className="text-base font-medium text-content-secondary">Pending Invites</h3>
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between bg-surface-card border border-border rounded-md p-sm"
            >
              <span className="text-base font-medium">{invite.teamName}</span>
              <div className="flex gap-xs">
                <Button size="sm" onClick={() => acceptInvite(invite.id)}>
                  Accept
                </Button>
                <Button size="sm" variant="ghost" onClick={() => declineInvite(invite.id)}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No team — create form */}
      {!team && (
        <div className="flex flex-col gap-md py-lg">
          <p className="text-content-secondary text-base text-center">
            You are not part of any team yet. Create one to get started.
          </p>
          <div className="flex gap-sm">
            <Input
              label="Team name"
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()} loading={loading}>
              Create Team
            </Button>
          </div>
        </div>
      )}

      {/* Team exists — show details */}
      {team && (
        <>
          <h3 className="text-base font-semibold">{team.name}</h3>

          {/* Members */}
          <div className="flex flex-col gap-xs">
            <h4 className="text-sm font-medium text-content-secondary">
              Team ({team.members.length})
            </h4>
            {team.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-sm bg-surface-card border border-border rounded-md p-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium truncate">
                    {member.displayName ?? member.email}
                  </div>
                </div>
                <span
                  className="text-xs font-medium px-xs py-px rounded bg-surface-secondary text-content-muted"
                  title={member.role}
                />
                {canManage && member.userId !== user.uid && member.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(team.id, member.userId)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Invite form */}
          {canManage && (
            <div className="flex flex-col gap-sm">
              <div className="flex gap-sm">
                <Input
                  label="Invite by email"
                  placeholder="Email address"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>
                  Invite
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
