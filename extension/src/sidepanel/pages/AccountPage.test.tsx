import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPage } from './AccountPage';
import type { AuthUser } from '@/shared/types';

const mockLogout = vi.fn();
const mockFetchUser = vi.fn();
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockLoginWithGithub = vi.fn();
const mockClearError = vi.fn();

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

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = null;
});

describe('AccountPage — logged out state', () => {
  it('renders login form with email and password fields', () => {
    render(<AccountPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign\s*in/i })).toBeInTheDocument();
  });

  it('renders OAuth buttons for Google and GitHub', () => {
    render(<AccountPage />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
  });

  it('shows "Free features work without an account" note', () => {
    render(<AccountPage />);

    expect(screen.getByText(/free features work without an account/i)).toBeInTheDocument();
  });
});

describe('AccountPage — logged in state', () => {
  beforeEach(() => {
    mockUser = {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
      emailVerified: true,
      plan: 'free',
    };
  });

  it('shows user email when logged in', () => {
    render(<AccountPage />);

    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
  });

  it('shows user plan when logged in', () => {
    render(<AccountPage />);

    expect(screen.getByText(/free/i)).toBeInTheDocument();
  });

  it('shows logout button when logged in', () => {
    render(<AccountPage />);

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', async () => {
    render(<AccountPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders storage usage bar', () => {
    render(<AccountPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
