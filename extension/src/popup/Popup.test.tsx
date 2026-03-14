import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock stores
const mockFetchTabs = vi.fn();
const mockFetchRules = vi.fn();
const mockToggleTab = vi.fn();

let tabsStoreState = {
  tabs: [] as chrome.tabs.Tab[],
  activeTabIds: [] as number[],
  loading: false,
  fetchTabs: mockFetchTabs,
  toggleTab: mockToggleTab,
};

let rulesStoreState = {
  rules: [] as Array<{ id: string; enabled: boolean }>,
  loading: false,
  fetchRules: mockFetchRules,
};

vi.mock('@/shared/stores', () => ({
  useTabsStore: (selector?: (state: typeof tabsStoreState) => unknown) =>
    selector ? selector(tabsStoreState) : tabsStoreState,
}));

vi.mock('@/features/rules', () => ({
  useRulesStore: (selector?: (state: typeof rulesStoreState) => unknown) =>
    selector ? selector(rulesStoreState) : rulesStoreState,
}));

// Mock ThemeProvider to pass through children
vi.mock('@/ui/theme/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock chrome APIs
const mockSidePanelOpen = vi.fn();

vi.stubGlobal('chrome', {
  sidePanel: { open: mockSidePanelOpen },
  windows: { WINDOW_ID_CURRENT: -2 },
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

import { Popup } from './Popup';

beforeEach(() => {
  vi.clearAllMocks();
  tabsStoreState = {
    tabs: [],
    activeTabIds: [],
    loading: false,
    fetchTabs: mockFetchTabs,
    toggleTab: mockToggleTab,
  };
  rulesStoreState = {
    rules: [],
    loading: false,
    fetchRules: mockFetchRules,
  };
});

describe('Popup — loading state', () => {
  it('renders spinner when loading', () => {
    tabsStoreState.loading = true;

    render(<Popup />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('Popup — initialization', () => {
  it('calls fetchTabs and fetchRules on mount', () => {
    render(<Popup />);

    expect(mockFetchTabs).toHaveBeenCalled();
    expect(mockFetchRules).toHaveBeenCalled();
  });
});

describe('Popup — tab list rendering', () => {
  it('renders tab titles and URLs', () => {
    tabsStoreState.tabs = [
      { id: 1, title: 'Google', url: 'https://google.com' } as chrome.tabs.Tab,
      { id: 2, title: 'GitHub', url: 'https://github.com' } as chrome.tabs.Tab,
    ];

    render(<Popup />);

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('https://google.com')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('https://github.com')).toBeInTheDocument();
  });

  it('renders "No tabs found" when tabs array is empty', () => {
    tabsStoreState.tabs = [];

    render(<Popup />);

    expect(screen.getByText('No tabs found')).toBeInTheDocument();
  });

  it('renders "Untitled" for tabs without title', () => {
    tabsStoreState.tabs = [
      { id: 1, title: '', url: 'https://example.com' } as chrome.tabs.Tab,
    ];

    render(<Popup />);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});

describe('Popup — toggle functionality', () => {
  it('renders toggle switches for each tab', () => {
    tabsStoreState.tabs = [
      { id: 1, title: 'Tab 1', url: 'https://example.com' } as chrome.tabs.Tab,
    ];

    render(<Popup />);

    const toggles = screen.getAllByRole('switch');
    expect(toggles).toHaveLength(1);
  });

  it('toggle reflects active state', () => {
    tabsStoreState.tabs = [
      { id: 1, title: 'Tab 1', url: 'https://example.com' } as chrome.tabs.Tab,
    ];
    tabsStoreState.activeTabIds = [1];

    render(<Popup />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('calls toggleTab when switch is clicked', async () => {
    const user = userEvent.setup();
    tabsStoreState.tabs = [
      { id: 1, title: 'Tab 1', url: 'https://example.com' } as chrome.tabs.Tab,
    ];
    tabsStoreState.activeTabIds = [];

    render(<Popup />);

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(mockToggleTab).toHaveBeenCalledWith(1, true);
  });
});

describe('Popup — extension info', () => {
  it('renders the header title', () => {
    render(<Popup />);

    expect(screen.getByText('Request Interceptor')).toBeInTheDocument();
  });

  it('displays active rules count', () => {
    rulesStoreState.rules = [
      { id: 'r1', enabled: true },
      { id: 'r2', enabled: false },
      { id: 'r3', enabled: true },
    ];

    render(<Popup />);

    expect(screen.getByText(/2 active/)).toBeInTheDocument();
  });

  it('displays 0 active when no rules enabled', () => {
    rulesStoreState.rules = [
      { id: 'r1', enabled: false },
    ];

    render(<Popup />);

    expect(screen.getByText(/0 active/)).toBeInTheDocument();
  });
});

describe('Popup — action buttons', () => {
  it('renders "Open Editor" button', () => {
    render(<Popup />);

    expect(screen.getByText('Open Editor')).toBeInTheDocument();
  });

  it('renders "Request Log" button', () => {
    render(<Popup />);

    expect(screen.getByText('Request Log')).toBeInTheDocument();
  });

  it('opens side panel when "Open Editor" is clicked', async () => {
    const user = userEvent.setup();

    render(<Popup />);

    await user.click(screen.getByText('Open Editor'));

    expect(mockSidePanelOpen).toHaveBeenCalledWith({ windowId: -2 });
  });

  it('opens side panel when "Request Log" is clicked', async () => {
    const user = userEvent.setup();

    render(<Popup />);

    await user.click(screen.getByText('Request Log'));

    expect(mockSidePanelOpen).toHaveBeenCalledWith({ windowId: -2 });
  });
});
