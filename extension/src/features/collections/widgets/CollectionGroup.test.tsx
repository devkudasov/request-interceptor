import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionGroup } from './CollectionGroup';
import type { MockRule } from '@/features/rules';
import type { Collection } from '@/features/collections';

const mockToggleCollection = vi.fn();
const mockToggleRule = vi.fn();
const mockEditRule = vi.fn();
const mockDeleteRule = vi.fn();
const mockToggleCollapsed = vi.fn();

function makeRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'r1',
    enabled: true,
    priority: 0,
    collectionId: 'c1',
    urlPattern: '/api/test',
    urlMatchType: 'wildcard',
    method: 'GET',
    requestType: 'http',
    statusCode: 200,
    responseType: 'json',
    responseBody: '{}',
    responseHeaders: {},
    delay: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const defaultCollection: Collection = {
  id: 'c1',
  name: 'API Mocks',
  parentId: null,
  enabled: true,
  order: 0,
  ruleIds: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const defaultProps = {
  collection: defaultCollection,
  rules: [makeRule({ id: 'r1' }), makeRule({ id: 'r2', urlPattern: '/api/users' })],
  childCollections: [],
  allCollections: [],
  allRules: [],
  depth: 0,
  collapsed: false,
  onToggleCollapsed: mockToggleCollapsed,
  onToggleCollection: mockToggleCollection,
  onToggleRule: mockToggleRule,
  onEditRule: mockEditRule,
  onDeleteRule: mockDeleteRule,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CollectionGroup — header', () => {
  it('renders collection name', () => {
    render(<CollectionGroup {...defaultProps} />);

    expect(screen.getByText('API Mocks')).toBeInTheDocument();
  });

  it('renders rule count badge', () => {
    render(<CollectionGroup {...defaultProps} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders rule count badge with zero when no rules', () => {
    render(<CollectionGroup {...defaultProps} rules={[]} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders expand/collapse button', () => {
    render(<CollectionGroup {...defaultProps} />);

    expect(screen.getByRole('button', { name: /toggle.*api mocks/i })).toBeInTheDocument();
  });

  it('calls onToggleCollection when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionGroup {...defaultProps} />);

    const toggles = screen.getAllByRole('switch');
    await user.click(toggles[0]);

    expect(mockToggleCollection).toHaveBeenCalledWith('c1');
  });
});

describe('CollectionGroup — expand/collapse', () => {
  it('shows rules when not collapsed', () => {
    render(<CollectionGroup {...defaultProps} collapsed={false} />);

    expect(screen.getByText('/api/test')).toBeInTheDocument();
    expect(screen.getByText('/api/users')).toBeInTheDocument();
  });

  it('hides rules when collapsed', () => {
    render(<CollectionGroup {...defaultProps} collapsed={true} />);

    expect(screen.queryByText('/api/test')).not.toBeInTheDocument();
    expect(screen.queryByText('/api/users')).not.toBeInTheDocument();
  });

  it('calls onToggleCollapsed when expand/collapse button is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionGroup {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /toggle.*api mocks/i }));

    expect(mockToggleCollapsed).toHaveBeenCalledWith('c1');
  });
});

describe('CollectionGroup — rules', () => {
  it('renders RuleCards for each rule when expanded', () => {
    render(<CollectionGroup {...defaultProps} />);

    expect(screen.getByText('/api/test')).toBeInTheDocument();
    expect(screen.getByText('/api/users')).toBeInTheDocument();
  });

  it('shows empty message when no rules and expanded', () => {
    render(<CollectionGroup {...defaultProps} rules={[]} />);

    expect(screen.getByText(/no rules/i)).toBeInTheDocument();
  });

  it('calls onToggleRule when rule toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionGroup {...defaultProps} rules={[makeRule({ id: 'r1' })]} />);

    const toggles = screen.getAllByRole('switch');
    // First toggle is collection, second is rule
    const ruleToggle = toggles[toggles.length - 1];
    await user.click(ruleToggle);

    expect(mockToggleRule).toHaveBeenCalledWith('r1');
  });

  it('calls onEditRule when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionGroup {...defaultProps} rules={[makeRule({ id: 'r1' })]} />);

    await user.click(screen.getByText('Edit'));

    expect(mockEditRule).toHaveBeenCalledWith('r1');
  });

  it('calls onDeleteRule when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionGroup {...defaultProps} rules={[makeRule({ id: 'r1' })]} />);

    await user.click(screen.getByText('Del'));

    expect(mockDeleteRule).toHaveBeenCalledWith('r1');
  });
});

describe('CollectionGroup — depth indentation', () => {
  it('applies no left margin at depth 0', () => {
    const { container } = render(<CollectionGroup {...defaultProps} depth={0} />);

    const group = container.firstElementChild as HTMLElement;
    expect(group.style.marginLeft).toBe('');
  });

  it('applies left margin at depth 1', () => {
    const { container } = render(<CollectionGroup {...defaultProps} depth={1} />);

    const group = container.firstElementChild as HTMLElement;
    expect(group.style.marginLeft).toBe('16px');
  });

  it('applies double left margin at depth 2', () => {
    const { container } = render(<CollectionGroup {...defaultProps} depth={2} />);

    const group = container.firstElementChild as HTMLElement;
    expect(group.style.marginLeft).toBe('32px');
  });
});

describe('CollectionGroup — nested collections', () => {
  it('renders child collections when expanded', () => {
    const childCollection: Collection = {
      ...defaultCollection,
      id: 'c2',
      name: 'Child Collection',
      parentId: 'c1',
    };

    render(
      <CollectionGroup
        {...defaultProps}
        childCollections={[childCollection]}
        allCollections={[defaultCollection, childCollection]}
        allRules={[]}
      />,
    );

    expect(screen.getByText('Child Collection')).toBeInTheDocument();
  });

  it('hides child collections when collapsed', () => {
    const childCollection: Collection = {
      ...defaultCollection,
      id: 'c2',
      name: 'Child Collection',
      parentId: 'c1',
    };

    render(
      <CollectionGroup
        {...defaultProps}
        collapsed={true}
        childCollections={[childCollection]}
        allCollections={[defaultCollection, childCollection]}
        allRules={[]}
      />,
    );

    expect(screen.queryByText('Child Collection')).not.toBeInTheDocument();
  });
});

describe('CollectionGroup — disabled state', () => {
  it('shows reduced opacity when collection is disabled', () => {
    const disabledCollection = { ...defaultCollection, enabled: false };
    const { container } = render(
      <CollectionGroup {...defaultProps} collection={disabledCollection} />,
    );

    const group = container.firstElementChild as HTMLElement;
    expect(group.className).toContain('opacity-50');
  });
});
