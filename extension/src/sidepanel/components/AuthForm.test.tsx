import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthForm } from './AuthForm';

// Mock the auth store
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockLoginWithGithub = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/shared/store', () => ({
  useAuthStore: vi.fn(() => ({
    loading: false,
    error: null,
    login: mockLogin,
    register: mockRegister,
    loginWithGoogle: mockLoginWithGoogle,
    loginWithGithub: mockLoginWithGithub,
    clearError: mockClearError,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthForm — Login mode', () => {
  it('renders email input field', () => {
    render(<AuthForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
  });

  it('renders password input field', () => {
    render(<AuthForm />);

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('renders sign in button', () => {
    render(<AuthForm />);

    expect(screen.getByRole('button', { name: /sign\s*in/i })).toBeInTheDocument();
  });

  it('calls login with email and password on form submission', async () => {
    render(<AuthForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign\s*in/i }));

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('renders OAuth buttons', () => {
    render(<AuthForm />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
  });

  it('calls loginWithGoogle when Google button is clicked', async () => {
    render(<AuthForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(mockLoginWithGoogle).toHaveBeenCalled();
  });

  it('calls loginWithGithub when GitHub button is clicked', async () => {
    render(<AuthForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /continue with github/i }));

    expect(mockLoginWithGithub).toHaveBeenCalled();
  });

  it('displays "Free features work without an account" note', () => {
    render(<AuthForm />);

    expect(screen.getByText(/free features work without an account/i)).toBeInTheDocument();
  });
});

describe('AuthForm — Register mode', () => {
  it('switches to register mode when toggle is clicked', async () => {
    render(<AuthForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation error for weak password on blur', async () => {
    render(<AuthForm />);
    const user = userEvent.setup();

    // Switch to register mode
    await user.click(screen.getByRole('button', { name: /register/i }));

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'short');
    await user.tab(); // trigger blur

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('calls register with valid email and password', async () => {
    render(<AuthForm />);
    const user = userEvent.setup();

    // Switch to register mode
    await user.click(screen.getByRole('button', { name: /register/i }));

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
