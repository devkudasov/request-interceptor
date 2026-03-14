import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthPlan, SubscriptionStatus } from '@/features/auth';
import { PlanCard } from './PlanCard';

interface PlanCardProps {
  plan: AuthPlan;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  onManageSubscription: () => void;
}

function renderPlanCard(overrides: Partial<PlanCardProps> = {}) {
  const defaultProps: PlanCardProps = {
    plan: 'free',
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    onManageSubscription: vi.fn(),
    ...overrides,
  };
  return { ...render(<PlanCard {...defaultProps} />), props: defaultProps };
}

describe('PlanCard', () => {
  it('renders plan name for free plan', () => {
    renderPlanCard({ plan: 'free' });
    expect(screen.getByText(/free/i)).toBeInTheDocument();
  });

  it('renders plan name for pro plan', () => {
    renderPlanCard({ plan: 'pro' });
    expect(screen.getByText(/pro/i)).toBeInTheDocument();
  });

  it('renders plan name for team plan', () => {
    renderPlanCard({ plan: 'team' });
    expect(screen.getByText(/team/i)).toBeInTheDocument();
  });

  it('shows plan badge', () => {
    renderPlanCard({ plan: 'pro' });
    // Badge should visually distinguish the plan
    const badge = screen.getByText(/pro/i);
    expect(badge).toBeInTheDocument();
  });

  it('shows "Active" status for active subscription', () => {
    renderPlanCard({ plan: 'pro', subscriptionStatus: 'active' });
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('shows "Manage Subscription" button for pro plan with active status', () => {
    renderPlanCard({ plan: 'pro', subscriptionStatus: 'active' });
    expect(screen.getByRole('button', { name: /manage subscription/i })).toBeInTheDocument();
  });

  it('shows "Manage Subscription" button for team plan with active status', () => {
    renderPlanCard({ plan: 'team', subscriptionStatus: 'active' });
    expect(screen.getByRole('button', { name: /manage subscription/i })).toBeInTheDocument();
  });

  it('hides "Manage Subscription" button for free plan', () => {
    renderPlanCard({ plan: 'free', subscriptionStatus: null });
    expect(screen.queryByRole('button', { name: /manage subscription/i })).not.toBeInTheDocument();
  });

  it('shows cancellation notice when cancelAtPeriodEnd is true', () => {
    renderPlanCard({
      plan: 'pro',
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-04-09T00:00:00.000Z',
    });
    expect(screen.getByText(/cancel/i)).toBeInTheDocument();
  });

  it('shows next billing date when currentPeriodEnd is set', () => {
    renderPlanCard({
      plan: 'pro',
      subscriptionStatus: 'active',
      currentPeriodEnd: '2026-04-09T00:00:00.000Z',
    });
    // Should display the billing date in some human-readable format
    expect(screen.getByText(/Apr/i)).toBeInTheDocument();
  });

  it('calls onManageSubscription when button is clicked', async () => {
    const onManageSubscription = vi.fn();
    renderPlanCard({
      plan: 'pro',
      subscriptionStatus: 'active',
      onManageSubscription,
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /manage subscription/i }));

    expect(onManageSubscription).toHaveBeenCalledOnce();
  });
});
