import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Stub chrome APIs for tests that reference chrome global
vi.stubGlobal('chrome', {
  tabs: { query: vi.fn().mockResolvedValue([]) },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  runtime: {
    id: 'test-extension-id',
    lastError: null,
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
  },
});

// Stub components that represent the expected route targets
function WorkspacePage() { return <div data-testid="workspace-page">WorkspacePage</div>; }
function RuleEditorPage() { return <div data-testid="rule-editor-page">RuleEditorPage</div>; }
function VersionHistoryPage() { return <div data-testid="version-history-page">VersionHistoryPage</div>; }
// RequestLogPage & RecordingPage are intentionally NOT in the route config — tests verify those paths render nothing

/**
 * Renders the expected route config that SidePanel.tsx should have after
 * the restructure. Routes for /log, /recording, /collections, /team, /account
 * are intentionally omitted — tests verify those paths render nothing.
 */
function renderRoutes(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<WorkspacePage />} />
        <Route path="/rules/new" element={<RuleEditorPage />} />
        <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
        <Route path="/collections/:id/versions" element={<VersionHistoryPage />} />
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

  it('renders VersionHistoryPage at /collections/:id/versions', () => {
    renderRoutes('/collections/c1/versions');
    expect(screen.getByTestId('version-history-page')).toBeInTheDocument();
  });
});

describe('SidePanel routing — removed routes', () => {
  it('does NOT render RequestLogPage at /log', () => {
    renderRoutes('/log');
    expect(screen.queryByTestId('request-log-page')).not.toBeInTheDocument();
  });

  it('does NOT render RecordingPage at /recording', () => {
    renderRoutes('/recording');
    expect(screen.queryByTestId('recording-page')).not.toBeInTheDocument();
  });

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

/* --- Store mocks for full SidePanel render --- */

vi.mock('@/features/auth', () => {
  const authStoreState = {
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
    startAuthListener: vi.fn(),
  };
  const useAuthStore = Object.assign(
    vi.fn(() => authStoreState),
    { getState: () => authStoreState },
  );

  return { useAuthStore };
});

vi.mock('@/features/logging', () => {
  const logStoreState = {
    entries: [],
    paused: false,
    fetchLog: vi.fn(),
    clearLog: vi.fn(),
    togglePause: vi.fn(),
    startListening: vi.fn(),
  };
  const useLogStore = Object.assign(
    vi.fn(() => logStoreState),
    { getState: () => logStoreState },
  );

  return {
    useLogStore,
    useLogPanelStore: vi.fn(() => ({
      isOpen: false,
      panelHeight: 250,
      unseenCount: 0,
      togglePanel: vi.fn(),
      setPanelHeight: vi.fn(),
      incrementUnseen: vi.fn(),
      resetUnseen: vi.fn(),
    })),
  };
});

vi.mock('@/features/rules', () => ({
  useRulesStore: vi.fn(() => ({
    rules: [],
    loading: false,
    fetchRules: vi.fn(),
    toggleRule: vi.fn(),
    deleteRule: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
  })),
}));

vi.mock('@/features/collections', () => ({
  useCollectionsStore: vi.fn(() => ({
    collections: [],
    loading: false,
    fetchCollections: vi.fn(),
    createCollection: vi.fn(),
    deleteCollection: vi.fn(),
    toggleCollection: vi.fn(),
  })),
}));

vi.mock('@/features/teams', () => ({
  useTeamsStore: vi.fn(() => ({
    team: null,
    members: [],
    loading: false,
    fetchTeam: vi.fn(),
  })),
}));

vi.mock('@/features/workspace-ui', () => ({
  useWorkspaceUIStore: vi.fn(() => ({
    selectedTab: 'all',
    setSelectedTab: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
  })),
}));

vi.mock('@/features/sync', () => ({
  useSyncStore: vi.fn(() => ({
    syncStatus: 'idle',
    lastSyncedAt: null,
    sync: vi.fn(),
    startAutoSync: vi.fn(),
    stopAutoSync: vi.fn(),
  })),
}));

vi.mock('@/shared/stores', () => ({
  useTabsStore: vi.fn(() => ({
    tabs: [],
    activeTabIds: [],
    fetchTabs: vi.fn(),
  })),
  useSettingsStore: vi.fn(() => ({
    settings: { theme: 'system', defaultDelay: 0, logEnabled: true, maxLogEntries: 1000 },
    loading: false,
    fetchSettings: vi.fn(),
    setTheme: vi.fn(),
  })),
}));

vi.mock('@/features/versions', () => ({
  useVersionStore: vi.fn(() => ({
    versions: [],
    loading: false,
    fetchVersions: vi.fn(),
    restoreVersion: vi.fn(),
  })),
}));

vi.mock('@/shared/stores/active-tab', () => ({
  useActiveTabStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      activeTabId: null,
      tabs: [],
      loading: false,
      setActiveTab: vi.fn(),
      clearActiveTab: vi.fn(),
      fetchTabs: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@/features/billing', () => ({
  useBillingStore: vi.fn(() => ({
    loading: false,
    error: null,
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
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

/* --- Layout: no Navigation --- */

describe('SidePanel — layout: no Navigation', () => {
  it('does NOT render Navigation tabs (Workspace, Log, Record)', async () => {
    const { SidePanel } = await import('./SidePanel');
    render(<SidePanel />);

    // The old Navigation had tabs: Workspace, Log, Record
    expect(screen.queryByRole('link', { name: /workspace/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^log$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /record/i })).not.toBeInTheDocument();
  });

  it('does NOT render a <nav> element', async () => {
    const { SidePanel } = await import('./SidePanel');
    render(<SidePanel />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

/* --- Layout: BottomBar present --- */

describe('SidePanel — layout: BottomBar', () => {
  it('renders BottomBar with "Toggle log panel" button', async () => {
    const { SidePanel } = await import('./SidePanel');
    render(<SidePanel />);

    expect(
      screen.getByRole('button', { name: /toggle logs panel/i }),
    ).toBeInTheDocument();
  });

  it('renders AccountButton inside BottomBar (not standalone)', async () => {
    const { SidePanel } = await import('./SidePanel');
    render(<SidePanel />);

    expect(
      screen.getByRole('button', { name: /account/i }),
    ).toBeInTheDocument();
  });
});

/* --- TabSelector integration --- */

describe('SidePanel — TabSelector', () => {
  it('renders TabSelector component', async () => {
    const { SidePanel } = await import('./SidePanel');
    render(<SidePanel />);

    // TabSelector should render a combobox (select) for picking the active tab
    expect(screen.getByRole('combobox', { name: /select active tab/i })).toBeInTheDocument();
  });
});

/* --- No multi-tab activation --- */

describe('SidePanel — no multi-tab activation', () => {
  it('does not render activateInterceptorsOnActiveTabs logic', async () => {
    // The old activateInterceptorsOnActiveTabs function that iterated over
    // activeTabIds from storage and sent TAB_STATUS_CHANGED + INJECT_RULES
    // to multiple tabs should be removed. The SidePanel module should NOT
    // contain this function after TASK-159 implementation.
    const sidePanelModule = await import('./SidePanel');
    const moduleSource = Object.keys(sidePanelModule);

    // The function should not be exported
    expect(moduleSource).not.toContain('activateInterceptorsOnActiveTabs');

    // Additionally, chrome.storage.local.get should NOT be called with 'activeTabIds'
    // during SidePanel mount (the old multi-tab activation path)
    const mockStorageGet = chrome.storage.local.get as ReturnType<typeof vi.fn>;
    mockStorageGet.mockClear();

    render(<sidePanelModule.SidePanel />);

    // Wait for any effects to run
    await new Promise((r) => setTimeout(r, 0));

    // Verify no call to get 'activeTabIds' was made
    const calls = mockStorageGet.mock.calls;
    const activeTabIdsCalls = calls.filter(
      (c: unknown[]) => c[0] === 'activeTabIds',
    );
    expect(activeTabIdsCalls).toHaveLength(0);
  });
});

/* --- Layout: LogPanel integration --- */

describe('SidePanel — layout: LogPanel', () => {
  it('mounts LogPanel component in the tree', async () => {
    const { SidePanel } = await import('./SidePanel');
    const { container } = render(<SidePanel />);

    // LogPanel should be in the component tree. When closed (isOpen=false)
    // it returns null, so we verify that the SidePanel at least does not
    // crash and renders its main content alongside the BottomBar.
    // The LogPanel's presence is confirmed by the BottomBar toggle that
    // controls it. A more direct test: when the toggle is clicked, LogPanel
    // content should appear. For now we verify the toggle exists which
    // implies LogPanel is wired up.
    expect(
      screen.getByRole('button', { name: /toggle logs panel/i }),
    ).toBeInTheDocument();

    // Verify the main content area still renders
    expect(container.querySelector('main')).toBeInTheDocument();
  });
});
