import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WebSocketRuleEditor } from './WebSocketRuleEditor';
import type { WebSocketRuleFields } from './WebSocketRuleEditor';

const defaultFields: WebSocketRuleFields = {
  urlPattern: '',
  urlMatchType: 'wildcard',
  wsOnConnect: '',
  wsMessageRules: [],
};

describe('WebSocketRuleEditor', () => {
  it('renders WS label instead of method dropdown', () => {
    render(<WebSocketRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByText('WS')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /http method/i })).not.toBeInTheDocument();
  });

  it('renders URL input', () => {
    render(<WebSocketRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: /url pattern/i })).toBeInTheDocument();
  });

  it('renders WebSocket Mock section', () => {
    render(<WebSocketRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByText(/websocket mock/i)).toBeInTheDocument();
  });

  it('renders on connect message textarea', () => {
    render(<WebSocketRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByText(/on connect message/i)).toBeInTheDocument();
  });

  it('renders add message rule button', () => {
    render(<WebSocketRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add message rule/i })).toBeInTheDocument();
  });

  it('calls onChange when URL is typed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WebSocketRuleEditor fields={defaultFields} onChange={onChange} />);

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), 'wss://');

    expect(onChange).toHaveBeenCalled();
  });

  it('adds message rule when button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WebSocketRuleEditor fields={defaultFields} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /add message rule/i }));

    expect(onChange).toHaveBeenCalledWith({
      wsMessageRules: [{ match: '', respond: '', delay: 0 }],
    });
  });
});
