import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLRuleEditor } from './GraphQLRuleEditor';
import type { GraphQLRuleFields } from './GraphQLRuleEditor';

const defaultFields: GraphQLRuleFields = {
  method: 'POST',
  urlPattern: '/graphql',
  urlMatchType: 'wildcard',
  graphqlOperation: '',
  bodyMatch: '',
  statusCode: '200',
  responseType: 'json',
  responseBody: '',
  headers: [['Content-Type', 'application/json']],
  delay: '0',
};

describe('GraphQLRuleEditor', () => {
  it('renders RuleInputBar with method dropdown', () => {
    render(<GraphQLRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /http method/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /url pattern/i })).toBeInTheDocument();
  });

  it('renders GraphQL Operation input prominently (not hidden)', () => {
    render(<GraphQLRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByText(/graphql operation/i)).toBeInTheDocument();
  });

  it('renders response section', () => {
    render(<GraphQLRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByLabelText(/response body/i)).toBeInTheDocument();
  });

  it('defaults method to POST', () => {
    render(<GraphQLRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /http method/i })).toHaveTextContent('POST');
  });

  it('defaults URL to /graphql', () => {
    render(<GraphQLRuleEditor fields={defaultFields} onChange={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: /url pattern/i })).toHaveValue('/graphql');
  });

  it('calls onChange when graphql operation is typed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GraphQLRuleEditor fields={defaultFields} onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');
    const gqlInput = inputs.find((el) => el.getAttribute('placeholder')?.includes('GetUsers'));
    expect(gqlInput).toBeDefined();

    await user.type(gqlInput!, 'GetUsers');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ graphqlOperation: expect.any(String) }));
  });
});
