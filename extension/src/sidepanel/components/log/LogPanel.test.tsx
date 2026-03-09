import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogPanel } from './LogPanel';
import type { LogEntry } from '@/shared/types';

const mockEntries: LogEntry[] = [
  {
    id: '1',
    timestamp: '2026-03-09T10:31:02.000Z',
    tabId: 1,
    method: 'GET',
    url: 'https://api.example.com/users',
    requestHeaders: {},
    requestBody: null,
    statusCode: 200,
    responseHeaders: {},
    responseBody: null,
    responseSize: 512,
    duration: 12,
    mocked: true,
    matchedRuleId: 'r1',
  },
  {
    id: '2',
    timestamp: '2026-03-09T10:31:03.000Z',
    tabId: 1,
    method: 'POST',
    url: 'https://api.example.com/data',
    requestHeaders: {},
    requestBody: '{"key":"value"}',
    statusCode: 201,
    responseHeaders: {},
    responseBody: null,
    responseSize: 256,
    duration: 45,
    mocked: false,
    matchedRuleId: null,
  },
];

// Mock useLogStore
const mockTogglePause = vi.fn();
const mockClearLog = vi.fn();
let mockPaused = false;
let mockStoreEntries: LogEntry[] = [];

vi.mock('@/shared/store', () => ({
  useLogStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      entries: mockStoreEntries,
      paused: mockPaused,
      togglePause: mockTogglePause,
      clearLog: mockClearLog,
      fetchLog: vi.fn(),
      startListening: vi.fn(),
      addEntry: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

function renderPanel(props: { isOpen: boolean; onClose?: () => void }) {
  return render(
    <LogPanel isOpen={props.isOpen} onClose={props.onClose ?? vi.fn()} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStoreEntries = [...mockEntries];
  mockPaused = false;
});

describe('LogPanel', () => {
  it('does NOT render content when closed', () => {
    renderPanel({ isOpen: false });
    expect(screen.queryByText('Log')).not.toBeInTheDocument();
    expect(screen.queryByText('GET')).not.toBeInTheDocument();
  });

  it('renders log entries when open', () => {
    renderPanel({ isOpen: true });
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('renders close button', () => {
    renderPanel({ isOpen: true });
    expect(
      screen.getByRole('button', { name: /close/i }),
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPanel({ isOpen: true, onClose });

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders Pause/Resume button', () => {
    renderPanel({ isOpen: true });
    expect(
      screen.getByRole('button', { name: /pause/i }),
    ).toBeInTheDocument();
  });

  it('calls togglePause when Pause is clicked', async () => {
    const user = userEvent.setup();
    renderPanel({ isOpen: true });

    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(mockTogglePause).toHaveBeenCalledTimes(1);
  });

  it('shows Resume when paused', () => {
    mockPaused = true;
    renderPanel({ isOpen: true });
    expect(
      screen.getByRole('button', { name: /resume/i }),
    ).toBeInTheDocument();
  });

  it('renders Clear button', () => {
    renderPanel({ isOpen: true });
    expect(
      screen.getByRole('button', { name: /clear/i }),
    ).toBeInTheDocument();
  });

  it('shows MOCKED badge for mocked entries', () => {
    renderPanel({ isOpen: true });
    expect(screen.getByText('MOCKED')).toBeInTheDocument();
  });

  it('shows REAL badge for non-mocked entries', () => {
    renderPanel({ isOpen: true });
    expect(screen.getByText('REAL')).toBeInTheDocument();
  });

  it('shows entry method, URL, status code, and duration', () => {
    renderPanel({ isOpen: true });
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText(/api\.example\.com\/users/)).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText(/12ms/)).toBeInTheDocument();
  });

  it('shows empty state message when no entries', () => {
    mockStoreEntries = [];
    renderPanel({ isOpen: true });
    expect(
      screen.getByText(/no requests captured/i),
    ).toBeInTheDocument();
  });
});
