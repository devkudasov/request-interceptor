import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { MockRule } from '@/features/rules';
import type { Collection } from '@/features/collections';
import type { LogEntry } from '@/features/logging';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const httpRule: MockRule = {
  id: 'r1', enabled: true, priority: 0, collectionId: 'c1',
  urlPattern: 'https://api.example.com/users', urlMatchType: 'wildcard',
  method: 'GET', requestType: 'http', statusCode: 200,
  responseType: 'json', responseBody: '{"ok":true}',
  responseHeaders: { 'Content-Type': 'application/json' },
  delay: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const httpRule2: MockRule = {
  ...httpRule, id: 'r2', urlPattern: 'https://api.example.com/posts', method: 'POST',
  collectionId: 'c1', statusCode: 201,
};

const collection: Collection = {
  id: 'c1', name: 'API Mocks', parentId: null, enabled: true,
  order: 0, ruleIds: ['r1', 'r2'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const mockTabs: chrome.tabs.Tab[] = [
  {
    id: 101, title: 'Example App', url: 'https://example.com',
    index: 0, pinned: false, highlighted: false, active: true,
    incognito: false, selected: false, windowId: 1,
    discarded: false, autoDiscardable: true, groupId: -1,
  },
  {
    id: 102, title: 'Other Tab', url: 'https://other.com',
    index: 1, pinned: false, highlighted: false, active: false,
    incognito: false, selected: false, windowId: 1,
    discarded: false, autoDiscardable: true, groupId: -1,
  },
];

const logEntries: LogEntry[] = [
  {
    id: 'le1', timestamp: '2026-01-15T10:00:00Z', tabId: 1,
    method: 'GET', url: 'https://api.example.com/users',
    requestHeaders: {}, requestBody: null,
    statusCode: 200, responseHeaders: {}, responseBody: '[]',
    responseSize: 2, duration: 50, mocked: true, matchedRuleId: 'r1',
  },
  {
    id: 'le2', timestamp: '2026-01-15T10:00:01Z', tabId: 1,
    method: 'POST', url: 'https://api.example.com/posts',
    requestHeaders: {}, requestBody: '{"title":"test"}',
    statusCode: 500, responseHeaders: {}, responseBody: null,
    responseSize: 0, duration: 200, mocked: false, matchedRuleId: null,
  },
];

// ---------------------------------------------------------------------------
// Auth store mock state
// ---------------------------------------------------------------------------

let authStoreState = {
  user: null as null | { uid: string; email: string | null; displayName: string | null; photoURL: string | null; emailVerified: boolean; plan: 'free' | 'pro' | 'team'; subscriptionStatus?: string | null },
  loading: false,
  error: null as string | null,
};

vi.mock('@/shared/hooks/useStorageUsage', () => ({
  useStorageUsage: () => ({ usedBytes: 0, loading: false }),
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: vi.fn(() => ({
    ...authStoreState,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithGithub: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    fetchUser: vi.fn(),
    startAuthListener: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Log store mock state
// ---------------------------------------------------------------------------

let logStoreState = {
  entries: [] as LogEntry[],
  paused: false,
};

vi.mock('@/features/logging', () => ({
  useLogStore: vi.fn((selector?: (s: typeof logStoreState) => unknown) => {
    if (typeof selector === 'function') return selector(logStoreState);
    return {
      ...logStoreState,
      fetchLog: vi.fn(),
      clearLog: vi.fn(),
      togglePause: vi.fn(),
      addEntry: vi.fn(),
      startListening: vi.fn(),
    };
  }),
  useLogPanelStore: vi.fn(() => ({
    isOpen: false, panelHeight: 250, unseenCount: 0,
    togglePanel: vi.fn(), setPanelHeight: vi.fn(),
    incrementUnseen: vi.fn(), resetUnseen: vi.fn(),
  })),
}));

vi.mock('@/shared/constants', async () => {
  const actual = await vi.importActual<typeof import('@/shared/constants')>('@/shared/constants');
  return { ...actual, PLAN_PRICE_IDS: { pro: 'price_pro', team: 'price_team' } };
});

// ---------------------------------------------------------------------------
// Lazy imports — AFTER all vi.mock calls
// ---------------------------------------------------------------------------

const { RecordButton } = await import('@/features/recording/widgets/RecordButton');
const { RecordPopover } = await import('@/features/recording/widgets/RecordPopover');
const { AccountButton } = await import('@/features/auth/widgets/AccountButton');
const { PlanCard } = await import('@/features/billing/widgets/PlanCard');
const { PlanComparisonTable } = await import('@/features/billing/widgets/PlanComparisonTable');
const { CollectionGroup } = await import('@/features/collections/widgets/CollectionGroup');
const { RuleCard } = await import('@/features/rules/widgets/RuleCard');
const { LogPanel } = await import('@/features/logging/widgets/LogPanel');
const { LogEntryList } = await import('@/features/logging/widgets/LogEntryList');
const { LogToolbar } = await import('@/features/logging/widgets/LogToolbar');

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  authStoreState = { user: null, loading: false, error: null };
  logStoreState = { entries: [], paused: false };
});

// ===========================================================================
// Recording flow: RecordButton + RecordPopover
// ===========================================================================

describe('Recording composition: RecordButton + RecordPopover', () => {
  it('renders RecordButton in idle state and shows Record label', () => {
    const { container } = render(
      <RecordButton isRecording={false} onRecordClick={vi.fn()} onStopClick={vi.fn()} />,
    );
    expect(screen.getByText('Record')).toBeInTheDocument();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('renders RecordButton in recording state with stop', () => {
    const { container } = render(
      <RecordButton isRecording={true} onRecordClick={vi.fn()} onStopClick={vi.fn()} />,
    );
    expect(screen.getByText('Recording...')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('RecordPopover shows tabs and allows starting recording', async () => {
    const onStart = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<RecordPopover tabs={mockTabs} onStartRecording={onStart} onClose={onClose} />);

    expect(screen.getByText('Example App')).toBeInTheDocument();
    expect(screen.getByText('Other Tab')).toBeInTheDocument();

    await user.click(screen.getByText('Start Recording'));
    expect(onStart).toHaveBeenCalledWith(101);
  });

  it('RecordPopover shows empty state when no tabs', () => {
    const { container } = render(
      <RecordPopover tabs={[]} onStartRecording={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText('No tabs available')).toBeInTheDocument();
    expect(container.innerHTML).toMatchSnapshot();
  });
});

// ===========================================================================
// Auth flow: AccountButton shows popover
// ===========================================================================

describe('Auth composition: AccountButton popover', () => {
  it('shows login popover when clicked and user is logged out', async () => {
    authStoreState.user = null;
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AccountButton />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('shows account popover when clicked and user is logged in', async () => {
    authStoreState.user = {
      uid: 'u1', email: 'dev@test.com', displayName: 'Dev User',
      photoURL: null, emailVerified: true, plan: 'free',
    };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AccountButton />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByText('Dev User')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('closes popover on Escape key', async () => {
    authStoreState.user = null;
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AccountButton />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Billing flow: PlanCard + PlanComparisonTable
// ===========================================================================

describe('Billing composition: PlanCard + PlanComparisonTable', () => {
  it('free plan renders upgrade options', () => {
    const onManage = vi.fn();
    const onUpgrade = vi.fn();

    const { container } = render(
      <div>
        <PlanCard
          plan="free"
          subscriptionStatus={null}
          currentPeriodEnd={null}
          cancelAtPeriodEnd={false}
          onManageSubscription={onManage}
        />
        <PlanComparisonTable currentPlan="free" onUpgrade={onUpgrade} />
      </div>,
    );

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getAllByText('Upgrade')).toHaveLength(2); // pro + team
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('pro plan shows manage button and current plan marker', async () => {
    const onManage = vi.fn();
    const onUpgrade = vi.fn();
    const user = userEvent.setup();

    render(
      <div>
        <PlanCard
          plan="pro"
          subscriptionStatus="active"
          currentPeriodEnd="2026-06-01T00:00:00Z"
          cancelAtPeriodEnd={false}
          onManageSubscription={onManage}
        />
        <PlanComparisonTable currentPlan="pro" onUpgrade={onUpgrade} />
      </div>,
    );

    expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
    await user.click(screen.getByText('Manage Subscription'));
    expect(onManage).toHaveBeenCalled();

    // Only team upgrade available
    expect(screen.getAllByText('Upgrade')).toHaveLength(1);
  });
});

// ===========================================================================
// Workspace flow: CollectionGroup + RuleCard
// ===========================================================================

describe('Workspace composition: CollectionGroup + RuleCard', () => {
  it('renders collection with rules inside', () => {
    const rules = [httpRule, httpRule2];
    const { container } = render(
      <CollectionGroup
        collection={collection}
        rules={rules}
        childCollections={[]}
        allCollections={[collection]}
        allRules={rules}
        depth={0}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
        onToggleCollection={vi.fn()}
        onToggleRule={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
      />,
    );

    expect(screen.getByText('API Mocks')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/posts')).toBeInTheDocument();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('collapsed collection hides rules', () => {
    render(
      <CollectionGroup
        collection={collection}
        rules={[httpRule]}
        childCollections={[]}
        allCollections={[collection]}
        allRules={[httpRule]}
        depth={0}
        collapsed={true}
        onToggleCollapsed={vi.fn()}
        onToggleCollection={vi.fn()}
        onToggleRule={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
      />,
    );

    expect(screen.getByText('API Mocks')).toBeInTheDocument();
    expect(screen.queryByText('https://api.example.com/users')).not.toBeInTheDocument();
  });

  it('RuleCard edit and delete callbacks fire', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <RuleCard
        rule={httpRule}
        onToggle={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith('r1');

    await user.click(screen.getByText('Del'));
    expect(onDelete).toHaveBeenCalledWith('r1');
  });
});

// ===========================================================================
// Logging flow: LogPanel + LogEntryList + LogToolbar
// ===========================================================================

describe('Logging composition: LogPanel + LogEntryList + LogToolbar', () => {
  it('LogPanel renders toolbar and entry list when open', () => {
    logStoreState.entries = logEntries;
    logStoreState.paused = false;

    const { container } = render(
      <LogPanel isOpen={true} onClose={vi.fn()} />,
    );

    expect(screen.getByText('Log')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('LogPanel returns null when closed', () => {
    const { container } = render(
      <LogPanel isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('LogEntryList shows empty state when no entries', () => {
    render(<LogEntryList entries={[]} />);
    expect(screen.getByText('No requests captured yet.')).toBeInTheDocument();
  });

  it('LogToolbar pause/resume and clear', async () => {
    const onTogglePause = vi.fn();
    const onClear = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <LogToolbar paused={false} onTogglePause={onTogglePause} onClear={onClear} onClose={onClose} />,
    );

    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(onTogglePause).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('LogEntryList renders entries with mocked/real icons', () => {
    const { container } = render(<LogEntryList entries={logEntries} />);

    expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/posts')).toBeInTheDocument();
    expect(container.innerHTML).toMatchSnapshot();
  });
});
