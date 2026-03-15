import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveRecordedPanel } from './SaveRecordedPanel';
import type { LogEntry } from '@/features/logging/types';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: '1',
    timestamp: '2026-03-15T00:00:00Z',
    tabId: 1,
    method: 'GET',
    url: 'https://api.example.com/users',
    requestHeaders: {},
    requestBody: null,
    statusCode: 200,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    duration: 100,
    mocked: false,
    matchedRuleId: null,
    ...overrides,
  };
}

const defaultProps = {
  entries: [] as LogEntry[],
  onSave: vi.fn().mockResolvedValue(undefined),
  onDiscard: vi.fn(),
  saving: false,
};

describe('SaveRecordedPanel', () => {
  it('renders "Recorded Requests" header', () => {
    render(<SaveRecordedPanel {...defaultProps} />);

    expect(screen.getByText('Recorded Requests')).toBeInTheDocument();
  });

  it('shows entry count badge', () => {
    const entries = [
      makeEntry({ id: '1' }),
      makeEntry({ id: '2' }),
      makeEntry({ id: '3' }),
    ];
    render(<SaveRecordedPanel {...defaultProps} entries={entries} />);

    expect(screen.getByText('3 requests')).toBeInTheDocument();
  });

  it('renders method and URL for each entry', () => {
    const entries = [
      makeEntry({ id: '1', method: 'GET', url: 'https://api.example.com/users' }),
      makeEntry({ id: '2', method: 'POST', url: 'https://api.example.com/items' }),
    ];
    render(<SaveRecordedPanel {...defaultProps} entries={entries} />);

    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText(/api\.example\.com\/users/)).toBeInTheDocument();
    expect(screen.getByText(/api\.example\.com\/items/)).toBeInTheDocument();
  });

  it('renders status code for each entry', () => {
    const entries = [
      makeEntry({ id: '1', statusCode: 200 }),
      makeEntry({ id: '2', statusCode: 404 }),
    ];
    render(<SaveRecordedPanel {...defaultProps} entries={entries} />);

    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('"Save as Rules" button calls onSave when clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const entries = [makeEntry()];
    render(<SaveRecordedPanel {...defaultProps} entries={entries} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save as rules/i }));

    expect(onSave).toHaveBeenCalledOnce();
  });

  it('"Save as Rules" button is disabled when saving=true', () => {
    const entries = [makeEntry()];
    render(<SaveRecordedPanel {...defaultProps} entries={entries} saving={true} />);

    expect(screen.getByRole('button', { name: /save as rules/i })).toBeDisabled();
  });

  it('"Save as Rules" button is disabled when entries is empty', () => {
    render(<SaveRecordedPanel {...defaultProps} entries={[]} />);

    expect(screen.getByRole('button', { name: /save as rules/i })).toBeDisabled();
  });

  it('"Discard" button calls onDiscard when clicked', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const entries = [makeEntry()];
    render(<SaveRecordedPanel {...defaultProps} entries={entries} onDiscard={onDiscard} />);

    await user.click(screen.getByRole('button', { name: /discard/i }));

    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('shows "No requests recorded" when entries is empty', () => {
    render(<SaveRecordedPanel {...defaultProps} entries={[]} />);

    expect(screen.getByText(/no requests recorded/i)).toBeInTheDocument();
  });

  it('shows loading state on Save button when saving=true', () => {
    const entries = [makeEntry()];
    render(<SaveRecordedPanel {...defaultProps} entries={entries} saving={true} />);

    const saveBtn = screen.getByRole('button', { name: /save as rules/i });
    // The Button component renders an SVG spinner when loading=true
    const spinner = saveBtn.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
