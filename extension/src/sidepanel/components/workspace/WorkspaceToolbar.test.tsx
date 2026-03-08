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

  it('renders New Collection button', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /new collection/i })).toBeInTheDocument();
  });

  it('renders Import button', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
  });

  it('renders Export button', () => {
    render(<WorkspaceToolbar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
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

  it('calls onNewCollection when New Collection button is clicked', async () => {
    const user = userEvent.setup();
    const onNewCollection = vi.fn();
    render(<WorkspaceToolbar {...defaultProps} onNewCollection={onNewCollection} />);

    await user.click(screen.getByRole('button', { name: /new collection/i }));

    expect(onNewCollection).toHaveBeenCalled();
  });

  it('calls onImport when Import button is clicked', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<WorkspaceToolbar {...defaultProps} onImport={onImport} />);

    await user.click(screen.getByRole('button', { name: /import/i }));

    expect(onImport).toHaveBeenCalled();
  });

  it('calls onExport when Export button is clicked', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<WorkspaceToolbar {...defaultProps} onExport={onExport} />);

    await user.click(screen.getByRole('button', { name: /export/i }));

    expect(onExport).toHaveBeenCalled();
  });

  it('disables Export when hasCollections is false', () => {
    render(<WorkspaceToolbar {...defaultProps} hasCollections={false} />);

    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
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
