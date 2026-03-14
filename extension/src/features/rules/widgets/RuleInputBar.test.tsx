import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleInputBar } from './RuleInputBar';
import type { HttpMethod, UrlMatchType } from '@/features/rules';

const defaultProps = {
  method: 'GET' as HttpMethod | 'ANY',
  onMethodChange: vi.fn(),
  urlPattern: '',
  onUrlPatternChange: vi.fn(),
  urlMatchType: 'wildcard' as UrlMatchType,
  onUrlMatchTypeChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RuleInputBar — rendering', () => {
  it('renders method dropdown, URL input, and match type dropdown', () => {
    render(<RuleInputBar {...defaultProps} />);

    // Method button
    expect(screen.getByRole('button', { name: /http method/i })).toBeInTheDocument();
    // URL input
    expect(screen.getByRole('textbox', { name: /url pattern/i })).toBeInTheDocument();
    // Match type button
    expect(screen.getByRole('button', { name: /url match type/i })).toBeInTheDocument();
  });

  it('displays current method value', () => {
    render(<RuleInputBar {...defaultProps} method="POST" />);

    expect(screen.getByRole('button', { name: /http method/i })).toHaveTextContent('POST');
  });

  it('displays current URL pattern value', () => {
    render(<RuleInputBar {...defaultProps} urlPattern="/api/users" />);

    expect(screen.getByRole('textbox', { name: /url pattern/i })).toHaveValue('/api/users');
  });

  it('displays current match type value', () => {
    render(<RuleInputBar {...defaultProps} urlMatchType="exact" />);

    expect(screen.getByRole('button', { name: /url match type/i })).toHaveTextContent(/exact/i);
  });

  it('shows placeholder text on empty URL input', () => {
    render(<RuleInputBar {...defaultProps} />);

    expect(screen.getByRole('textbox', { name: /url pattern/i })).toHaveAttribute(
      'placeholder',
      expect.stringContaining('URL'),
    );
  });

  it('wraps components in a group with aria-label', () => {
    render(<RuleInputBar {...defaultProps} />);

    expect(screen.getByRole('group', { name: /request url configuration/i })).toBeInTheDocument();
  });
});

describe('RuleInputBar — method interaction', () => {
  it('calls onMethodChange when method is changed', async () => {
    const user = userEvent.setup();
    const onMethodChange = vi.fn();
    render(<RuleInputBar {...defaultProps} onMethodChange={onMethodChange} />);

    await user.click(screen.getByRole('button', { name: /http method/i }));
    await user.click(screen.getByRole('option', { name: 'PUT' }));

    expect(onMethodChange).toHaveBeenCalledWith('PUT');
  });
});

describe('RuleInputBar — URL input interaction', () => {
  it('calls onUrlPatternChange when URL is typed', async () => {
    const user = userEvent.setup();
    const onUrlPatternChange = vi.fn();
    render(<RuleInputBar {...defaultProps} onUrlPatternChange={onUrlPatternChange} />);

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), '/api');

    expect(onUrlPatternChange).toHaveBeenCalled();
  });

  it('URL input receives focus by default when autoFocus is set', () => {
    render(<RuleInputBar {...defaultProps} autoFocusUrl />);

    expect(screen.getByRole('textbox', { name: /url pattern/i })).toHaveFocus();
  });
});

describe('RuleInputBar — match type interaction', () => {
  it('calls onUrlMatchTypeChange when match type is changed', async () => {
    const user = userEvent.setup();
    const onUrlMatchTypeChange = vi.fn();
    render(<RuleInputBar {...defaultProps} onUrlMatchTypeChange={onUrlMatchTypeChange} />);

    await user.click(screen.getByRole('button', { name: /url match type/i }));
    await user.click(screen.getByRole('option', { name: /regex/i }));

    expect(onUrlMatchTypeChange).toHaveBeenCalledWith('regex');
  });
});

describe('RuleInputBar — WebSocket mode', () => {
  it('hides method dropdown when requestType is websocket', () => {
    render(<RuleInputBar {...defaultProps} requestType="websocket" />);

    expect(screen.queryByRole('button', { name: /http method/i })).not.toBeInTheDocument();
  });

  it('shows WS label instead of method dropdown for websocket', () => {
    render(<RuleInputBar {...defaultProps} requestType="websocket" />);

    expect(screen.getByText('WS')).toBeInTheDocument();
  });

  it('still shows URL input and match type for websocket', () => {
    render(<RuleInputBar {...defaultProps} requestType="websocket" />);

    expect(screen.getByRole('textbox', { name: /url pattern/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /url match type/i })).toBeInTheDocument();
  });
});

describe('RuleInputBar — disabled state', () => {
  it('disables all inputs when disabled', () => {
    render(<RuleInputBar {...defaultProps} disabled />);

    expect(screen.getByRole('button', { name: /http method/i })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /url pattern/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /url match type/i })).toBeDisabled();
  });
});

describe('RuleInputBar — error state', () => {
  it('shows error message when urlError is provided', () => {
    render(<RuleInputBar {...defaultProps} urlError="URL pattern is required" />);

    expect(screen.getByText('URL pattern is required')).toBeInTheDocument();
  });

  it('does not show error when urlError is not provided', () => {
    render(<RuleInputBar {...defaultProps} />);

    expect(screen.queryByText('URL pattern is required')).not.toBeInTheDocument();
  });
});

describe('RuleInputBar — keyboard navigation', () => {
  it('Tab moves from method to URL input to match type', async () => {
    const user = userEvent.setup();
    render(<RuleInputBar {...defaultProps} />);

    // Focus method button
    await user.tab();
    expect(screen.getByRole('button', { name: /http method/i })).toHaveFocus();

    // Tab to URL input
    await user.tab();
    expect(screen.getByRole('textbox', { name: /url pattern/i })).toHaveFocus();

    // Tab to match type button
    await user.tab();
    expect(screen.getByRole('button', { name: /url match type/i })).toHaveFocus();
  });
});
