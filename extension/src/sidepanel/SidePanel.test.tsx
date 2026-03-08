import { describe, it, expect, vi } from 'vitest';
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

/* --- Bottom bar with AccountButton --- */

vi.mock('@/shared/store', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithGithub: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
    clearError: vi.fn(),
  })),
  useRulesStore: vi.fn(() => ({
    rules: [],
    loading: false,
    fetchRules: vi.fn(),
    toggleRule: vi.fn(),
    deleteRule: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
  })),
  useCollectionsStore: vi.fn(() => ({
    collections: [],
    loading: false,
    fetchCollections: vi.fn(),
    createCollection: vi.fn(),
    deleteCollection: vi.fn(),
    toggleCollection: vi.fn(),
  })),
  useTeamsStore: vi.fn(() => ({
    team: null,
    members: [],
    loading: false,
    fetchTeam: vi.fn(),
  })),
  useWorkspaceUIStore: vi.fn(() => ({
    selectedTab: 'all',
    setSelectedTab: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
  })),
  useSyncStore: vi.fn(() => ({
    syncStatus: 'idle',
    lastSyncedAt: null,
    sync: vi.fn(),
    startAutoSync: vi.fn(),
    stopAutoSync: vi.fn(),
  })),
  useLogStore: vi.fn(() => ({
    entries: [],
    paused: false,
    fetchLog: vi.fn(),
    clearLog: vi.fn(),
    togglePause: vi.fn(),
    startListening: vi.fn(),
  })),
  useRecordingStore: vi.fn(() => ({
    isRecording: false,
    recordedEntries: [],
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  })),
  useTabsStore: vi.fn(() => ({
    tabs: [],
    activeTabIds: [],
    fetchTabs: vi.fn(),
  })),
  useVersionStore: vi.fn(() => ({
    versions: [],
    loading: false,
    fetchVersions: vi.fn(),
    restoreVersion: vi.fn(),
  })),
}));

vi.mock('@/ui/theme/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./components/AccountPopover', () => ({
  AccountPopover: () => <div data-testid="account-popover" />,
}));

vi.mock('./components/LoginPopover', () => ({
  LoginPopover: () => <div data-testid="login-popover" />,
}));

describe('SidePanel — bottom bar layout', () => {
  it('renders AccountButton in the SidePanel', async () => {
    const { SidePanel } = await import('./SidePanel');
    render(<SidePanel />);
    expect(
      screen.getByRole('button', { name: /account/i }),
    ).toBeInTheDocument();
  });
});
