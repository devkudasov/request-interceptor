import { useAuthStore } from '@/shared/store';
import { AuthForm } from './AuthForm';
import { StorageBar } from './StorageBar';
import { Badge } from '@/ui/common/Badge';
import { Button } from '@/ui/common/Button';
import {
  PLAN_LIMITS,
  PLAN_BADGE_VARIANT,
  getInitials,
} from '@/shared/utils/account';

interface AccountPopoverProps {
  onClose: () => void;
}

export function AccountPopover({ onClose }: AccountPopoverProps) {
  const { user, loading, logout } = useAuthStore();

  if (!user) {
    return (
      <div className="p-md">
        <div className="flex justify-end mb-sm">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-content-secondary hover:text-content-primary"
          >
            &times;
          </button>
        </div>
        <AuthForm />
      </div>
    );
  }

  const quota = PLAN_LIMITS[user.plan].storageBytes;
  const used = 0;

  return (
    <div className="p-md flex flex-col gap-lg">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-content-secondary hover:text-content-primary"
        >
          &times;
        </button>
      </div>

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
          <span>Email not verified. Check your inbox.</span>
        </div>
      )}

      {/* Storage usage */}
      <StorageBar usedBytes={used} totalBytes={quota} />

      {/* Actions */}
      <div className="flex flex-col gap-sm">
        {user.plan === 'free' && (
          <Button variant="secondary" fullWidth>
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
