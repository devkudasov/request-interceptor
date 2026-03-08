import { useEffect } from 'react';
import { useAuthStore } from '@/shared/store';
import { AuthForm } from '../components/AuthForm';
import { StorageBar } from '../components/StorageBar';
import { Badge } from '@/ui/common/Badge';
import { Button } from '@/ui/common/Button';
import { Spinner } from '@/ui/common/Spinner';
import type { AuthPlan } from '@/shared/types';

const PLAN_QUOTAS: Record<AuthPlan, number> = {
  free: 5 * 1024 * 1024, // 5 MB
  pro: 50 * 1024 * 1024, // 50 MB
  team: 500 * 1024 * 1024, // 500 MB
};

const PLAN_BADGE_VARIANT: Record<AuthPlan, 'default' | 'success' | 'info'> = {
  free: 'default',
  pro: 'success',
  team: 'info',
};

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

export function AccountPage() {
  const { user, loading, logout, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center py-2xl">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-xl">
        <AuthForm />
      </div>
    );
  }

  const quota = PLAN_QUOTAS[user.plan];
  // Hardcoded used storage for now; will be fetched from Firestore later
  const used = 0;

  return (
    <div className="flex flex-col gap-lg">
      {/* User profile header */}
      <div className="flex items-center gap-md">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="Avatar"
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-lg">
            {getInitials(user.displayName, user.email)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-sm">
            <span className="text-lg font-semibold text-content-primary truncate">
              {user.displayName ?? user.email ?? 'User'}
            </span>
            <Badge variant={PLAN_BADGE_VARIANT[user.plan]}>
              {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
            </Badge>
          </div>
          {user.displayName && user.email && (
            <span className="text-sm text-content-secondary truncate block">
              {user.email}
            </span>
          )}
        </div>
      </div>

      {/* Email verification warning */}
      {!user.emailVerified && user.email && (
        <div className="flex items-center gap-sm bg-status-warning/10 text-status-warning rounded-md px-md py-sm text-sm">
          <span>Email not verified. Check your inbox for a verification link.</span>
        </div>
      )}

      {/* Storage usage */}
      <StorageBar usedBytes={used} totalBytes={quota} />

      {/* Actions */}
      <div className="flex flex-col gap-sm">
        {user.plan === 'free' && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              // Placeholder: navigate to pricing page
            }}
          >
            Upgrade Plan
          </Button>
        )}
        <Button
          variant="danger"
          fullWidth
          onClick={logout}
          loading={loading}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
