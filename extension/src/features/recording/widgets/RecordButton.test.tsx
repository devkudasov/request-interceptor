import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordButton } from './RecordButton';

const defaultProps = {
  isRecording: false,
  onRecordClick: vi.fn(),
  onStopClick: vi.fn(),
};

describe('RecordButton — idle state', () => {
  it('renders Record button when not recording', () => {
    render(<RecordButton {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /record/i }),
    ).toBeInTheDocument();
  });

  it('calls onRecordClick when clicked in idle state', async () => {
    const user = userEvent.setup();
    const onRecordClick = vi.fn();
    render(
      <RecordButton {...defaultProps} onRecordClick={onRecordClick} />,
    );

    await user.click(screen.getByRole('button', { name: /record/i }));

    expect(onRecordClick).toHaveBeenCalledOnce();
  });

  it('does not show Stop button when not recording', () => {
    render(<RecordButton {...defaultProps} />);

    expect(
      screen.queryByRole('button', { name: /stop/i }),
    ).not.toBeInTheDocument();
  });

  it('does not show pulsing indicator when not recording', () => {
    render(<RecordButton {...defaultProps} />);

    expect(screen.queryByTestId('recording-indicator')).not.toBeInTheDocument();
  });
});

describe('RecordButton — recording state', () => {
  it('shows recording label when recording', () => {
    render(<RecordButton {...defaultProps} isRecording />);

    expect(screen.getByText(/recording/i)).toBeInTheDocument();
  });

  it('shows Stop button when recording', () => {
    render(<RecordButton {...defaultProps} isRecording />);

    expect(
      screen.getByRole('button', { name: /stop/i }),
    ).toBeInTheDocument();
  });

  it('shows pulsing recording indicator when recording', () => {
    render(<RecordButton {...defaultProps} isRecording />);

    const indicator = screen.getByTestId('recording-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toMatch(/animate-pulse/);
  });

  it('calls onStopClick when Stop is clicked', async () => {
    const user = userEvent.setup();
    const onStopClick = vi.fn();
    render(
      <RecordButton {...defaultProps} isRecording onStopClick={onStopClick} />,
    );

    await user.click(screen.getByRole('button', { name: /stop/i }));

    expect(onStopClick).toHaveBeenCalledOnce();
  });

  it('does not show idle Record button when recording', () => {
    render(<RecordButton {...defaultProps} isRecording />);

    expect(
      screen.queryByRole('button', { name: /^record$/i }),
    ).not.toBeInTheDocument();
  });
});
