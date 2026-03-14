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

vi.mock('@/features/rules', () => ({
  useRulesStore: vi.fn(() => ({
    rules: [],
    createRule: mockCreateRule,
    updateRule: mockUpdateRule,
  })),
}));

vi.mock('@/features/collections', () => ({
  useCollectionsStore: vi.fn(() => ({
    collections: [],
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

  it('renders RequestTypeTabs for new rule', () => {
    renderEditor();

    expect(screen.getByRole('tablist', { name: /filter by request type/i })).toBeInTheDocument();
  });

  it('renders Cancel and Create Rule buttons', () => {
    renderEditor();

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create rule/i })).toBeInTheDocument();
  });

  it('renders Organization section', () => {
    renderEditor();

    expect(screen.getByText('Organization')).toBeInTheDocument();
  });
});

describe('RuleEditorPage — tab switching', () => {
  it('shows HTTP editor by default', () => {
    renderEditor();

    expect(screen.getByRole('button', { name: /http method/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/response body/i)).toBeInTheDocument();
  });

  it('switches to WebSocket editor when WebSocket tab is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('tab', { name: /websocket/i }));

    expect(screen.getByText('WS')).toBeInTheDocument();
    expect(screen.getByText(/websocket mock/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /http method/i })).not.toBeInTheDocument();
  });

  it('switches to GraphQL editor when GraphQL tab is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('tab', { name: /graphql/i }));

    expect(screen.getByText(/graphql operation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /http method/i })).toHaveTextContent('POST');
  });

  it('switches back to HTTP editor when HTTP tab is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('tab', { name: /websocket/i }));
    await user.click(screen.getByRole('tab', { name: /http/i }));

    expect(screen.getByRole('button', { name: /http method/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/response body/i)).toBeInTheDocument();
  });
});

describe('RuleEditorPage — create HTTP rule', () => {
  it('creates HTTP rule with entered values', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), '/api/users');
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        urlPattern: '/api/users',
        method: 'GET',
        requestType: 'http',
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
});

describe('RuleEditorPage — create WebSocket rule', () => {
  it('creates WebSocket rule', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('tab', { name: /websocket/i }));
    await user.type(screen.getByRole('textbox', { name: /url pattern/i }), 'wss://api.example.com/ws');
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        requestType: 'websocket',
        urlPattern: 'wss://api.example.com/ws',
      }),
    );
  });
});

describe('RuleEditorPage — create GraphQL rule', () => {
  it('creates GraphQL rule with default POST method', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('tab', { name: /graphql/i }));

    // URL defaults to /graphql, just add operation
    const inputs = screen.getAllByRole('textbox');
    const gqlInput = inputs.find((el) => el.getAttribute('placeholder')?.includes('GetUsers'));
    await user.type(gqlInput!, 'GetUsers');

    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        requestType: 'http',
        method: 'POST',
        graphqlOperation: 'GetUsers',
      }),
    );
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
