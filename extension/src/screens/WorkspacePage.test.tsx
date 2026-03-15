import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkspacePage } from './WorkspacePage';
import type { MockRule } from '@/features/rules';
import type { Collection } from '@/features/collections';
import type { AuthUser } from '@/features/auth';
import type { LogEntry } from '@/features/logging';

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
  isRecording: false,
  recordingTabId: null as number | null,
  recordedEntries: [] as LogEntry[],
  tabs: [] as chrome.tabs.Tab[],
};

const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockFetchTabs = vi.fn();
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/features/rules', () => ({
  useRulesStore: vi.fn(() => ({
    rules: storeState.rules, loading: false, fetchRules: vi.fn(),
    toggleRule: vi.fn(), deleteRule: vi.fn(),
  })),
}));

vi.mock('@/features/collections', () => ({
  useCollectionsStore: vi.fn(() => ({
    collections: storeState.collections, loading: false,
    fetchCollections: vi.fn(), createCollection: vi.fn(),
    toggleCollection: vi.fn(),
  })),
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: storeState.user })),
}));

vi.mock('@/features/teams', () => ({
  useTeamsStore: vi.fn(() => ({
    team: storeState.team, pendingInvites: [], error: null,
    fetchTeam: vi.fn(), inviteMember: vi.fn(), removeMember: vi.fn(),
    acceptInvite: vi.fn(), declineInvite: vi.fn(),
  })),
}));

vi.mock('@/features/workspace-ui', () => ({
  useWorkspaceUIStore: vi.fn(() => ({
    activeTypeTab: storeState.activeTypeTab,
    setActiveTypeTab: vi.fn(),
    collapsedCollections: storeState.collapsedCollections,
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
    isRecording: storeState.isRecording,
    recordingTabId: storeState.recordingTabId,
    recordedEntries: storeState.recordedEntries,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    fetchRecordingData: vi.fn(),
  })),
}));

vi.mock('@/shared/stores', () => ({
  useTabsStore: vi.fn(() => ({
    tabs: storeState.tabs,
    activeTabIds: [],
    loading: false,
    fetchTabs: mockFetchTabs,
    toggleTab: vi.fn(),
  })),
  useSettingsStore: vi.fn(() => ({
    settings: { theme: 'system', defaultDelay: 0, logEnabled: true, maxLogEntries: 1000 },
    loading: false,
    fetchSettings: vi.fn(),
    setTheme: vi.fn(),
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
    isRecording: false, recordingTabId: null,
    recordedEntries: [], tabs: [],
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

describe('WorkspacePage — quota enforcement', () => {
  it('shows UpgradePrompt when creating rule at free plan limit', async () => {
    storeState.user = { ...mockUser, plan: 'free' };
    storeState.rules = Array.from({ length: 10 }, (_, i) => ({
      ...httpRule, id: `r${i}`, collectionId: null,
    }));
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByText(/\+ new rule/i));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/reached the limit of 10 rules/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('allows creating rule when under limit', async () => {
    storeState.user = { ...mockUser, plan: 'free' };
    storeState.rules = [httpRule];
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByText(/\+ new rule/i));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/rules/new');
  });

  it('allows creating rule when no user (unauthenticated)', async () => {
    storeState.user = null;
    storeState.rules = Array.from({ length: 10 }, (_, i) => ({
      ...httpRule, id: `r${i}`, collectionId: null,
    }));
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByText(/\+ new rule/i));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/rules/new');
  });

  it('shows UpgradePrompt when creating collection at free plan limit', async () => {
    storeState.user = { ...mockUser, plan: 'free' };
    storeState.collections = Array.from({ length: 3 }, (_, i) => ({
      ...collection, id: `c${i}`, name: `Col ${i}`,
    }));
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /more actions/i }));
    await user.click(screen.getByText(/new collection/i));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/reached the limit of 3 collections/i)).toBeInTheDocument();
  });

  it('navigates to /billing when Upgrade clicked in UpgradePrompt', async () => {
    storeState.user = { ...mockUser, plan: 'free' };
    storeState.rules = Array.from({ length: 10 }, (_, i) => ({
      ...httpRule, id: `r${i}`, collectionId: null,
    }));
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByText(/\+ new rule/i));
    await user.click(screen.getByRole('button', { name: /upgrade/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/billing');
  });

  it('dismisses UpgradePrompt when Cancel clicked', async () => {
    storeState.user = { ...mockUser, plan: 'free' };
    storeState.rules = Array.from({ length: 10 }, (_, i) => ({
      ...httpRule, id: `r${i}`, collectionId: null,
    }));
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByText(/\+ new rule/i));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('WorkspacePage — recording', () => {
  const mockTabs: chrome.tabs.Tab[] = [
    { id: 101, title: 'Example', url: 'https://example.com', index: 0, pinned: false, highlighted: false, active: true, incognito: false, selected: false, windowId: 1, discarded: false, autoDiscardable: true, groupId: -1 },
    { id: 102, title: 'Other Site', url: 'https://other.com', index: 1, pinned: false, highlighted: false, active: false, incognito: false, selected: false, windowId: 1, discarded: false, autoDiscardable: true, groupId: -1 },
  ];

  it('Record button click shows RecordPopover', async () => {
    storeState.tabs = mockTabs;
    storeState.rules = [httpRule]; // has content so empty state doesn't show
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^record$/i }));

    expect(mockFetchTabs).toHaveBeenCalled();
    expect(screen.getByText(/record api responses/i)).toBeInTheDocument();
  });

  it('RecordPopover shows available tabs', async () => {
    storeState.tabs = mockTabs;
    storeState.rules = [httpRule];
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^record$/i }));

    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByText('Other Site')).toBeInTheDocument();
  });

  it('Start recording from popover calls startRecording and closes popover', async () => {
    storeState.tabs = mockTabs;
    storeState.rules = [httpRule];
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^record$/i }));
    await user.click(screen.getByRole('button', { name: /start recording/i }));

    expect(mockStartRecording).toHaveBeenCalledWith(101);
    expect(screen.queryByText(/record api responses/i)).not.toBeInTheDocument();
  });

  it('Stop recording calls stopRecording', async () => {
    storeState.isRecording = true;
    storeState.recordingTabId = 101;
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /stop/i }));

    expect(mockStopRecording).toHaveBeenCalled();
  });

  it('After stop recording, recorded entries are available in store', async () => {
    const recordedEntry: LogEntry = {
      id: 'le1', timestamp: '2026-01-01T00:00:00Z', tabId: 101,
      method: 'GET', url: 'https://api.example.com/data',
      requestHeaders: {}, requestBody: null, statusCode: 200,
      responseHeaders: {}, responseBody: '{"ok":true}',
      responseSize: 12, duration: 100, mocked: false, matchedRuleId: null,
    };
    mockStopRecording.mockResolvedValue([recordedEntry]);
    storeState.isRecording = true;
    storeState.recordingTabId = 101;
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /stop/i }));

    expect(mockStopRecording).toHaveBeenCalled();
  });

  it('Empty state Record button opens popover', async () => {
    storeState.tabs = mockTabs;
    // No rules or collections → empty state
    renderPage();

    const user = userEvent.setup();
    // The empty state has a "Record" button
    const recordButtons = screen.getAllByRole('button', { name: /record/i });
    // Click the empty state one (last one)
    await user.click(recordButtons[recordButtons.length - 1]);

    expect(mockFetchTabs).toHaveBeenCalled();
    expect(screen.getByText(/record api responses/i)).toBeInTheDocument();
  });
});

describe('WorkspacePage — recording UI removed', () => {
  it('does NOT render RecordButton', () => {
    renderPage();

    // RecordButton rendered a "Record" button in the toolbar.
    // After removal, no record button should exist in the toolbar.
    // Note: WorkspaceToolbar may still have other buttons, but not Record/Stop.
    expect(
      screen.queryByRole('button', { name: /^record$/i }),
    ).not.toBeInTheDocument();
  });

  it('does NOT render RecordPopover', async () => {
    storeState.tabs = [
      { id: 101, title: 'Example', url: 'https://example.com', index: 0, pinned: false, highlighted: false, active: true, incognito: false, selected: false, windowId: 1, discarded: false, autoDiscardable: true, groupId: -1 },
    ];
    storeState.rules = [httpRule];
    renderPage();

    // RecordPopover heading should never appear since there is no way to trigger it
    expect(screen.queryByText(/record api responses/i)).not.toBeInTheDocument();
  });

  it('does NOT render SaveRecordedPanel', () => {
    storeState.isRecording = false;
    storeState.recordedEntries = [
      {
        id: 'le1', timestamp: '2026-01-01T00:00:00Z', tabId: 101,
        method: 'GET', url: 'https://api.example.com/data',
        requestHeaders: {}, requestBody: null, statusCode: 200,
        responseHeaders: {}, responseBody: '{"ok":true}',
        responseSize: 12, duration: 100, mocked: false, matchedRuleId: null,
      },
    ];
    renderPage();

    // SaveRecordedPanel shows "Recorded Requests" heading and "Save as Rules" button
    expect(screen.queryByText(/recorded requests/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save as rules/i })).not.toBeInTheDocument();
  });

  it('does NOT import from features/recording', async () => {
    // Read the WorkspacePage source file and verify it has no recording imports
    const fs = await import('fs');
    const path = await import('path');
    const sourceFile = path.resolve(__dirname, 'WorkspacePage.tsx');
    const source = fs.readFileSync(sourceFile, 'utf-8');

    expect(source).not.toContain('features/recording');
    expect(source).not.toContain('RecordPopover');
    expect(source).not.toContain('SaveRecordedPanel');
    expect(source).not.toContain('RecordButton');
  });
});

describe('WorkspacePage — actions', () => {
  it('New Rule button navigates to /rules/new', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText(/\+ new rule/i));
    expect(mockNavigate).toHaveBeenCalledWith('/rules/new');
  });

  it('New Collection is available in overflow menu', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /more actions/i }));
    expect(screen.getByText(/new collection/i)).toBeInTheDocument();
  });

  it('Export is available in overflow menu', async () => {
    const user = userEvent.setup();
    storeState.collections = [collection];
    storeState.rules = [httpRule];
    renderPage();
    await user.click(screen.getByRole('button', { name: /more actions/i }));
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('Import is available in overflow menu', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /more actions/i }));
    expect(screen.getByText(/import/i)).toBeInTheDocument();
  });
});
