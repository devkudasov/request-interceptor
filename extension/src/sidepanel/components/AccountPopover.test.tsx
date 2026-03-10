import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AccountPopover } from './AccountPopover';
import type { AuthUser } from '@/shared/types';

const mockLogout = vi.fn();
const mockFetchUser = vi.fn();
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockLoginWithGithub = vi.fn();
const mockClearError = vi.fn();
const mockOnClose = vi.fn();
const mockNavigate = vi.fn();

let mockUser: AuthUser | null = null;

vi.mock('@/shared/store', () => ({
  useAuthStore: vi.fn(() => ({
    user: mockUser,
    loading: false,
    error: null,
    login: mockLogin,
    register: mockRegister,
    loginWithGoogle: mockLoginWithGoogle,
    loginWithGithub: mockLoginWithGithub,
    logout: mockLogout,
    fetchUser: mockFetchUser,
    clearError: mockClearError,
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const freeUser: AuthUser = {
  uid: 'user-1',
  email: 'alice@example.com',
  displayName: 'Alice Smith',
  photoURL: null,
  emailVerified: true,
  plan: 'free',
};

function renderPopover() {
  return render(
    <MemoryRouter>
      <AccountPopover onClose={mockOnClose} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = null;
});

describe('AccountPopover — logged in', () => {
  beforeEach(() => {
    mockUser = { ...freeUser };
  });

  it('renders user display name', () => {
    renderPopover();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders user email', () => {
    renderPopover();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders plan badge for free plan', () => {
    renderPopover();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders plan badge for pro plan', () => {
    mockUser = { ...freeUser, plan: 'pro' };
    renderPopover();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('renders plan badge for team plan', () => {
    mockUser = { ...freeUser, plan: 'team' };
    renderPopover();
    expect(screen.getByText('Team')).toBeInTheDocument();
  });

  it('renders StorageBar', () => {
    renderPopover();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders Logout button', () => {
    renderPopover();
    expect(
      screen.getByRole('button', { name: /logout/i }),
    ).toBeInTheDocument();
  });

  it('calls logout when Logout button is clicked', async () => {
    renderPopover();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders initials when no photoURL', () => {
    renderPopover();
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('renders avatar image when photoURL exists', () => {
    mockUser = { ...freeUser, photoURL: 'https://img.test/avatar.png' };
    renderPopover();
    const img = screen.getByAltText('Avatar');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.test/avatar.png');
  });

  it('renders Upgrade button for free plan', () => {
    renderPopover();
    expect(
      screen.getByRole('button', { name: /upgrade/i }),
    ).toBeInTheDocument();
  });

  it('does NOT render Upgrade button for pro plan', () => {
    mockUser = { ...freeUser, plan: 'pro' };
    renderPopover();
    expect(
      screen.queryByRole('button', { name: /upgrade/i }),
    ).not.toBeInTheDocument();
  });

  it('shows email verification warning when not verified', () => {
    mockUser = { ...freeUser, emailVerified: false };
    renderPopover();
    expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    renderPopover();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});

describe('AccountPopover — logged out', () => {
  it('renders AuthForm when no user', () => {
    renderPopover();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign\s*in/i }),
    ).toBeInTheDocument();
  });
});

describe('AccountPopover — billing navigation', () => {
  it('navigates to /billing when Upgrade Plan is clicked', async () => {
    mockUser = { ...freeUser };
    renderPopover();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /upgrade/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/billing');
  });

  it('shows Manage Plan button for pro users with active subscription', () => {
    mockUser = { ...freeUser, plan: 'pro', subscriptionStatus: 'active' };
    renderPopover();
    expect(
      screen.getByRole('button', { name: /manage plan/i }),
    ).toBeInTheDocument();
  });

  it('shows Manage Plan button for team users with active subscription', () => {
    mockUser = { ...freeUser, plan: 'team', subscriptionStatus: 'active' };
    renderPopover();
    expect(
      screen.getByRole('button', { name: /manage plan/i }),
    ).toBeInTheDocument();
  });

  it('navigates to /billing when Manage Plan is clicked', async () => {
    mockUser = { ...freeUser, plan: 'pro', subscriptionStatus: 'active' };
    renderPopover();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /manage plan/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/billing');
  });

  it('hides Manage Plan for free users', () => {
    mockUser = { ...freeUser };
    renderPopover();
    expect(
      screen.queryByRole('button', { name: /manage plan/i }),
    ).not.toBeInTheDocument();
  });
});
