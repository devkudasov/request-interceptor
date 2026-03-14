import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Modal — rendering', () => {
  it('renders children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Title">
        <p>content</p>
      </Modal>,
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('returns null when not open', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Hidden Modal">
        <p>Should not appear</p>
      </Modal>,
    );

    expect(container.innerHTML).toBe('');
    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
  });

  it('has role="dialog" with aria-modal', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Accessible Modal">
        <p>content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Accessible Modal');
  });

  it('renders close button with aria-label', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test">
        <p>content</p>
      </Modal>,
    );

    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });
});

describe('Modal — interactions', () => {
  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>content</p>
      </Modal>,
    );

    // The backdrop is the first div with aria-hidden="true"
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>content</p>
      </Modal>,
    );

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for non-Escape keys', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not register keydown listener when closed', () => {
    const onClose = vi.fn();
    render(
      <Modal open={false} onClose={onClose} title="Test">
        <p>content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes keydown listener when modal closes', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>content</p>
      </Modal>,
    );

    // Close modal
    rerender(
      <Modal open={false} onClose={onClose} title="Test">
        <p>content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
