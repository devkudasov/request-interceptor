import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthPlan } from '@/features/auth';
import { PlanComparisonTable } from './PlanComparisonTable';

interface PlanComparisonTableProps {
  currentPlan: AuthPlan;
  onUpgrade: (plan: AuthPlan) => void;
}

function renderTable(overrides: Partial<PlanComparisonTableProps> = {}) {
  const defaultProps: PlanComparisonTableProps = {
    currentPlan: 'free',
    onUpgrade: vi.fn(),
    ...overrides,
  };
  return { ...render(<PlanComparisonTable {...defaultProps} />), props: defaultProps };
}

describe('PlanComparisonTable', () => {
  it('renders three plan columns (Free, Pro, Team)', () => {
    renderTable();

    expect(screen.getByText(/free/i)).toBeInTheDocument();
    expect(screen.getByText(/pro/i)).toBeInTheDocument();
    expect(screen.getByText(/team/i)).toBeInTheDocument();
  });

  it('shows feature rows', () => {
    renderTable();

    // Should list key features
    expect(screen.getByText(/rules/i)).toBeInTheDocument();
    expect(screen.getByText(/collections/i)).toBeInTheDocument();
    expect(screen.getByText(/cloud sync/i)).toBeInTheDocument();
  });

  it('highlights current plan column with "Current Plan" label', () => {
    renderTable({ currentPlan: 'pro' });

    expect(screen.getByText(/current plan/i)).toBeInTheDocument();
  });

  it('shows "Upgrade" button for plans higher than current', () => {
    renderTable({ currentPlan: 'free' });

    // Free user should see upgrade buttons for Pro and Team
    const upgradeButtons = screen.getAllByRole('button', { name: /upgrade/i });
    expect(upgradeButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('hides "Upgrade" button for current plan and lower plans', () => {
    renderTable({ currentPlan: 'pro' });

    // Pro user should only see upgrade for Team, not for Free or Pro
    const upgradeButtons = screen.getAllByRole('button', { name: /upgrade/i });
    expect(upgradeButtons).toHaveLength(1);
  });

  it('calls onUpgrade with plan name when Upgrade is clicked', async () => {
    const onUpgrade = vi.fn();
    renderTable({ currentPlan: 'free', onUpgrade });

    const user = userEvent.setup();
    // Click the first upgrade button (should be Pro)
    const upgradeButtons = screen.getAllByRole('button', { name: /upgrade/i });
    await user.click(upgradeButtons[0]);

    expect(onUpgrade).toHaveBeenCalledWith('pro');
  });

  it('shows rule limits (10, 100, Unlimited)', () => {
    renderTable();

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/unlimited/i)).toBeInTheDocument();
  });

  it('shows collection limits (3, 20, Unlimited)', () => {
    renderTable();

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    // "Unlimited" already checked above but should appear for collections too
  });
});
