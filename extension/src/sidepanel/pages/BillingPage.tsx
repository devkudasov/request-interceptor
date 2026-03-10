import { useAuthStore } from '@/shared/store';
import { useBillingStore } from '@/shared/billing-store';
import { PlanCard } from '../components/billing/PlanCard';
import { PlanComparisonTable } from '../components/billing/PlanComparisonTable';
import type { AuthPlan } from '@/shared/types';

export function BillingPage() {
  const { user } = useAuthStore();
  const { loading, error, createCheckoutSession, createPortalSession } = useBillingStore();

  const plan: AuthPlan = user?.plan ?? 'free';
  const subscriptionStatus = user?.subscriptionStatus ?? null;
  const currentPeriodEnd = user?.currentPeriodEnd ?? null;
  const cancelAtPeriodEnd = user?.cancelAtPeriodEnd ?? false;

  if (loading) {
    return <div className="p-lg">Loading...</div>;
  }

  return (
    <div className="space-y-lg">
      <h1 className="text-xl font-bold">Billing</h1>

      {error && (
        <div className="text-status-error text-sm">{error}</div>
      )}

      <PlanCard
        plan={plan}
        subscriptionStatus={subscriptionStatus}
        currentPeriodEnd={currentPeriodEnd}
        cancelAtPeriodEnd={cancelAtPeriodEnd}
        onManageSubscription={createPortalSession}
        showPlanName={false}
      />

      <PlanComparisonTable
        currentPlan={plan}
        onUpgrade={(selectedPlan) => createCheckoutSession(selectedPlan)}
      />
    </div>
  );
}
