import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { MockRule } from './types';

interface RulesState {
  rules: MockRule[];
  loading: boolean;
  fetchRules: () => Promise<void>;
  createRule: (rule: Omit<MockRule, 'id' | 'createdAt' | 'updatedAt' | 'priority'>) => Promise<MockRule>;
  updateRule: (id: string, changes: Partial<MockRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  reorderRules: (orderedIds: string[]) => Promise<void>;
}

export const useRulesStore = create<RulesState>((set, get) => ({
  rules: [],
  loading: false,

  fetchRules: async () => {
    set({ loading: true });
    const rules = await sendMessage<MockRule[]>(MESSAGE_TYPES.GET_RULES);
    set({ rules: rules.sort((a, b) => a.priority - b.priority), loading: false });
  },

  createRule: async (ruleData) => {
    const now = new Date().toISOString();
    const rule: MockRule = {
      ...ruleData,
      id: uuid(),
      priority: get().rules.length,
      createdAt: now,
      updatedAt: now,
    };
    await sendMessage(MESSAGE_TYPES.CREATE_RULE, rule);
    set((s) => ({ rules: [...s.rules, rule] }));
    return rule;
  },

  updateRule: async (id, changes) => {
    await sendMessage(MESSAGE_TYPES.UPDATE_RULE, { id, changes });
    set((s) => ({
      rules: s.rules.map((r) =>
        r.id === id ? { ...r, ...changes, updatedAt: new Date().toISOString() } : r,
      ),
    }));
  },

  deleteRule: async (id) => {
    await sendMessage(MESSAGE_TYPES.DELETE_RULE, { id });
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
  },

  toggleRule: async (id) => {
    await sendMessage(MESSAGE_TYPES.TOGGLE_RULE, { id });
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    }));
  },

  reorderRules: async (orderedIds) => {
    await sendMessage(MESSAGE_TYPES.REORDER_RULES, { orderedIds });
    set((s) => {
      const map = new Map(s.rules.map((r) => [r.id, r]));
      return {
        rules: orderedIds
          .map((id, i) => {
            const rule = map.get(id);
            return rule ? { ...rule, priority: i } : null;
          })
          .filter((r): r is MockRule => r !== null),
      };
    });
  },
}));
