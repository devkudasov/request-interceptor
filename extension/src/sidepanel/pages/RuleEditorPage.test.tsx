import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
const mockFetchCollections = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/shared/store', () => ({
  useRulesStore: vi.fn(() => ({
    rules: [],
    createRule: mockCreateRule,
    updateRule: mockUpdateRule,
  })),
  useCollectionsStore: vi.fn(() => ({
    collections: [
      { id: 'col-1', name: 'API Mocks' },
      { id: 'col-2', name: 'Auth Mocks' },
    ],
    fetchCollections: mockFetchCollections,
  })),
}));

import { RuleEditorPage } from './RuleEditorPage';

function renderEditor(path = '/rules/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/rules/new" element={<RuleEditorPage />} />
        <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RuleEditorPage — layout', () => {
  it('renders page title "Create Rule" for new rule', () => {
    renderEditor();

    expect(screen.getByRole('heading', { name: /create rule/i })).toBeInTheDocument();
  });

  it('renders back button', () => {
    renderEditor();

    expect(screen.getByText(/back/i)).toBeInTheDocument();
  });

  it('renders RuleInputBar (method + URL + match type)', () => {
    renderEditor();

    expect(screen.getByRole('group', { name: /request url configuration/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /http method/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /url pattern/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /url match type/i })).toBeInTheDocument();
  });

  it('renders response section with status and body labels', () => {
    renderEditor();

    expect(screen.getByText(/status code/i)).toBeInTheDocument();
    expect(screen.getByText(/response type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/response body/i)).toBeInTheDocument();
  });

  it('renders organization section', () => {
    renderEditor();

    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('renders Cancel and Create Rule buttons', () => {
    renderEditor();

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create rule/i })).toBeInTheDocument();
  });
});

describe('RuleEditorPage — create flow', () => {
  it('creates rule with entered values', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), '/api/users');
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        urlPattern: '/api/users',
        method: 'GET',
        urlMatchType: 'wildcard',
        statusCode: 200,
      }),
    );
  });

  it('navigates back after creating rule', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), '/api/test');
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('disables Create Rule when URL is empty', () => {
    renderEditor();

    expect(screen.getByRole('button', { name: /create rule/i })).toBeDisabled();
  });

  it('changes method via RuleInputBar', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: /http method/i }));
    await user.click(screen.getByRole('option', { name: 'POST' }));

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), '/api/users');
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('changes match type via RuleInputBar', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: /url match type/i }));
    await user.click(screen.getByRole('option', { name: /regex/i }));

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), '/api/.*');
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({ urlMatchType: 'regex' }),
    );
  });
});

describe('RuleEditorPage — response body validation', () => {
  it('shows error for invalid JSON in body', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), '/api/test');
    await user.type(screen.getByLabelText(/response body/i), '{{}bad json');
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
    expect(mockCreateRule).not.toHaveBeenCalled();
  });
});

describe('RuleEditorPage — cancel', () => {
  it('navigates back on cancel', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
