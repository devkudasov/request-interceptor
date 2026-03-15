import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// --- Store mock state ---
let activeTabState = {
  activeTabId: null as number | null,
  tabs: [] as chrome.tabs.Tab[],
  loading: false,
  setActiveTab: vi.fn(),
  clearActiveTab: vi.fn(),
  fetchTabs: vi.fn(),
};

vi.mock('@/shared/stores/active-tab', () => ({
  useActiveTabStore: vi.fn((selector?: (state: typeof activeTabState) => unknown) =>
    selector ? selector(activeTabState) : activeTabState,
  ),
}));

// Stub chrome APIs
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

import { TabSelector } from './TabSelector';

beforeEach(() => {
  vi.clearAllMocks();
  activeTabState = {
    activeTabId: null,
    tabs: [],
    loading: false,
    setActiveTab: vi.fn(),
    clearActiveTab: vi.fn(),
    fetchTabs: vi.fn(),
  };
});

describe('TabSelector — rendering', () => {
  it('renders a dropdown/select element', () => {
    render(<TabSelector />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows placeholder when activeTabId is null', () => {
    activeTabState.activeTabId = null;
    activeTabState.tabs = [
      { id: 1, title: 'Google', url: 'https://google.com' } as chrome.tabs.Tab,
    ];

    render(<TabSelector />);

    // The placeholder/default option should be visible
    expect(screen.getByText(/no tab selected/i)).toBeInTheDocument();
  });

  it('shows the current tab title when a tab is selected', () => {
    activeTabState.activeTabId = 2;
    activeTabState.tabs = [
      { id: 1, title: 'Google', url: 'https://google.com' } as chrome.tabs.Tab,
      { id: 2, title: 'GitHub', url: 'https://github.com' } as chrome.tabs.Tab,
    ];

    render(<TabSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('2');
  });

  it('renders all open tabs as options', () => {
    activeTabState.tabs = [
      { id: 1, title: 'Google', url: 'https://google.com' } as chrome.tabs.Tab,
      { id: 2, title: 'GitHub', url: 'https://github.com' } as chrome.tabs.Tab,
      { id: 3, title: 'Stack Overflow', url: 'https://stackoverflow.com' } as chrome.tabs.Tab,
    ];

    render(<TabSelector />);

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Stack Overflow')).toBeInTheDocument();
  });
});

describe('TabSelector — interactions', () => {
  it('calls setActiveTab when a tab is selected', async () => {
    const user = userEvent.setup();
    activeTabState.tabs = [
      { id: 1, title: 'Google', url: 'https://google.com' } as chrome.tabs.Tab,
      { id: 2, title: 'GitHub', url: 'https://github.com' } as chrome.tabs.Tab,
    ];

    render(<TabSelector />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '2');

    expect(activeTabState.setActiveTab).toHaveBeenCalledWith(2);
  });
});

describe('TabSelector — empty state', () => {
  it('handles empty tabs list gracefully', () => {
    activeTabState.tabs = [];

    render(<TabSelector />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Should only have the placeholder option
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent(/no tab selected/i);
  });
});
