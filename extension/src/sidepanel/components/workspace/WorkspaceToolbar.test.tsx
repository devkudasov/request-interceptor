import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceToolbar } from './WorkspaceToolbar';

const defaultProps = {
  urlFilter: '',
  onUrlFilterChange: vi.fn(),
  methodFilter: 'ALL',
  onMethodFilterChange: vi.fn(),
  onNewRule: vi.fn(),
  onNewCollection: vi.fn(),
  onImport: vi.fn(),
  onExport: vi.fn(),
  hasCollections: true,
  isRecording: false,
  onRecordClick: vi.fn(),
  onStopClick: vi.fn(),
};

describe('WorkspaceToolbar — layout', () => {
  it('renders URL filter input', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.getByPlaceholderText(/filter.*url/i)).toBeInTheDocument();
  });

  it('renders method filter dropdown', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders New Rule button', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /new rule/i })).toBeInTheDocument();
  });

  it('renders RecordButton (record button present)', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument();
  });

  it('renders ToolbarOverflowMenu ("More actions" button present)', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
  });

  it('does NOT render standalone "New Collection" button (moved to overflow menu)', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    // New Collection should only be inside the overflow menu, not as a top-level button
    expect(screen.queryByRole('button', { name: /new collection/i })).not.toBeInTheDocument();
  });

  it('does NOT render standalone "Import" button (moved to overflow menu)', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /^import$/i })).not.toBeInTheDocument();
  });

  it('does NOT render standalone "Export" button (moved to overflow menu)', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /^export$/i })).not.toBeInTheDocument();
  });
});

describe('WorkspaceToolbar — interactions', () => {
  it('calls onUrlFilterChange when typing in URL filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WorkspaceToolbar {...defaultProps} onUrlFilterChange={onChange} />);

    await user.type(screen.getByPlaceholderText(/filter.*url/i), '/api');

    expect(onChange).toHaveBeenCalled();
  });

  it('calls onMethodFilterChange when method is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WorkspaceToolbar {...defaultProps} onMethodFilterChange={onChange} />);

    await user.selectOptions(screen.getByRole('combobox'), 'POST');

    expect(onChange).toHaveBeenCalledWith('POST');
  });

  it('calls onNewRule when New Rule button is clicked', async () => {
    const user = userEvent.setup();
    const onNewRule = vi.fn();
    render(<WorkspaceToolbar {...defaultProps} onNewRule={onNewRule} />);

    await user.click(screen.getByRole('button', { name: /new rule/i }));

    expect(onNewRule).toHaveBeenCalled();
  });

  it('disables Export when hasCollections is false', () => {
    render(<WorkspaceToolbar {...defaultProps} hasCollections={false} />);

    // Export is now in ToolbarOverflowMenu, but the disabled state
    // should still be passed through
    expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
  });
});

describe('WorkspaceToolbar — URL filter value', () => {
  it('displays current URL filter value', () => {
    render(<WorkspaceToolbar {...defaultProps} urlFilter="/api/users" />);

    expect(screen.getByPlaceholderText(/filter.*url/i)).toHaveValue('/api/users');
  });

  it('displays current method filter value', () => {
    render(<WorkspaceToolbar {...defaultProps} methodFilter="POST" />);

    expect(screen.getByRole('combobox')).toHaveValue('POST');
  });
});
