import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Navigation } from './Navigation';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderNav(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Navigation />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Navigation — tab rendering', () => {
  it('renders exactly 3 tabs: Workspace, Log, Record', () => {
    renderNav();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
    expect(screen.getByText('Record')).toBeInTheDocument();
  });

  it('does NOT render Rules tab', () => {
    renderNav();
    expect(screen.queryByText('Rules')).not.toBeInTheDocument();
  });

  it('does NOT render Collections tab', () => {
    renderNav();
    expect(screen.queryByText('Collections')).not.toBeInTheDocument();
  });

  it('does NOT render Team tab', () => {
    renderNav();
    expect(screen.queryByText('Team')).not.toBeInTheDocument();
  });

  it('does NOT render Account tab', () => {
    renderNav();
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
  });
});

describe('Navigation — active state and navigation', () => {
  it('Workspace tab is active by default at /', () => {
    renderNav('/');
    const workspaceBtn = screen.getByText('Workspace');
    expect(workspaceBtn.className).toContain('border-primary');
  });

  it('clicking Log navigates to /log', async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByText('Log'));
    expect(mockNavigate).toHaveBeenCalledWith('/log');
  });

  it('clicking Record navigates to /recording', async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByText('Record'));
    expect(mockNavigate).toHaveBeenCalledWith('/recording');
  });
});
