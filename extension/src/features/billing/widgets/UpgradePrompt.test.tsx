import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpgradePrompt } from './UpgradePrompt';

const defaultProps = {
  message: "You've reached the limit of 10 rules on the free plan.",
  onUpgrade: vi.fn(),
  onClose: vi.fn(),
};

function renderPrompt(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<UpgradePrompt {...props} />);
}

describe('UpgradePrompt', () => {
  it('renders message text', () => {
    renderPrompt();
    expect(
      screen.getByText("You've reached the limit of 10 rules on the free plan."),
    ).toBeInTheDocument();
  });

  it('renders Upgrade button', () => {
    renderPrompt();
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    renderPrompt();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onUpgrade when Upgrade clicked', async () => {
    const onUpgrade = vi.fn();
    renderPrompt({ onUpgrade });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /upgrade/i }));
    expect(onUpgrade).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel clicked', async () => {
    const onClose = vi.fn();
    renderPrompt({ onClose });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has alertdialog role', () => {
    renderPrompt();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
