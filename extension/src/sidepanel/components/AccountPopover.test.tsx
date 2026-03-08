import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const freeUser: AuthUser = {
  uid: 'user-1',
  email: 'alice@example.com',
  displayName: 'Alice Smith',
  photoURL: null,
  emailVerified: true,
  plan: 'free',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = null;
});

describe('AccountPopover — logged in', () => {
  beforeEach(() => {
    mockUser = { ...freeUser };
  });

  it('renders user display name', () => {
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders user email', () => {
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders plan badge for free plan', () => {
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders plan badge for pro plan', () => {
    mockUser = { ...freeUser, plan: 'pro' };
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('renders plan badge for team plan', () => {
    mockUser = { ...freeUser, plan: 'team' };
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByText('Team')).toBeInTheDocument();
  });

  it('renders StorageBar', () => {
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders Logout button', () => {
    render(<AccountPopover onClose={mockOnClose} />);
    expect(
      screen.getByRole('button', { name: /logout/i }),
    ).toBeInTheDocument();
  });

  it('calls logout when Logout button is clicked', async () => {
    render(<AccountPopover onClose={mockOnClose} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders initials when no photoURL', () => {
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('renders avatar image when photoURL exists', () => {
    mockUser = { ...freeUser, photoURL: 'https://img.test/avatar.png' };
    render(<AccountPopover onClose={mockOnClose} />);
    const img = screen.getByAltText('Avatar');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.test/avatar.png');
  });

  it('renders Upgrade button for free plan', () => {
    render(<AccountPopover onClose={mockOnClose} />);
    expect(
      screen.getByRole('button', { name: /upgrade/i }),
    ).toBeInTheDocument();
  });

  it('does NOT render Upgrade button for pro plan', () => {
    mockUser = { ...freeUser, plan: 'pro' };
    render(<AccountPopover onClose={mockOnClose} />);
    expect(
      screen.queryByRole('button', { name: /upgrade/i }),
    ).not.toBeInTheDocument();
  });

  it('shows email verification warning when not verified', () => {
    mockUser = { ...freeUser, emailVerified: false };
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<AccountPopover onClose={mockOnClose} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});

describe('AccountPopover — logged out', () => {
  it('renders AuthForm when no user', () => {
    render(<AccountPopover onClose={mockOnClose} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign\s*in/i }),
    ).toBeInTheDocument();
  });
});
