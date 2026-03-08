import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseConfig } from './ResponseConfig';

const defaultProps = {
  statusCode: '200',
  onStatusCodeChange: vi.fn(),
  responseType: 'json' as const,
  onResponseTypeChange: vi.fn(),
  responseBody: '',
  onResponseBodyChange: vi.fn(),
  headers: [['Content-Type', 'application/json']] as Array<[string, string]>,
  onHeadersChange: vi.fn(),
  delay: '0',
  onDelayChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ResponseConfig — rendering', () => {
  it('renders status code label and select', () => {
    render(<ResponseConfig {...defaultProps} />);

    expect(screen.getByText(/status code/i)).toBeInTheDocument();
  });

  it('renders response type label and select', () => {
    render(<ResponseConfig {...defaultProps} />);

    expect(screen.getByText(/response type/i)).toBeInTheDocument();
  });

  it('renders response body textarea', () => {
    render(<ResponseConfig {...defaultProps} />);

    expect(screen.getByLabelText(/response body/i)).toBeInTheDocument();
  });

  it('displays current response body', () => {
    render(<ResponseConfig {...defaultProps} responseBody='{"users": []}' />);

    expect(screen.getByLabelText(/response body/i)).toHaveValue('{"users": []}');
  });

  it('shows response body placeholder', () => {
    render(<ResponseConfig {...defaultProps} />);

    expect(screen.getByLabelText(/response body/i)).toHaveAttribute('placeholder');
  });
});

describe('ResponseConfig — response body interaction', () => {
  it('calls onResponseBodyChange when body is typed', async () => {
    const user = userEvent.setup();
    const onResponseBodyChange = vi.fn();
    render(<ResponseConfig {...defaultProps} onResponseBodyChange={onResponseBodyChange} />);

    await user.type(screen.getByLabelText(/response body/i), 'hello');

    expect(onResponseBodyChange).toHaveBeenCalled();
  });
});

describe('ResponseConfig — JSON validation', () => {
  it('shows error when jsonError is provided', () => {
    render(<ResponseConfig {...defaultProps} responseBody="{bad json" jsonError="Invalid JSON" />);

    expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
  });

  it('does not show error when jsonError is not provided', () => {
    render(<ResponseConfig {...defaultProps} responseBody='{"valid": true}' />);

    expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument();
  });
});

describe('ResponseConfig — headers section', () => {
  it('renders headers with existing values', () => {
    render(<ResponseConfig {...defaultProps} />);

    const inputs = screen.getAllByPlaceholderText(/header/i);
    expect(inputs.length).toBeGreaterThan(0);
  });
});

describe('ResponseConfig — delay', () => {
  it('renders delay input with label', () => {
    render(<ResponseConfig {...defaultProps} />);

    expect(screen.getByText(/delay/i)).toBeInTheDocument();
  });
});

describe('ResponseConfig — size indicator', () => {
  it('shows size indicator when body has content', () => {
    render(<ResponseConfig {...defaultProps} responseBody='{"users": []}' />);

    // SizeIndicator renders a Badge with byte count like "14 B"
    expect(screen.getByText(/\d+\s*B\b/)).toBeInTheDocument();
  });

  it('does not show size indicator when body is empty', () => {
    render(<ResponseConfig {...defaultProps} responseBody="" />);

    expect(screen.queryByText(/\d+\s*B\b/)).not.toBeInTheDocument();
  });
});
