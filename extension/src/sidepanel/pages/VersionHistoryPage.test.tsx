import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockFetchVersions = vi.fn();
const mockRestoreVersion = vi.fn();
const mockSelectVersion = vi.fn();

interface VersionEntry {
  id: string;
  version: number;
  createdAt: string;
  author: { uid: string; displayName: string };
  collectionSnapshot: {
    name: string;
    ruleIds: string[];
  };
  rulesSnapshot: Array<{
    id: string;
    urlPattern: string;
    method: string;
    statusCode: number;
  }>;
}

let mockVersionStoreState = {
  versions: [] as VersionEntry[],
  selectedVersion: null as VersionEntry | null,
  loading: false,
  error: null as string | null,
  fetchVersions: mockFetchVersions,
  restoreVersion: mockRestoreVersion,
  selectVersion: mockSelectVersion,
};

vi.mock('@/shared/store', () => ({
  useVersionStore: vi.fn(() => mockVersionStoreState),
}));

import { VersionHistoryPage } from './VersionHistoryPage';

const sampleVersions: VersionEntry[] = [
  {
    id: 'v-3',
    version: 3,
    createdAt: '2026-03-08T14:30:00.000Z',
    author: { uid: 'user-1', displayName: 'Alice' },
    collectionSnapshot: { name: 'API Mocks', ruleIds: ['rule-1', 'rule-2'] },
    rulesSnapshot: [
      { id: 'rule-1', urlPattern: '/api/users', method: 'GET', statusCode: 200 },
      { id: 'rule-2', urlPattern: '/api/posts', method: 'POST', statusCode: 201 },
    ],
  },
  {
    id: 'v-2',
    version: 2,
    createdAt: '2026-03-07T10:00:00.000Z',
    author: { uid: 'user-2', displayName: 'Bob' },
    collectionSnapshot: { name: 'API Mocks', ruleIds: ['rule-1'] },
    rulesSnapshot: [
      { id: 'rule-1', urlPattern: '/api/users', method: 'GET', statusCode: 200 },
    ],
  },
  {
    id: 'v-1',
    version: 1,
    createdAt: '2026-03-06T08:00:00.000Z',
    author: { uid: 'user-1', displayName: 'Alice' },
    collectionSnapshot: { name: 'API Mocks', ruleIds: ['rule-1'] },
    rulesSnapshot: [
      { id: 'rule-1', urlPattern: '/api/users', method: 'GET', statusCode: 200 },
    ],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockVersionStoreState = {
    versions: [],
    selectedVersion: null,
    loading: false,
    error: null,
    fetchVersions: mockFetchVersions,
    restoreVersion: mockRestoreVersion,
    selectVersion: mockSelectVersion,
  };
});

describe('VersionHistoryPage — empty state', () => {
  it('shows empty state message when no versions exist', () => {
    render(<VersionHistoryPage />);

    expect(screen.getByText(/no versions/i)).toBeInTheDocument();
  });
});

describe('VersionHistoryPage — version list', () => {
  beforeEach(() => {
    mockVersionStoreState.versions = sampleVersions;
  });

  it('shows version list with version number', () => {
    render(<VersionHistoryPage />);

    expect(screen.getByText(/v3/i)).toBeInTheDocument();
    expect(screen.getByText(/v2/i)).toBeInTheDocument();
    expect(screen.getByText(/v1/i)).toBeInTheDocument();
  });

  it('shows author name for each version', () => {
    render(<VersionHistoryPage />);

    expect(screen.getAllByText(/Alice/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it('shows date for each version', () => {
    render(<VersionHistoryPage />);

    // Should show some date representation for each version
    expect(screen.getAllByText(/Mar/i).length).toBeGreaterThan(0);
  });

  it('shows "Restore" button for each version', () => {
    render(<VersionHistoryPage />);

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    expect(restoreButtons).toHaveLength(3);
  });
});

describe('VersionHistoryPage — version preview', () => {
  beforeEach(() => {
    mockVersionStoreState.versions = sampleVersions;
  });

  it('clicking a version shows preview of its contents', async () => {
    mockVersionStoreState.selectedVersion = sampleVersions[0];

    render(<VersionHistoryPage />);

    // When a version is selected, its rules should be shown
    expect(screen.getByText(/\/api\/users/)).toBeInTheDocument();
    expect(screen.getByText(/\/api\/posts/)).toBeInTheDocument();
  });
});

describe('VersionHistoryPage — restore', () => {
  beforeEach(() => {
    mockVersionStoreState.versions = sampleVersions;
  });

  it('clicking restore shows confirmation dialog', async () => {
    render(<VersionHistoryPage />);
    const user = userEvent.setup();

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[0]);

    // Should show confirmation dialog
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('confirming restore calls restoreVersion and creates new version', async () => {
    render(<VersionHistoryPage />);
    const user = userEvent.setup();

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[0]);

    // Click confirm in the dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mockRestoreVersion).toHaveBeenCalledWith('v-3');
  });

  it('cancelling restore does not call restoreVersion', async () => {
    render(<VersionHistoryPage />);
    const user = userEvent.setup();

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[0]);

    // Click cancel in the dialog
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockRestoreVersion).not.toHaveBeenCalled();
  });
});
