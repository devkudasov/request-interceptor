import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogEntryList } from './LogEntryList';
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

describe('LogEntryList', () => {
  it('shows entry method, URL, status code, and duration', () => {
    render(<LogEntryList entries={mockEntries} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText(/api\.example\.com\/users/)).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText(/12ms/)).toBeInTheDocument();
  });

  it('shows shield icon for mocked entries', () => {
    const { container } = render(<LogEntryList entries={mockEntries} />);
    const shieldIcons = container.querySelectorAll('img[src*="shield"]');
    expect(shieldIcons.length).toBeGreaterThan(0);
  });

  it('shows globe icon for non-mocked entries', () => {
    const { container } = render(<LogEntryList entries={mockEntries} />);
    const globeIcons = container.querySelectorAll('img[src*="globe"]');
    expect(globeIcons.length).toBeGreaterThan(0);
  });

  it('renders all entries', () => {
    render(<LogEntryList entries={mockEntries} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('shows empty state message when no entries', () => {
    render(<LogEntryList entries={[]} />);
    expect(
      screen.getByText(/no requests captured/i),
    ).toBeInTheDocument();
  });
});
