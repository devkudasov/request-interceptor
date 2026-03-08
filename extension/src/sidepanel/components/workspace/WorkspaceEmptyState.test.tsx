import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

describe('WorkspaceEmptyState', () => {
  it('renders empty state message', () => {
    render(<WorkspaceEmptyState onCreateRule={vi.fn()} onCreateCollection={vi.fn()} />);

    expect(screen.getByText(/no mock rules/i)).toBeInTheDocument();
  });

  it('renders Create Rule button', () => {
    render(<WorkspaceEmptyState onCreateRule={vi.fn()} onCreateCollection={vi.fn()} />);

    expect(screen.getByRole('button', { name: /create rule/i })).toBeInTheDocument();
  });

  it('renders Create Collection button', () => {
    render(<WorkspaceEmptyState onCreateRule={vi.fn()} onCreateCollection={vi.fn()} />);

    expect(screen.getByRole('button', { name: /create collection/i })).toBeInTheDocument();
  });

  it('calls onCreateRule when Create Rule is clicked', async () => {
    const user = userEvent.setup();
    const onCreateRule = vi.fn();
    render(<WorkspaceEmptyState onCreateRule={onCreateRule} onCreateCollection={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(onCreateRule).toHaveBeenCalled();
  });

  it('calls onCreateCollection when Create Collection is clicked', async () => {
    const user = userEvent.setup();
    const onCreateCollection = vi.fn();
    render(<WorkspaceEmptyState onCreateRule={vi.fn()} onCreateCollection={onCreateCollection} />);

    await user.click(screen.getByRole('button', { name: /create collection/i }));

    expect(onCreateCollection).toHaveBeenCalled();
  });

  it('renders helpful description text', () => {
    render(<WorkspaceEmptyState onCreateRule={vi.fn()} onCreateCollection={vi.fn()} />);

    expect(screen.getByText(/create your first rule/i)).toBeInTheDocument();
  });
});
