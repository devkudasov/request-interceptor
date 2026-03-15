import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogPanel } from './LogPanel';
import type { LogEntry } from '@/features/logging';

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
];

const mockTogglePause = vi.fn();
const mockClearLog = vi.fn();
let mockPaused = false;
let mockStoreEntries: LogEntry[] = [];

vi.mock('@/features/logging', () => ({
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

  it('renders toolbar and entries when open', () => {
    renderPanel({ isOpen: true });
    expect(screen.getByText('Log')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('delegates pause/clear/close to LogToolbar', () => {
    renderPanel({ isOpen: true });
    expect(
      screen.getByRole('button', { name: /pause/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /clear/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /close/i }),
    ).toBeInTheDocument();
  });

  it('delegates entry rendering to LogEntryList', () => {
    renderPanel({ isOpen: true });
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
  });
});
