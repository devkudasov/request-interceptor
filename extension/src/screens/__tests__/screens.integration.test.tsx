import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { MockRule } from '@/features/rules';
import type { Collection } from '@/features/collections';
import type { AuthUser } from '@/features/auth';
import type { VersionSnapshot } from '@/features/versions';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const httpRule: MockRule = {
  id: 'r1', enabled: true, priority: 0, collectionId: 'c1',
  urlPattern: 'https://api.example.com/*', urlMatchType: 'wildcard',
  method: 'GET', requestType: 'http', statusCode: 200,
  responseType: 'json', responseBody: '{"ok":true}', responseHeaders: { 'Content-Type': 'application/json' },
  delay: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};


const ungroupedRule: MockRule = {
  ...httpRule, id: 'r3', collectionId: null, urlPattern: 'https://other.com/api',
};

const collection: Collection = {
  id: 'c1', name: 'API Mocks', parentId: null, enabled: true,
  order: 0, ruleIds: ['r1'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const freeUser: AuthUser = {
  uid: 'u1', email: 'dev@test.com', displayName: 'Dev User',
  photoURL: null, emailVerified: true, plan: 'free',
};

const proUser: AuthUser = {
  ...freeUser, plan: 'pro', subscriptionStatus: 'active',
  currentPeriodEnd: '2026-06-01T00:00:00Z', cancelAtPeriodEnd: false,
};

const sampleVersions: VersionSnapshot[] = [
  {
    id: 'v1', version: 1, rules: [httpRule],
    rulesSnapshot: [{ id: 'r1', urlPattern: 'https://api.example.com/*', method: 'GET', statusCode: 200 }],
    author: { uid: 'u1', displayName: 'Dev User' },
    createdBy: 'u1', createdByEmail: 'dev@test.com',
    createdAt: '2026-01-15T10:00:00Z', message: 'Initial',
  },
  {
    id: 'v2', version: 2, rules: [httpRule],
    rulesSnapshot: [{ id: 'r1', urlPattern: 'https://api.example.com/*', method: 'GET', statusCode: 201 }],
    author: { uid: 'u1', displayName: 'Dev User' },
    createdBy: 'u1', createdByEmail: 'dev@test.com',
    createdAt: '2026-02-01T10:00:00Z', message: 'Update status',
  },
];

// ---------------------------------------------------------------------------
// Store mock state — mutated per test in beforeEach
// ---------------------------------------------------------------------------

let rulesState = { rules: [] as MockRule[] };
let collectionsState = { collections: [] as Collection[] };
let authState = { user: null as AuthUser | null };
let workspaceUIState = { activeTypeTab: 'http' as 'http' | 'websocket' | 'graphql' };
let recordingState = { isRecording: false };
let billingState = { loading: false, error: null as string | null };
let versionState = {
  versions: [] as VersionSnapshot[],
  selectedVersion: null as VersionSnapshot | null,
  loading: false,
  error: null as string | null,
};

// ---------------------------------------------------------------------------
// vi.mock — feature stores
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/features/rules', () => ({
  useRulesStore: vi.fn(() => ({
    rules: rulesState.rules,
    loading: false,
    fetchRules: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    toggleRule: vi.fn(),
    reorderRules: vi.fn(),
  })),
}));

vi.mock('@/features/collections', () => ({
  useCollectionsStore: vi.fn(() => ({
    collections: collectionsState.collections,
    loading: false,
    fetchCollections: vi.fn(),
    createCollection: vi.fn(),
    toggleCollection: vi.fn(),
  })),
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: authState.user,
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithGithub: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  })),
}));

vi.mock('@/features/teams', () => ({
  useTeamsStore: vi.fn(() => ({
    team: null, pendingInvites: [], error: null,
    fetchTeam: vi.fn(), inviteMember: vi.fn(), removeMember: vi.fn(),
    acceptInvite: vi.fn(), declineInvite: vi.fn(),
  })),
}));

vi.mock('@/features/workspace-ui', () => ({
  useWorkspaceUIStore: vi.fn(() => ({
    activeTypeTab: workspaceUIState.activeTypeTab,
    setActiveTypeTab: vi.fn(),
    collapsedCollections: new Set<string>(),
    toggleCollectionCollapsed: vi.fn(),
    loadCollapsedState: vi.fn(),
  })),
}));

vi.mock('@/features/sync', () => ({
  useSyncStore: vi.fn(() => ({
    syncing: false, lastSyncAt: null, conflict: null, error: null,
    pushToCloud: vi.fn(), pullFromCloud: vi.fn(), resolveConflict: vi.fn(),
  })),
}));

vi.mock('@/features/recording', () => ({
  useRecordingStore: vi.fn(() => ({
    isRecording: recordingState.isRecording,
    recordingTabId: null,
    recordedEntries: [],
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    fetchRecordingData: vi.fn(),
  })),
}));

vi.mock('@/shared/stores', () => ({
  useTabsStore: vi.fn(() => ({
    tabs: [],
    activeTabIds: [],
    loading: false,
    fetchTabs: vi.fn(),
    toggleTab: vi.fn(),
  })),
  useSettingsStore: vi.fn(() => ({
    settings: { theme: 'dark', defaultDelay: 0, logEnabled: true, maxLogEntries: 1000 },
    loading: false,
    fetchSettings: vi.fn(),
    setTheme: vi.fn(),
  })),
}));

vi.mock('@/shared/import-export', () => ({
  exportCollections: vi.fn(() => ({ version: 1, exportedAt: '', collections: [] })),
  downloadJson: vi.fn(),
  parseImportFile: vi.fn(),
}));

vi.mock('@/features/billing', () => ({
  useBillingStore: vi.fn(() => ({
    loading: billingState.loading,
    error: billingState.error,
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
  })),
}));

vi.mock('@/features/versions', () => ({
  useVersionStore: vi.fn(() => ({
    versions: versionState.versions,
    selectedVersion: versionState.selectedVersion,
    loading: versionState.loading,
    hasMore: false,
    error: versionState.error,
    fetchVersions: vi.fn(),
    loadMore: vi.fn(),
    selectVersion: vi.fn(),
    restoreVersion: vi.fn(),
    clearSelection: vi.fn(),
  })),
}));

vi.mock('@/shared/constants', async () => {
  const actual = await vi.importActual<typeof import('@/shared/constants')>('@/shared/constants');
  return { ...actual, PLAN_PRICE_IDS: { pro: 'price_pro', team: 'price_team' } };
});

// ---------------------------------------------------------------------------
// Lazy imports — AFTER all vi.mock calls
// ---------------------------------------------------------------------------

const { WorkspacePage } = await import('../WorkspacePage');
const { RuleEditorPage } = await import('../RuleEditorPage');
const { BillingPage } = await import('../BillingPage');
const { VersionHistoryPage } = await import('../VersionHistoryPage');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

function renderRuleEditor(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/rules/new" element={<RuleEditorPage />} />
        <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  rulesState = { rules: [] };
  collectionsState = { collections: [] };
  authState = { user: null };
  workspaceUIState = { activeTypeTab: 'http' };
  recordingState = { isRecording: false };
  billingState = { loading: false, error: null };
  versionState = { versions: [], selectedVersion: null, loading: false, error: null };
});

// ===========================================================================
// WorkspacePage
// ===========================================================================

describe('WorkspacePage snapshots', () => {
  it('empty state', () => {
    const { container } = renderWithRouter(<WorkspacePage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('with rules and collections', () => {
    rulesState.rules = [httpRule, ungroupedRule];
    collectionsState.collections = [collection];
    const { container } = renderWithRouter(<WorkspacePage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('recording state', () => {
    rulesState.rules = [httpRule];
    collectionsState.collections = [collection];
    recordingState.isRecording = true;
    const { container } = renderWithRouter(<WorkspacePage />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

// ===========================================================================
// RuleEditorPage
// ===========================================================================

describe('RuleEditorPage snapshots', () => {
  it('create mode', () => {
    const { container } = renderRuleEditor('/rules/new');
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('edit mode (pre-filled)', () => {
    rulesState.rules = [httpRule];
    collectionsState.collections = [collection];
    const { container } = renderRuleEditor('/rules/r1/edit');
    expect(container.innerHTML).toMatchSnapshot();
  });
});

// ===========================================================================
// BillingPage
// ===========================================================================

describe('BillingPage snapshots', () => {
  it('free plan', () => {
    authState.user = freeUser;
    const { container } = renderWithRouter(<BillingPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('pro plan with active subscription', () => {
    authState.user = proUser;
    const { container } = renderWithRouter(<BillingPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

// ===========================================================================
// VersionHistoryPage
// ===========================================================================

describe('VersionHistoryPage snapshots', () => {
  it('with versions', () => {
    versionState.versions = sampleVersions;
    const { container } = renderWithRouter(<VersionHistoryPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});
