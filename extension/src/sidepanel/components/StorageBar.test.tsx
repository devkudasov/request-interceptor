import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageBar } from './StorageBar';

describe('StorageBar', () => {
  it('renders a progress bar', () => {
    render(<StorageBar usedBytes={500_000} totalBytes={5_242_880} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays the correct percentage', () => {
    render(<StorageBar usedBytes={2_621_440} totalBytes={5_242_880} />);

    // 2_621_440 / 5_242_880 = 50%
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('sets aria-valuenow to the correct percentage', () => {
    render(<StorageBar usedBytes={1_048_576} totalBytes={5_242_880} />);

    const progressbar = screen.getByRole('progressbar');
    // 1_048_576 / 5_242_880 = 20%
    expect(progressbar).toHaveAttribute('aria-valuenow', '20');
  });

  it('sets aria-valuemin and aria-valuemax', () => {
    render(<StorageBar usedBytes={0} totalBytes={5_242_880} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders 0% when no storage is used', () => {
    render(<StorageBar usedBytes={0} totalBytes={5_242_880} />);

    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('renders 100% when storage is full', () => {
    render(<StorageBar usedBytes={5_242_880} totalBytes={5_242_880} />);

    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('displays human-readable used/total sizes', () => {
    render(<StorageBar usedBytes={1_048_576} totalBytes={5_242_880} />);

    // Should display something like "1.0 MB / 5.0 MB" or "1 MB of 5 MB"
    expect(screen.getByText(/MB/i)).toBeInTheDocument();
  });

  it('clamps percentage to 100 when used exceeds total', () => {
    render(<StorageBar usedBytes={10_000_000} totalBytes={5_242_880} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '100');
  });
});
