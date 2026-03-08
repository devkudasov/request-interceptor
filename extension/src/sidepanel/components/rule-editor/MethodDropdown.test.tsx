import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MethodDropdown } from './MethodDropdown';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MethodDropdown — rendering', () => {
  it('renders with the selected method label', () => {
    render(<MethodDropdown value="GET" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveTextContent('GET');
  });

  it('renders with POST value', () => {
    render(<MethodDropdown value="POST" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveTextContent('POST');
  });

  it('renders with ANY value', () => {
    render(<MethodDropdown value="ANY" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveTextContent('ANY');
  });

  it('has aria-label for accessibility', () => {
    render(<MethodDropdown value="GET" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'HTTP method');
  });

  it('has aria-expanded=false when closed', () => {
    render(<MethodDropdown value="GET" onChange={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('MethodDropdown — interaction', () => {
  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<MethodDropdown value="GET" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows all HTTP methods in dropdown', async () => {
    const user = userEvent.setup();
    render(<MethodDropdown value="GET" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    const options = screen.getAllByRole('option');
    const labels = options.map((opt) => opt.textContent);
    expect(labels).toContain('GET');
    expect(labels).toContain('POST');
    expect(labels).toContain('PUT');
    expect(labels).toContain('PATCH');
    expect(labels).toContain('DELETE');
    expect(labels).toContain('HEAD');
    expect(labels).toContain('OPTIONS');
    expect(labels).toContain('ANY');
  });

  it('marks current value as selected', async () => {
    const user = userEvent.setup();
    render(<MethodDropdown value="POST" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    const selectedOption = screen.getByRole('option', { selected: true });
    expect(selectedOption).toHaveTextContent('POST');
  });

  it('calls onChange with new method when option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MethodDropdown value="GET" onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'PUT' }));

    expect(onChange).toHaveBeenCalledWith('PUT');
  });

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup();
    render(<MethodDropdown value="GET" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'POST' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes dropdown on Escape key', async () => {
    const user = userEvent.setup();
    render(<MethodDropdown value="GET" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates options with arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MethodDropdown value="GET" onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalled();
  });
});

describe('MethodDropdown — disabled state', () => {
  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<MethodDropdown value="GET" onChange={vi.fn()} disabled />);

    await user.click(screen.getByRole('button'));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('button has disabled attribute', () => {
    render(<MethodDropdown value="GET" onChange={vi.fn()} disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
