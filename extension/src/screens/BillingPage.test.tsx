import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AuthUser } from '@/features/auth';

const mockCreateCheckoutSession = vi.fn();
const mockCreatePortalSession = vi.fn();

let mockAuthState: {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

let mockBillingState: {
  loading: boolean;
  error: string | null;
  createCheckoutSession: typeof mockCreateCheckoutSession;
  createPortalSession: typeof mockCreatePortalSession;
};

vi.mock('@/features/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthState),
}));

vi.mock('@/features/billing', () => ({
  useBillingStore: vi.fn(() => mockBillingState),
}));

import { BillingPage } from './BillingPage';

const defaultUser: AuthUser = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  plan: 'free',
  subscriptionStatus: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthState = {
    user: { ...defaultUser },
    loading: false,
    error: null,
  };
  mockBillingState = {
    loading: false,
    error: null,
    createCheckoutSession: mockCreateCheckoutSession,
    createPortalSession: mockCreatePortalSession,
  };
});

describe('BillingPage', () => {
  it('renders page title "Billing"', () => {
    render(<BillingPage />);

    expect(screen.getByText(/billing/i)).toBeInTheDocument();
  });

  it('renders PlanCard with user current plan', () => {
    mockAuthState.user = { ...defaultUser, plan: 'pro', subscriptionStatus: 'active' };

    render(<BillingPage />);

    // PlanCard should show the user's plan
    expect(screen.getByText(/pro/i)).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('renders PlanComparisonTable', () => {
    render(<BillingPage />);

    // The comparison table should show all three plans
    expect(screen.getByText(/free/i)).toBeInTheDocument();
    // "Pro" and "Team" should be visible in the comparison table
    expect(screen.getByText(/pro/i)).toBeInTheDocument();
    expect(screen.getByText(/team/i)).toBeInTheDocument();
  });

  it('shows loading state when billing store is loading', () => {
    mockBillingState.loading = true;

    render(<BillingPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error message when billing store has error', () => {
    mockBillingState.error = 'Payment processing failed';

    render(<BillingPage />);

    expect(screen.getByText(/payment processing failed/i)).toBeInTheDocument();
  });
});
