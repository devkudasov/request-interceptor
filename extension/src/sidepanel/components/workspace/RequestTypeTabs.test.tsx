import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestTypeTabs } from './RequestTypeTabs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RequestTypeTabs — rendering', () => {
  it('renders three tabs: HTTP, WebSocket, GraphQL', () => {
    render(<RequestTypeTabs active="http" onChange={vi.fn()} counts={{ http: 0, websocket: 0, graphql: 0 }} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });

  it('shows HTTP tab label', () => {
    render(<RequestTypeTabs active="http" onChange={vi.fn()} counts={{ http: 5, websocket: 0, graphql: 0 }} />);

    expect(screen.getByRole('tab', { name: /http/i })).toBeInTheDocument();
  });

  it('shows WebSocket tab label', () => {
    render(<RequestTypeTabs active="http" onChange={vi.fn()} counts={{ http: 0, websocket: 3, graphql: 0 }} />);

    expect(screen.getByRole('tab', { name: /websocket/i })).toBeInTheDocument();
  });

  it('shows GraphQL tab label', () => {
    render(<RequestTypeTabs active="http" onChange={vi.fn()} counts={{ http: 0, websocket: 0, graphql: 2 }} />);

    expect(screen.getByRole('tab', { name: /graphql/i })).toBeInTheDocument();
  });

  it('has aria-label on tablist', () => {
    render(<RequestTypeTabs active="http" onChange={vi.fn()} counts={{ http: 0, websocket: 0, graphql: 0 }} />);

    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Filter by request type');
  });
});

describe('RequestTypeTabs — active state', () => {
  it('marks HTTP tab as selected when active is http', () => {
    render(<RequestTypeTabs active="http" onChange={vi.fn()} counts={{ http: 5, websocket: 0, graphql: 0 }} />);

    expect(screen.getByRole('tab', { name: /http/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /websocket/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /graphql/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('marks WebSocket tab as selected when active is websocket', () => {
    render(<RequestTypeTabs active="websocket" onChange={vi.fn()} counts={{ http: 0, websocket: 3, graphql: 0 }} />);

    expect(screen.getByRole('tab', { name: /websocket/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('marks GraphQL tab as selected when active is graphql', () => {
    render(<RequestTypeTabs active="graphql" onChange={vi.fn()} counts={{ http: 0, websocket: 0, graphql: 2 }} />);

    expect(screen.getByRole('tab', { name: /graphql/i })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('RequestTypeTabs — counts', () => {
  it('shows count badge for tabs with rules', () => {
    render(<RequestTypeTabs active="http" onChange={vi.fn()} counts={{ http: 12, websocket: 3, graphql: 5 }} />);

    expect(screen.getByRole('tab', { name: /http, 12 rules/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /websocket, 3 rules/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /graphql, 5 rules/i })).toBeInTheDocument();
  });

  it('does not show count when count is 0', () => {
    render(<RequestTypeTabs active="http" onChange={vi.fn()} counts={{ http: 5, websocket: 0, graphql: 0 }} />);

    // WebSocket and GraphQL tabs should not have count text
    const wsTab = screen.getByRole('tab', { name: /websocket/i });
    expect(wsTab.textContent).not.toMatch(/\d/);
  });
});

describe('RequestTypeTabs — interaction', () => {
  it('calls onChange with "websocket" when WebSocket tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RequestTypeTabs active="http" onChange={onChange} counts={{ http: 5, websocket: 3, graphql: 0 }} />);

    await user.click(screen.getByRole('tab', { name: /websocket/i }));

    expect(onChange).toHaveBeenCalledWith('websocket');
  });

  it('calls onChange with "graphql" when GraphQL tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RequestTypeTabs active="http" onChange={onChange} counts={{ http: 5, websocket: 0, graphql: 2 }} />);

    await user.click(screen.getByRole('tab', { name: /graphql/i }));

    expect(onChange).toHaveBeenCalledWith('graphql');
  });

  it('calls onChange with "http" when HTTP tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RequestTypeTabs active="websocket" onChange={onChange} counts={{ http: 5, websocket: 3, graphql: 0 }} />);

    await user.click(screen.getByRole('tab', { name: /http/i }));

    expect(onChange).toHaveBeenCalledWith('http');
  });
});

describe('RequestTypeTabs — keyboard navigation', () => {
  it('ArrowRight moves to next tab', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RequestTypeTabs active="http" onChange={onChange} counts={{ http: 5, websocket: 3, graphql: 2 }} />);

    // Focus the active tab
    screen.getByRole('tab', { name: /http/i }).focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('websocket');
  });

  it('ArrowLeft moves to previous tab', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RequestTypeTabs active="websocket" onChange={onChange} counts={{ http: 5, websocket: 3, graphql: 2 }} />);

    screen.getByRole('tab', { name: /websocket/i }).focus();
    await user.keyboard('{ArrowLeft}');

    expect(onChange).toHaveBeenCalledWith('http');
  });

  it('ArrowRight wraps from last to first', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RequestTypeTabs active="graphql" onChange={onChange} counts={{ http: 5, websocket: 3, graphql: 2 }} />);

    screen.getByRole('tab', { name: /graphql/i }).focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('http');
  });
});
