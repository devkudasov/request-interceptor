import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomBar } from './BottomBar';

// Mock AccountButton so we can verify it renders
vi.mock('./AccountButton', () => ({
  AccountButton: () => <div data-testid="account-button">Account</div>,
}));

function renderBar(props: Partial<React.ComponentProps<typeof BottomBar>> = {}) {
  const defaultProps = { onToggleLog: vi.fn(), logUnseenCount: 0 };
  return render(<BottomBar {...defaultProps} {...props} />);
}

describe('BottomBar', () => {
  it('renders log toggle button with text "Log"', () => {
    renderBar();
    expect(screen.getByText('Log')).toBeInTheDocument();
  });

  it('renders AccountButton on the right side', () => {
    renderBar();
    expect(screen.getByTestId('account-button')).toBeInTheDocument();
  });

  it('shows unseen count badge when there are new log entries', () => {
    renderBar({ logUnseenCount: 3 });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows 99+ when unseen count exceeds 99', () => {
    renderBar({ logUnseenCount: 150 });
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('hides badge when count is 0', () => {
    renderBar({ logUnseenCount: 0 });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('calls onToggleLog when Log button is clicked', async () => {
    const onToggleLog = vi.fn();
    const user = userEvent.setup();
    renderBar({ onToggleLog });

    await user.click(screen.getByText('Log'));
    expect(onToggleLog).toHaveBeenCalledTimes(1);
  });

  it('has aria-label on log button', () => {
    renderBar();
    const btn = screen.getByRole('button', { name: /log/i });
    expect(btn).toHaveAttribute('aria-label');
  });

  it('sets aria-expanded based on log panel state', () => {
    renderBar({ logUnseenCount: 0 });
    const btn = screen.getByRole('button', { name: /log/i });
    expect(btn).toHaveAttribute('aria-expanded');
  });
});
