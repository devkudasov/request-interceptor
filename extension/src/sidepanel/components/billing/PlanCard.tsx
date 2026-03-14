import type { AuthPlan, SubscriptionStatus } from '@/features/auth';
import { Button } from '@/ui/common/Button';

interface PlanCardProps {
  plan: AuthPlan;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  onManageSubscription: () => void;
  showPlanName?: boolean;
}

const planNames: Record<AuthPlan, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
};

const statusLabels: Record<SubscriptionStatus, string> = {
  active: 'Active',
  canceled: 'Canceled',
  past_due: 'Past Due',
  incomplete: 'Incomplete',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PlanCard({
  plan,
  subscriptionStatus,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  onManageSubscription,
  showPlanName = true,
}: PlanCardProps) {
  const showManageButton =
    plan !== 'free' &&
    subscriptionStatus != null &&
    ['active', 'past_due', 'canceled'].includes(subscriptionStatus);

  return (
    <div className="rounded-lg border border-border bg-surface-card p-lg">
      <div className="flex items-center gap-sm mb-md">
        {showPlanName && (
          <span className="text-lg font-semibold">{planNames[plan]}</span>
        )}
        {subscriptionStatus && (
          <span className="text-sm text-content-secondary">
            {statusLabels[subscriptionStatus]}
          </span>
        )}
      </div>

      {currentPeriodEnd && !cancelAtPeriodEnd && (
        <p className="text-sm text-content-secondary mb-md">
          Next billing date: {formatDate(currentPeriodEnd)}
        </p>
      )}

      {cancelAtPeriodEnd && currentPeriodEnd && (
        <p className="text-sm text-status-error mb-md">
          Your subscription will cancel at the end of the current period ({formatDate(currentPeriodEnd)})
        </p>
      )}

      {showManageButton && (
        <Button variant="secondary" size="sm" onClick={onManageSubscription}>
          Manage Subscription
        </Button>
      )}
    </div>
  );
}
