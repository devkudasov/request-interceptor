import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm from './AuthForm';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthForm — Login mode', () => {
  it('renders email input field', () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
  });

  it('renders password input field', () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('renders login button', () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /log\s*in|sign\s*in/i })).toBeInTheDocument();
  });

  it('calls onSubmit with email and password on form submission', async () => {
    const onSubmit = vi.fn();
    render(<AuthForm mode="login" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /log\s*in|sign\s*in/i }));

    expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('renders OAuth buttons', () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} onGoogleSignIn={vi.fn()} onGithubSignIn={vi.fn()} />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
  });

  it('calls onGoogleSignIn when Google button is clicked', async () => {
    const onGoogleSignIn = vi.fn();
    render(<AuthForm mode="login" onSubmit={vi.fn()} onGoogleSignIn={onGoogleSignIn} />);

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(onGoogleSignIn).toHaveBeenCalled();
  });

  it('calls onGithubSignIn when GitHub button is clicked', async () => {
    const onGithubSignIn = vi.fn();
    render(<AuthForm mode="login" onSubmit={vi.fn()} onGithubSignIn={onGithubSignIn} />);

    await userEvent.click(screen.getByRole('button', { name: /continue with github/i }));

    expect(onGithubSignIn).toHaveBeenCalled();
  });

  it('displays error message when error prop is provided', () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} error="Invalid credentials" />);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('disables submit button when loading', () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} loading={true} />);

    expect(screen.getByRole('button', { name: /log\s*in|sign\s*in|loading/i })).toBeDisabled();
  });
});

describe('AuthForm — Register mode', () => {
  it('renders register button', () => {
    render(<AuthForm mode="register" onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /register|sign\s*up|create/i })).toBeInTheDocument();
  });

  it('renders email and password fields in register mode', () => {
    render(<AuthForm mode="register" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows validation error for weak password (min 8 chars)', async () => {
    const onSubmit = vi.fn();
    render(<AuthForm mode="register" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /register|sign\s*up|create/i }));

    expect(screen.getByText(/password.*8.*char|at least 8|too short/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid email and password', async () => {
    const onSubmit = vi.fn();
    render(<AuthForm mode="register" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /register|sign\s*up|create/i }));

    expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
