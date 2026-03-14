import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPopover } from './LoginPopover';

vi.mock('@/shared/store', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithGithub: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
    clearError: vi.fn(),
  })),
}));

const mockOnClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPopover', () => {
  it('renders AuthForm', () => {
    render(<LoginPopover onClose={mockOnClose} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign\s*in/i }),
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<LoginPopover onClose={mockOnClose} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
