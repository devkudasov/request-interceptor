import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountButton } from './AccountButton';
import type { AuthUser } from '@/features/auth';

const mockLogout = vi.fn();
const mockFetchUser = vi.fn();

let mockUser: AuthUser | null = null;
let mockLoading = false;

vi.mock('@/features/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: mockUser,
    loading: mockLoading,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithGithub: vi.fn(),
    logout: mockLogout,
    fetchUser: mockFetchUser,
    clearError: vi.fn(),
  })),
}));

vi.mock('./AccountPopover', () => ({
  AccountPopover: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="account-popover">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./LoginPopover', () => ({
  LoginPopover: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="login-popover">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const loggedInUser: AuthUser = {
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
  mockLoading = false;
});

describe('AccountButton — rendering', () => {
  it('renders a button with accessible label', () => {
    render(<AccountButton />);
    expect(
      screen.getByRole('button', { name: /account/i }),
    ).toBeInTheDocument();
  });

  it('shows user initials when logged in without photoURL', () => {
    mockUser = { ...loggedInUser };
    render(<AccountButton />);
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('shows avatar image when logged in with photoURL', () => {
    mockUser = { ...loggedInUser, photoURL: 'https://img.test/photo.png' };
    render(<AccountButton />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://img.test/photo.png');
  });

  it('shows generic icon when logged out', () => {
    render(<AccountButton />);
    const btn = screen.getByRole('button', { name: /account/i });
    // Should not have initials or an avatar image
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(btn).toBeInTheDocument();
  });

  it('does NOT render AccountPopover initially', () => {
    mockUser = { ...loggedInUser };
    render(<AccountButton />);
    expect(
      screen.queryByTestId('account-popover'),
    ).not.toBeInTheDocument();
  });
});

describe('AccountButton — interactions', () => {
  it('opens AccountPopover on click when logged in', async () => {
    mockUser = { ...loggedInUser };
    render(<AccountButton />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByTestId('account-popover')).toBeInTheDocument();
  });

  it('opens LoginPopover on click when logged out', async () => {
    render(<AccountButton />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByTestId('login-popover')).toBeInTheDocument();
  });

  it('closes popover on second click (toggle)', async () => {
    mockUser = { ...loggedInUser };
    render(<AccountButton />);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /account/i });
    await user.click(btn);
    expect(screen.getByTestId('account-popover')).toBeInTheDocument();
    await user.click(btn);
    expect(
      screen.queryByTestId('account-popover'),
    ).not.toBeInTheDocument();
  });

  it('closes popover on Escape key', async () => {
    mockUser = { ...loggedInUser };
    render(<AccountButton />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByTestId('account-popover')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      screen.queryByTestId('account-popover'),
    ).not.toBeInTheDocument();
  });
});
