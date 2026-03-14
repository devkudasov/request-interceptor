import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchTypeDropdown } from './MatchTypeDropdown';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MatchTypeDropdown — rendering', () => {
  it('renders with wildcard label', () => {
    render(<MatchTypeDropdown value="wildcard" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveTextContent(/wild/i);
  });

  it('renders with exact label', () => {
    render(<MatchTypeDropdown value="exact" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveTextContent(/exact/i);
  });

  it('renders with regex label', () => {
    render(<MatchTypeDropdown value="regex" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveTextContent(/regex/i);
  });

  it('has aria-label for accessibility', () => {
    render(<MatchTypeDropdown value="wildcard" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'URL match type');
  });

  it('has aria-expanded=false when closed', () => {
    render(<MatchTypeDropdown value="wildcard" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('MatchTypeDropdown — interaction', () => {
  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<MatchTypeDropdown value="wildcard" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows all match types in dropdown', async () => {
    const user = userEvent.setup();
    render(<MatchTypeDropdown value="wildcard" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    const text = options.map((opt) => opt.textContent ?? '').join(' ').toLowerCase();
    expect(text).toContain('wild');
    expect(text).toContain('exact');
    expect(text).toContain('regex');
  });

  it('marks current value as selected', async () => {
    const user = userEvent.setup();
    render(<MatchTypeDropdown value="exact" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    const selectedOption = screen.getByRole('option', { selected: true });
    expect(selectedOption).toHaveTextContent(/exact/i);
  });

  it('calls onChange with new match type when option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MatchTypeDropdown value="wildcard" onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: /regex/i }));

    expect(onChange).toHaveBeenCalledWith('regex');
  });

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup();
    render(<MatchTypeDropdown value="wildcard" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: /exact/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown on Escape key', async () => {
    const user = userEvent.setup();
    render(<MatchTypeDropdown value="wildcard" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('MatchTypeDropdown — disabled state', () => {
  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<MatchTypeDropdown value="wildcard" onChange={vi.fn()} disabled />);

    await user.click(screen.getByRole('button'));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
