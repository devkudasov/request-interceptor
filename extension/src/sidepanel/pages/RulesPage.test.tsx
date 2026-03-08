import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MockRule } from '@/shared/types';

const mockNavigate = vi.fn();
const mockFetchRules = vi.fn();
const mockFetchCollections = vi.fn();
const mockToggleRule = vi.fn();
const mockDeleteRule = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const makeRule = (overrides: Partial<MockRule> & { id: string }): MockRule => ({
  enabled: true,
  priority: 0,
  collectionId: null,
  urlPattern: '/api/test',
  urlMatchType: 'wildcard',
  method: 'GET',
  requestType: 'http',
  statusCode: 200,
  responseType: 'json',
  responseBody: '{}',
  responseHeaders: {},
  delay: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const sampleRules: MockRule[] = [
  makeRule({ id: 'r1', urlPattern: '/api/users', method: 'GET', requestType: 'http' }),
  makeRule({ id: 'r2', urlPattern: '/api/users', method: 'POST', requestType: 'http' }),
  makeRule({ id: 'r3', urlPattern: 'wss://api.example.com/ws', requestType: 'websocket' }),
  makeRule({ id: 'r4', urlPattern: '/graphql', method: 'POST', requestType: 'http', graphqlOperation: 'GetUsers' }),
  makeRule({ id: 'r5', urlPattern: '/graphql', method: 'POST', requestType: 'http', graphqlOperation: 'CreatePost' }),
];

let mockRulesState = {
  rules: sampleRules,
  loading: false,
  fetchRules: mockFetchRules,
  toggleRule: mockToggleRule,
  deleteRule: mockDeleteRule,
};

vi.mock('@/shared/store', () => ({
  useRulesStore: vi.fn(() => mockRulesState),
  useCollectionsStore: vi.fn(() => ({
    collections: [],
    fetchCollections: mockFetchCollections,
  })),
}));

import { MemoryRouter } from 'react-router-dom';
import { RulesPage } from './RulesPage';

function renderRulesPage() {
  return render(
    <MemoryRouter>
      <RulesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRulesState = {
    rules: sampleRules,
    loading: false,
    fetchRules: mockFetchRules,
    toggleRule: mockToggleRule,
    deleteRule: mockDeleteRule,
  };
});

describe('RulesPage — request type tabs', () => {
  it('renders RequestTypeTabs', () => {
    renderRulesPage();

    expect(screen.getByRole('tablist', { name: /filter by request type/i })).toBeInTheDocument();
  });

  it('shows correct count for HTTP tab (excludes GraphQL)', () => {
    renderRulesPage();

    // HTTP = r1, r2 (2 rules without graphqlOperation)
    expect(screen.getByRole('tab', { name: /http, 2 rules/i })).toBeInTheDocument();
  });

  it('shows correct count for WebSocket tab', () => {
    renderRulesPage();

    // WebSocket = r3 (1 rule)
    expect(screen.getByRole('tab', { name: /websocket, 1 rules/i })).toBeInTheDocument();
  });

  it('shows correct count for GraphQL tab', () => {
    renderRulesPage();

    // GraphQL = r4, r5 (2 rules with graphqlOperation)
    expect(screen.getByRole('tab', { name: /graphql, 2 rules/i })).toBeInTheDocument();
  });

  it('defaults to HTTP tab', () => {
    renderRulesPage();

    expect(screen.getByRole('tab', { name: /http/i })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('RulesPage — filtering by request type', () => {
  it('shows only HTTP rules by default (no GraphQL)', () => {
    renderRulesPage();

    // r1 and r2 are HTTP without graphqlOperation
    const cards = screen.getAllByText(/\/api\/users/);
    expect(cards.length).toBe(2);
    // Should NOT show /graphql or websocket URLs
    expect(screen.queryByText(/wss:\/\//)).not.toBeInTheDocument();
  });

  it('shows only WebSocket rules when WebSocket tab is selected', async () => {
    const user = userEvent.setup();
    renderRulesPage();

    await user.click(screen.getByRole('tab', { name: /websocket/i }));

    expect(screen.getByText(/wss:\/\/api\.example\.com\/ws/)).toBeInTheDocument();
    expect(screen.queryByText(/\/api\/users/)).not.toBeInTheDocument();
  });

  it('shows only GraphQL rules when GraphQL tab is selected', async () => {
    const user = userEvent.setup();
    renderRulesPage();

    await user.click(screen.getByRole('tab', { name: /graphql/i }));

    // GraphQL rules have /graphql URL and graphqlOperation set
    expect(screen.getAllByText(/\/graphql/).length).toBeGreaterThan(0);
  });
});

describe('RulesPage — empty state per type', () => {
  it('shows empty state when no rules match selected type', async () => {
    mockRulesState.rules = [
      makeRule({ id: 'r1', urlPattern: '/api/users', requestType: 'http' }),
    ];
    const user = userEvent.setup();
    renderRulesPage();

    await user.click(screen.getByRole('tab', { name: /websocket/i }));

    expect(screen.getByText(/no.*rules/i)).toBeInTheDocument();
  });
});
