import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogToolbar } from './LogToolbar';

function renderToolbar(overrides: Partial<Parameters<typeof LogToolbar>[0]> = {}) {
  const props = {
    paused: false,
    onTogglePause: vi.fn(),
    onClear: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<LogToolbar {...props} />);
  return props;
}

describe('LogToolbar', () => {
  it('renders Pause button when not paused', () => {
    renderToolbar();
    expect(
      screen.getByRole('button', { name: /pause/i }),
    ).toBeInTheDocument();
  });

  it('renders Resume button when paused', () => {
    renderToolbar({ paused: true });
    expect(
      screen.getByRole('button', { name: /resume/i }),
    ).toBeInTheDocument();
  });

  it('calls onTogglePause when Pause is clicked', async () => {
    const user = userEvent.setup();
    const props = renderToolbar();

    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(props.onTogglePause).toHaveBeenCalledTimes(1);
  });

  it('renders Clear button', () => {
    renderToolbar();
    expect(
      screen.getByRole('button', { name: /clear/i }),
    ).toBeInTheDocument();
  });

  it('renders Close button', () => {
    renderToolbar();
    expect(
      screen.getByRole('button', { name: /close/i }),
    ).toBeInTheDocument();
  });

  it('calls onClose when Close is clicked', async () => {
    const user = userEvent.setup();
    const props = renderToolbar();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
