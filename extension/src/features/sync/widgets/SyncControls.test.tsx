import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPushToCloud = vi.fn();
const mockPullFromCloud = vi.fn();
const mockResolveConflict = vi.fn();

let mockSyncStoreState = {
  syncing: false,
  lastSyncAt: null as string | null,
  conflict: null as {
    local: { name: string };
    remote: { name: string };
  } | null,
  error: null as string | null,
  pushToCloud: mockPushToCloud,
  pullFromCloud: mockPullFromCloud,
  resolveConflict: mockResolveConflict,
};

let mockTeamsStoreState = {
  team: null as { id: string; name: string } | null,
  loading: false,
};

let mockAuthStoreState = {
  user: {
    uid: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    photoURL: null,
    emailVerified: true,
    plan: 'team' as const,
  },
  loading: false,
};

vi.mock('@/features/sync', () => ({
  useSyncStore: vi.fn(() => mockSyncStoreState),
}));

vi.mock('@/features/teams', () => ({
  useTeamsStore: vi.fn(() => mockTeamsStoreState),
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}));

import { SyncControls } from './SyncControls';

beforeEach(() => {
  vi.clearAllMocks();
  mockSyncStoreState = {
    syncing: false,
    lastSyncAt: null,
    conflict: null,
    error: null,
    pushToCloud: mockPushToCloud,
    pullFromCloud: mockPullFromCloud,
    resolveConflict: mockResolveConflict,
  };
  mockTeamsStoreState = {
    team: { id: 'team-1', name: 'Alpha Team' },
    loading: false,
  };
  mockAuthStoreState = {
    user: {
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      photoURL: null,
      emailVerified: true,
      plan: 'team',
    },
    loading: false,
  };
});

describe('SyncControls — team exists', () => {
  it('"Push to Cloud" button is visible when team exists', () => {
    render(<SyncControls />);

    expect(
      screen.getByRole('button', { name: /push to cloud/i }),
    ).toBeInTheDocument();
  });

  it('"Pull from Cloud" button is visible when team exists', () => {
    render(<SyncControls />);

    expect(
      screen.getByRole('button', { name: /pull from cloud/i }),
    ).toBeInTheDocument();
  });

  it('calls pushToCloud when push button is clicked', async () => {
    render(<SyncControls />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /push to cloud/i }));

    expect(mockPushToCloud).toHaveBeenCalled();
  });

  it('calls pullFromCloud when pull button is clicked', async () => {
    render(<SyncControls />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /pull from cloud/i }));

    expect(mockPullFromCloud).toHaveBeenCalled();
  });

  it('shows "Last sync: X ago" timestamp when sync has occurred', () => {
    mockSyncStoreState.lastSyncAt = '2026-03-08T10:00:00.000Z';

    render(<SyncControls />);

    expect(screen.getByText(/last sync/i)).toBeInTheDocument();
  });
});

describe('SyncControls — conflict resolution', () => {
  it('shows conflict resolution dialog when conflicts are detected', () => {
    mockSyncStoreState.conflict = {
      local: { name: 'Local Version' },
      remote: { name: 'Remote Version' },
    };

    render(<SyncControls />);

    expect(screen.getByText(/conflict/i)).toBeInTheDocument();
  });

  it('shows resolution options in conflict dialog', () => {
    mockSyncStoreState.conflict = {
      local: { name: 'Local Version' },
      remote: { name: 'Remote Version' },
    };

    render(<SyncControls />);

    // Should show options like "Keep Local", "Keep Remote", "Merge"
    expect(
      screen.getByRole('button', { name: /keep local/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /keep remote/i }),
    ).toBeInTheDocument();
  });
});

describe('SyncControls — syncing state', () => {
  it('shows progress indicator during sync', () => {
    mockSyncStoreState.syncing = true;

    render(<SyncControls />);

    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
  });

  it('disables buttons during sync', () => {
    mockSyncStoreState.syncing = true;

    render(<SyncControls />);

    const pushButton = screen.getByRole('button', { name: /push to cloud/i });
    const pullButton = screen.getByRole('button', { name: /pull from cloud/i });
    expect(pushButton).toBeDisabled();
    expect(pullButton).toBeDisabled();
  });
});

describe('SyncControls — disabled states', () => {
  it('is disabled when not logged in', () => {
    mockAuthStoreState.user = null as unknown as typeof mockAuthStoreState.user;

    render(<SyncControls />);

    const pushButton = screen.queryByRole('button', { name: /push to cloud/i });
    if (pushButton) {
      expect(pushButton).toBeDisabled();
    } else {
      // Component may not render buttons at all when not logged in
      expect(screen.getByText(/log in/i)).toBeInTheDocument();
    }
  });

  it('is disabled when user has no team', () => {
    mockTeamsStoreState.team = null;

    render(<SyncControls />);

    const pushButton = screen.queryByRole('button', { name: /push to cloud/i });
    if (pushButton) {
      expect(pushButton).toBeDisabled();
    } else {
      // Component may show a message about joining a team
      expect(screen.getByText(/no team/i)).toBeInTheDocument();
    }
  });
});
