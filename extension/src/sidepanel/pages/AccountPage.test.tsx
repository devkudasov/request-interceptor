import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountPage from './AccountPage';

// Mock the auth module
vi.mock('@/background/firebase-auth', () => ({
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithGithub: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}));

// Mock chrome APIs
vi.stubGlobal('chrome', {
  storage: {
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    local: {
      get: vi.fn(() => Promise.resolve({})),
      getBytesInUse: vi.fn(() => Promise.resolve(0)),
    },
  },
  runtime: {
    id: 'test-extension-id',
  },
});

const { signInWithEmail, registerWithEmail, signOut, getCurrentUser } =
  await import('@/background/firebase-auth');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AccountPage — logged out state', () => {
  beforeEach(() => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('renders login form with email and password fields', async () => {
    render(<AccountPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log\s*in|sign\s*in/i })).toBeInTheDocument();
  });

  it('renders OAuth buttons for Google and GitHub', async () => {
    render(<AccountPage />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
  });

  it('shows "Free features work without an account" note', async () => {
    render(<AccountPage />);

    expect(screen.getByText(/free features work without an account/i)).toBeInTheDocument();
  });

  it('shows error message on login failure', async () => {
    (signInWithEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('auth/invalid-credential')
    );

    render(<AccountPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /log\s*in|sign\s*in/i });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'wrongpassword');
    await userEvent.click(loginButton);

    expect(await screen.findByText(/invalid.*credential|login.*failed|incorrect/i)).toBeInTheDocument();
  });

  it('can switch to register form', async () => {
    render(<AccountPage />);

    const switchLink = screen.getByText(/create.*account|register|sign\s*up/i);
    await userEvent.click(switchLink);

    expect(screen.getByRole('button', { name: /register|sign\s*up|create/i })).toBeInTheDocument();
  });
});

describe('AccountPage — logged in state', () => {
  const mockUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    plan: 'free' as const,
  };

  beforeEach(() => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
  });

  it('shows user email when logged in', async () => {
    render(<AccountPage />);

    expect(await screen.findByText(/test@example\.com/)).toBeInTheDocument();
  });

  it('shows user plan when logged in', async () => {
    render(<AccountPage />);

    expect(await screen.findByText(/free/i)).toBeInTheDocument();
  });

  it('shows logout button when logged in', async () => {
    render(<AccountPage />);

    expect(await screen.findByRole('button', { name: /log\s*out|sign\s*out/i })).toBeInTheDocument();
  });

  it('calls signOut when logout button is clicked', async () => {
    (signOut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<AccountPage />);

    const logoutButton = await screen.findByRole('button', { name: /log\s*out|sign\s*out/i });
    await userEvent.click(logoutButton);

    expect(signOut).toHaveBeenCalled();
  });

  it('renders storage usage bar with percentage', async () => {
    render(<AccountPage />);

    // Look for a progress bar or storage indicator
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });
});
