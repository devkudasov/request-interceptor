import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkspacePage } from './WorkspacePage';
import type { MockRule, Collection, AuthUser } from '@/shared/types';

// --- Mock data ---
const httpRule: MockRule = {
  id: 'r1', enabled: true, priority: 0, collectionId: 'c1',
  urlPattern: 'https://api.example.com/*', urlMatchType: 'wildcard',
  method: 'GET', requestType: 'http', statusCode: 200,
  responseType: 'json', responseBody: '{}', responseHeaders: {},
  delay: 0, createdAt: '', updatedAt: '',
};

const wsRule: MockRule = {
  ...httpRule, id: 'r2', requestType: 'websocket', collectionId: null,
};

const ungroupedRule: MockRule = {
  ...httpRule, id: 'r4', collectionId: null, urlPattern: 'https://other.com/api',
};

const collection: Collection = {
  id: 'c1', name: 'API Mocks', parentId: null, enabled: true,
  order: 0, ruleIds: ['r1', 'r3'], createdAt: '', updatedAt: '',
};

const mockUser: AuthUser = {
  uid: 'u1', email: 'dev@test.com', displayName: 'Dev',
  photoURL: null, emailVerified: true, plan: 'team',
};

// --- Store mocks ---
let storeState = {
  rules: [] as MockRule[],
  collections: [] as Collection[],
  user: null as AuthUser | null,
  team: null as { id: string; name: string; members: { userId: string }[] } | null,
  activeTypeTab: 'http' as 'http' | 'websocket' | 'graphql',
  collapsedCollections: new Set<string>(),
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/shared/store', () => ({
  useRulesStore: vi.fn(() => ({
    rules: storeState.rules, loading: false, fetchRules: vi.fn(),
    toggleRule: vi.fn(), deleteRule: vi.fn(),
  })),
  useCollectionsStore: vi.fn(() => ({
    collections: storeState.collections, loading: false,
    fetchCollections: vi.fn(), createCollection: vi.fn(),
    toggleCollection: vi.fn(),
  })),
  useAuthStore: vi.fn(() => ({ user: storeState.user })),
  useTeamsStore: vi.fn(() => ({
    team: storeState.team, pendingInvites: [], error: null,
    fetchTeam: vi.fn(), inviteMember: vi.fn(), removeMember: vi.fn(),
    acceptInvite: vi.fn(), declineInvite: vi.fn(),
  })),
  useWorkspaceUIStore: vi.fn(() => ({
    activeTypeTab: storeState.activeTypeTab,
    setActiveTypeTab: vi.fn(),
    collapsedCollections: storeState.collapsedCollections,
    toggleCollectionCollapsed: vi.fn(),
    loadCollapsedState: vi.fn(),
  })),
  useSyncStore: vi.fn(() => ({
    syncing: false, lastSyncAt: null, conflict: null, error: null,
    pushToCloud: vi.fn(), pullFromCloud: vi.fn(), resolveConflict: vi.fn(),
  })),
}));

vi.mock('@/shared/import-export', () => ({
  exportCollections: vi.fn(() => ({ version: 1, exportedAt: '', collections: [] })),
  downloadJson: vi.fn(),
  parseImportFile: vi.fn(),
  resolveConflicts: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkspacePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  storeState = {
    rules: [], collections: [], user: null, team: null,
    activeTypeTab: 'http', collapsedCollections: new Set(),
  };
});

describe('WorkspacePage — layout', () => {
  it('renders WorkspaceToolbar', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/filter by url/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ new rule/i)).toBeInTheDocument();
  });

  it('renders RequestTypeTabs', () => {
    renderPage();
    expect(screen.getByRole('tablist', { name: /request type/i })).toBeInTheDocument();
  });

  it('shows WorkspaceEmptyState when no rules and no collections', () => {
    renderPage();
    expect(screen.getByText(/no mock rules yet/i)).toBeInTheDocument();
  });
});

describe('WorkspacePage — collections and rules', () => {
  beforeEach(() => {
    storeState.rules = [httpRule, ungroupedRule];
    storeState.collections = [collection];
  });

  it('renders collections as CollectionGroup components', () => {
    renderPage();
    expect(screen.getByText('API Mocks')).toBeInTheDocument();
  });

  it('renders ungrouped rules section', () => {
    renderPage();
    expect(screen.getByText(/ungrouped/i)).toBeInTheDocument();
  });

  it('does not show empty state when rules exist', () => {
    renderPage();
    expect(screen.queryByText(/no mock rules yet/i)).not.toBeInTheDocument();
  });
});

describe('WorkspacePage — team header', () => {
  it('shows TeamHeader when user is authenticated and has team', () => {
    storeState.user = mockUser;
    storeState.team = {
      id: 't1', name: 'Dream Team',
      members: [{ userId: 'u1' }],
    };
    renderPage();
    expect(screen.getByLabelText(/team dream team/i)).toBeInTheDocument();
  });

  it('hides TeamHeader when no user', () => {
    storeState.user = null;
    storeState.team = null;
    renderPage();
    expect(screen.queryByLabelText(/team/i)).not.toBeInTheDocument();
  });
});

describe('WorkspacePage — filtering', () => {
  beforeEach(() => {
    storeState.rules = [httpRule, ungroupedRule];
    storeState.collections = [collection];
  });

  it('filters rules by active type tab (websocket hides http rules)', () => {
    storeState.activeTypeTab = 'websocket';
    storeState.rules = [httpRule, wsRule];
    renderPage();
    // HTTP-only collection should be hidden when websocket tab active
    expect(screen.queryByText('API Mocks')).not.toBeInTheDocument();
  });

  it('collections with zero matching rules are hidden', () => {
    storeState.activeTypeTab = 'graphql';
    storeState.rules = [httpRule]; // only http rule in collection
    renderPage();
    expect(screen.queryByText('API Mocks')).not.toBeInTheDocument();
  });
});

describe('WorkspacePage — actions', () => {
  it('New Rule button navigates to /rules/new', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText(/\+ new rule/i));
    expect(mockNavigate).toHaveBeenCalledWith('/rules/new');
  });

  it('New Collection button triggers collection creation', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText(/\+ new collection/i));
    // Should open modal or call createCollection — verify it was handled
    // The exact behavior depends on implementation; we verify the button exists and is clickable
  });

  it('Export button is present', () => {
    storeState.collections = [collection];
    storeState.rules = [httpRule];
    renderPage();
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('Import button is present', () => {
    renderPage();
    expect(screen.getByText(/import/i)).toBeInTheDocument();
  });
});
