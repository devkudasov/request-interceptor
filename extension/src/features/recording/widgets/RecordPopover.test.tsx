import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordPopover } from './RecordPopover';

const mockTabs = [
  { id: 1, title: 'Google', url: 'https://google.com' },
  { id: 2, title: 'GitHub', url: 'https://github.com' },
] as chrome.tabs.Tab[];

const defaultProps = {
  tabs: mockTabs,
  onStartRecording: vi.fn(),
  onClose: vi.fn(),
};

describe('RecordPopover — layout', () => {
  it('renders tab selector', () => {
    render(<RecordPopover {...defaultProps} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders Start Recording button', () => {
    render(<RecordPopover {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /start recording/i }),
    ).toBeInTheDocument();
  });

  it('renders popover title', () => {
    render(<RecordPopover {...defaultProps} />);

    expect(screen.getByText(/record api responses/i)).toBeInTheDocument();
  });

  it('renders tab options in selector', () => {
    render(<RecordPopover {...defaultProps} />);

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });
});

describe('RecordPopover — interactions', () => {
  it('disables Start when no tab is selected', () => {
    render(<RecordPopover {...defaultProps} tabs={[]} />);

    expect(
      screen.getByRole('button', { name: /start recording/i }),
    ).toBeDisabled();
  });

  it('calls onStartRecording with selected tab when Start is clicked', async () => {
    const user = userEvent.setup();
    const onStartRecording = vi.fn();
    render(
      <RecordPopover {...defaultProps} onStartRecording={onStartRecording} />,
    );

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(
      screen.getByRole('button', { name: /start recording/i }),
    );

    expect(onStartRecording).toHaveBeenCalledWith(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RecordPopover {...defaultProps} onClose={onClose} />);

    await user.click(
      screen.getByRole('button', { name: /cancel|close/i }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('RecordPopover — empty state', () => {
  it('shows empty message when no tabs available', () => {
    render(<RecordPopover {...defaultProps} tabs={[]} />);

    expect(screen.getByText(/no tabs available/i)).toBeInTheDocument();
  });

  it('does not render tab selector when no tabs', () => {
    render(<RecordPopover {...defaultProps} tabs={[]} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
