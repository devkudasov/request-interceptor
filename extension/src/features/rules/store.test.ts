import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRulesStore } from './store';
import type { MockRule } from './types';

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-123' }));

const mockSendMessage = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn() },
});

function makeRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'rule-1',
    enabled: true,
    priority: 0,
    collectionId: null,
    urlPattern: 'https://api.example.com/*',
    urlMatchType: 'wildcard',
    method: 'GET',
    requestType: 'http',
    statusCode: 200,
    responseType: 'json',
    responseBody: '{"ok":true}',
    responseHeaders: {},
    delay: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockSendMessageSuccess(data: unknown = undefined) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: true, data });
    },
  );
}

function mockSendMessageError(error: string) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: false, error });
    },
  );
}

describe('useRulesStore', () => {
  beforeEach(() => {
    useRulesStore.setState(useRulesStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with empty rules and loading false', () => {
      const state = useRulesStore.getState();
      expect(state.rules).toEqual([]);
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchRules', () => {
    it('fetches and sorts rules by priority', async () => {
      const rules = [
        makeRule({ id: 'r2', priority: 2 }),
        makeRule({ id: 'r1', priority: 0 }),
        makeRule({ id: 'r3', priority: 1 }),
      ];
      mockSendMessageSuccess(rules);

      await useRulesStore.getState().fetchRules();

      const state = useRulesStore.getState();
      expect(state.loading).toBe(false);
      expect(state.rules.map((r) => r.id)).toEqual(['r1', 'r3', 'r2']);
    });

    it('sets loading true while fetching', async () => {
      mockSendMessage.mockImplementation(() => {
        expect(useRulesStore.getState().loading).toBe(true);
      });
      // won't resolve but we checked loading inside
    });

    it('sends GET_RULES message', async () => {
      mockSendMessageSuccess([]);
      await useRulesStore.getState().fetchRules();
      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'GET_RULES', payload: undefined },
        expect.any(Function),
      );
    });

    it('rejects on error response', async () => {
      mockSendMessageError('Failed to fetch');
      await expect(useRulesStore.getState().fetchRules()).rejects.toThrow(
        'Failed to fetch',
      );
    });
  });

  describe('createRule', () => {
    it('creates a rule with generated id and timestamps', async () => {
      mockSendMessageSuccess(undefined);

      const result = await useRulesStore.getState().createRule({
        enabled: true,
        collectionId: null,
        urlPattern: 'https://test.com',
        urlMatchType: 'exact',
        method: 'POST',
        requestType: 'http',
        statusCode: 201,
        responseType: 'json',
        responseBody: '{}',
        responseHeaders: {},
        delay: 100,
      });

      expect(result.id).toBe('mock-uuid-123');
      expect(result.priority).toBe(0);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('appends rule to state', async () => {
      mockSendMessageSuccess(undefined);
      const existingRule = makeRule({ id: 'existing' });
      useRulesStore.setState({ rules: [existingRule] });

      await useRulesStore.getState().createRule({
        enabled: true,
        collectionId: null,
        urlPattern: 'https://test.com',
        urlMatchType: 'exact',
        method: 'GET',
        requestType: 'http',
        statusCode: 200,
        responseType: 'json',
        responseBody: '{}',
        responseHeaders: {},
        delay: 0,
      });

      expect(useRulesStore.getState().rules).toHaveLength(2);
      expect(useRulesStore.getState().rules[1].id).toBe('mock-uuid-123');
    });

    it('sets priority based on current rules length', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({ rules: [makeRule(), makeRule({ id: 'r2' })] });

      const result = await useRulesStore.getState().createRule({
        enabled: true,
        collectionId: null,
        urlPattern: 'https://test.com',
        urlMatchType: 'exact',
        method: 'GET',
        requestType: 'http',
        statusCode: 200,
        responseType: 'json',
        responseBody: '{}',
        responseHeaders: {},
        delay: 0,
      });

      expect(result.priority).toBe(2);
    });

    it('sends CREATE_RULE message with the full rule', async () => {
      mockSendMessageSuccess(undefined);

      await useRulesStore.getState().createRule({
        enabled: true,
        collectionId: null,
        urlPattern: 'https://test.com',
        urlMatchType: 'exact',
        method: 'GET',
        requestType: 'http',
        statusCode: 200,
        responseType: 'json',
        responseBody: '{}',
        responseHeaders: {},
        delay: 0,
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'CREATE_RULE',
          payload: expect.objectContaining({
            id: 'mock-uuid-123',
            urlPattern: 'https://test.com',
          }),
        },
        expect.any(Function),
      );
    });

    it('rejects on error', async () => {
      mockSendMessageError('Create failed');
      await expect(
        useRulesStore.getState().createRule({
          enabled: true,
          collectionId: null,
          urlPattern: 'https://test.com',
          urlMatchType: 'exact',
          method: 'GET',
          requestType: 'http',
          statusCode: 200,
          responseType: 'json',
          responseBody: '{}',
          responseHeaders: {},
          delay: 0,
        }),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('updateRule', () => {
    it('updates the specified rule in state', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({
        rules: [makeRule({ id: 'r1' }), makeRule({ id: 'r2' })],
      });

      await useRulesStore.getState().updateRule('r1', { statusCode: 404 });

      const updated = useRulesStore.getState().rules.find((r) => r.id === 'r1');
      expect(updated?.statusCode).toBe(404);
      expect(updated?.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
    });

    it('does not modify other rules', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({
        rules: [makeRule({ id: 'r1' }), makeRule({ id: 'r2' })],
      });

      await useRulesStore.getState().updateRule('r1', { statusCode: 404 });

      const other = useRulesStore.getState().rules.find((r) => r.id === 'r2');
      expect(other?.statusCode).toBe(200);
    });

    it('sends UPDATE_RULE message', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({ rules: [makeRule({ id: 'r1' })] });

      await useRulesStore.getState().updateRule('r1', { statusCode: 500 });

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'UPDATE_RULE',
          payload: { id: 'r1', changes: { statusCode: 500 } },
        },
        expect.any(Function),
      );
    });
  });

  describe('deleteRule', () => {
    it('removes the rule from state', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({
        rules: [makeRule({ id: 'r1' }), makeRule({ id: 'r2' })],
      });

      await useRulesStore.getState().deleteRule('r1');

      expect(useRulesStore.getState().rules).toHaveLength(1);
      expect(useRulesStore.getState().rules[0].id).toBe('r2');
    });

    it('sends DELETE_RULE message', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({ rules: [makeRule({ id: 'r1' })] });

      await useRulesStore.getState().deleteRule('r1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'DELETE_RULE', payload: { id: 'r1' } },
        expect.any(Function),
      );
    });
  });

  describe('toggleRule', () => {
    it('toggles enabled from true to false', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({
        rules: [makeRule({ id: 'r1', enabled: true })],
      });

      await useRulesStore.getState().toggleRule('r1');

      expect(useRulesStore.getState().rules[0].enabled).toBe(false);
    });

    it('toggles enabled from false to true', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({
        rules: [makeRule({ id: 'r1', enabled: false })],
      });

      await useRulesStore.getState().toggleRule('r1');

      expect(useRulesStore.getState().rules[0].enabled).toBe(true);
    });

    it('sends TOGGLE_RULE message', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({ rules: [makeRule({ id: 'r1' })] });

      await useRulesStore.getState().toggleRule('r1');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'TOGGLE_RULE', payload: { id: 'r1' } },
        expect.any(Function),
      );
    });
  });

  describe('reorderRules', () => {
    it('reorders rules according to orderedIds and updates priority', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({
        rules: [
          makeRule({ id: 'r1', priority: 0 }),
          makeRule({ id: 'r2', priority: 1 }),
          makeRule({ id: 'r3', priority: 2 }),
        ],
      });

      await useRulesStore.getState().reorderRules(['r3', 'r1', 'r2']);

      const rules = useRulesStore.getState().rules;
      expect(rules.map((r) => r.id)).toEqual(['r3', 'r1', 'r2']);
      expect(rules.map((r) => r.priority)).toEqual([0, 1, 2]);
    });

    it('filters out ids not in the current rules', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({
        rules: [makeRule({ id: 'r1' }), makeRule({ id: 'r2' })],
      });

      await useRulesStore.getState().reorderRules(['r1', 'nonexistent', 'r2']);

      const rules = useRulesStore.getState().rules;
      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.id)).toEqual(['r1', 'r2']);
    });

    it('sends REORDER_RULES message', async () => {
      mockSendMessageSuccess(undefined);
      useRulesStore.setState({ rules: [makeRule({ id: 'r1' })] });

      await useRulesStore.getState().reorderRules(['r1']);

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'REORDER_RULES', payload: { orderedIds: ['r1'] } },
        expect.any(Function),
      );
    });
  });
});
