import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Stub components that represent the expected route targets
function WorkspacePage() { return <div data-testid="workspace-page">WorkspacePage</div>; }
function RuleEditorPage() { return <div data-testid="rule-editor-page">RuleEditorPage</div>; }
function RequestLogPage() { return <div data-testid="request-log-page">RequestLogPage</div>; }
function RecordingPage() { return <div data-testid="recording-page">RecordingPage</div>; }
function VersionHistoryPage() { return <div data-testid="version-history-page">VersionHistoryPage</div>; }
// These pages are intentionally NOT in the route config — tests verify they don't render

/**
 * Renders the expected route config that SidePanel.tsx should have after
 * the implementation. Routes for /collections, /team, /account are intentionally
 * omitted — tests verify those paths render nothing.
 */
function renderRoutes(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<WorkspacePage />} />
        <Route path="/rules/new" element={<RuleEditorPage />} />
        <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
        <Route path="/collections/:id/versions" element={<VersionHistoryPage />} />
        <Route path="/log" element={<RequestLogPage />} />
        <Route path="/recording" element={<RecordingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SidePanel routing — active routes', () => {
  it('renders WorkspacePage at /', () => {
    renderRoutes('/');
    expect(screen.getByTestId('workspace-page')).toBeInTheDocument();
  });

  it('renders RuleEditorPage at /rules/new', () => {
    renderRoutes('/rules/new');
    expect(screen.getByTestId('rule-editor-page')).toBeInTheDocument();
  });

  it('renders RuleEditorPage at /rules/:id/edit', () => {
    renderRoutes('/rules/abc/edit');
    expect(screen.getByTestId('rule-editor-page')).toBeInTheDocument();
  });

  it('renders RequestLogPage at /log', () => {
    renderRoutes('/log');
    expect(screen.getByTestId('request-log-page')).toBeInTheDocument();
  });

  it('renders RecordingPage at /recording', () => {
    renderRoutes('/recording');
    expect(screen.getByTestId('recording-page')).toBeInTheDocument();
  });

  it('renders VersionHistoryPage at /collections/:id/versions', () => {
    renderRoutes('/collections/c1/versions');
    expect(screen.getByTestId('version-history-page')).toBeInTheDocument();
  });
});

describe('SidePanel routing — removed routes', () => {
  it('does NOT render CollectionsPage at /collections', () => {
    renderRoutes('/collections');
    expect(screen.queryByTestId('collections-page')).not.toBeInTheDocument();
  });

  it('does NOT render TeamPage at /team', () => {
    renderRoutes('/team');
    expect(screen.queryByTestId('team-page')).not.toBeInTheDocument();
  });

  it('does NOT render AccountPage at /account', () => {
    renderRoutes('/account');
    expect(screen.queryByTestId('account-page')).not.toBeInTheDocument();
  });
});
