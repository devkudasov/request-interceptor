import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolbarOverflowMenu } from './ToolbarOverflowMenu';

const defaultProps = {
  onNewCollection: vi.fn(),
  onImport: vi.fn(),
  onExport: vi.fn(),
  hasCollections: true,
};

describe('ToolbarOverflowMenu — layout', () => {
  it('renders trigger button', () => {
    render(<ToolbarOverflowMenu {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /more|menu|actions/i }),
    ).toBeInTheDocument();
  });

  it('does not show menu items initially', () => {
    render(<ToolbarOverflowMenu {...defaultProps} />);

    expect(screen.queryByText(/new collection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/import/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/export/i)).not.toBeInTheDocument();
  });
});

describe('ToolbarOverflowMenu — open menu', () => {
  it('shows menu items on trigger click', async () => {
    const user = userEvent.setup();
    render(<ToolbarOverflowMenu {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /more|menu|actions/i }),
    );

    expect(screen.getByText(/new collection/i)).toBeInTheDocument();
    expect(screen.getByText(/import/i)).toBeInTheDocument();
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('calls onNewCollection when New Collection is clicked', async () => {
    const user = userEvent.setup();
    const onNewCollection = vi.fn();
    render(
      <ToolbarOverflowMenu
        {...defaultProps}
        onNewCollection={onNewCollection}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /more|menu|actions/i }),
    );
    await user.click(screen.getByText(/new collection/i));

    expect(onNewCollection).toHaveBeenCalledOnce();
  });

  it('calls onImport when Import is clicked', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(
      <ToolbarOverflowMenu {...defaultProps} onImport={onImport} />,
    );

    await user.click(
      screen.getByRole('button', { name: /more|menu|actions/i }),
    );
    await user.click(screen.getByText(/import/i));

    expect(onImport).toHaveBeenCalledOnce();
  });

  it('calls onExport when Export is clicked', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <ToolbarOverflowMenu {...defaultProps} onExport={onExport} />,
    );

    await user.click(
      screen.getByRole('button', { name: /more|menu|actions/i }),
    );
    await user.click(screen.getByText(/export/i));

    expect(onExport).toHaveBeenCalledOnce();
  });

  it('closes menu after item click', async () => {
    const user = userEvent.setup();
    render(<ToolbarOverflowMenu {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /more|menu|actions/i }),
    );
    await user.click(screen.getByText(/import/i));

    expect(screen.queryByText(/new collection/i)).not.toBeInTheDocument();
  });
});

describe('ToolbarOverflowMenu — disabled state', () => {
  it('disables Export when hasCollections is false', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <ToolbarOverflowMenu
        {...defaultProps}
        hasCollections={false}
        onExport={onExport}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /more|menu|actions/i }),
    );

    const exportItem = screen.getByText(/export/i).closest('button');
    expect(exportItem).toBeDisabled();
  });
});
