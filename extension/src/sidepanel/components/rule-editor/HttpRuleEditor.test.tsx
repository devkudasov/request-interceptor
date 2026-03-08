import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpRuleEditor } from './HttpRuleEditor';
import type { HttpRuleFields } from './HttpRuleEditor';

const defaultFields: HttpRuleFields = {
  method: 'GET',
  urlPattern: '',
  urlMatchType: 'wildcard',
  bodyMatch: '',
  statusCode: '200',
  responseType: 'json',
  responseBody: '',
  headers: [['Content-Type', 'application/json']],
  delay: '0',
};

describe('HttpRuleEditor', () => {
  it('renders RuleInputBar with HTTP method', () => {
    render(<HttpRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /http method/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /url pattern/i })).toBeInTheDocument();
  });

  it('renders response section', () => {
    render(<HttpRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByText('Response')).toBeInTheDocument();
    expect(screen.getByLabelText(/response body/i)).toBeInTheDocument();
  });

  it('renders advanced matching section', () => {
    render(<HttpRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByText(/advanced matching/i)).toBeInTheDocument();
  });

  it('calls onChange when URL is typed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<HttpRuleEditor fields={defaultFields} onChange={onChange} />);

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), '/api');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ urlPattern: expect.any(String) }));
  });

  it('calls onChange when method is changed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<HttpRuleEditor fields={defaultFields} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /http method/i }));
    await user.click(screen.getByRole('option', { name: 'POST' }));

    expect(onChange).toHaveBeenCalledWith({ method: 'POST' });
  });
});
