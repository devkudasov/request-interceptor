import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamHeader } from './TeamHeader';

describe('TeamHeader', () => {
  it('renders team name', () => {
    render(
      <TeamHeader teamName="Acme Corp" memberCount={3} expanded={false} onToggle={vi.fn()} />,
    );

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders member count badge', () => {
    render(
      <TeamHeader teamName="Acme Corp" memberCount={5} expanded={false} onToggle={vi.fn()} />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <TeamHeader teamName="Acme Corp" memberCount={3} expanded={false} onToggle={onToggle} />,
    );

    await user.click(screen.getByRole('button', { name: /team/i }));

    expect(onToggle).toHaveBeenCalled();
  });

  it('shows expand indicator when collapsed', () => {
    render(
      <TeamHeader teamName="Acme Corp" memberCount={3} expanded={false} onToggle={vi.fn()} />,
    );

    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('shows collapse indicator when expanded', () => {
    render(
      <TeamHeader teamName="Acme Corp" memberCount={3} expanded={true} onToggle={vi.fn()} />,
    );

    expect(screen.getByText('▼')).toBeInTheDocument();
  });
});
