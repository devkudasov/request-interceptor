import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';
import { sendMessage } from '@/shared/utils/messaging';
import type { AuthUser } from './types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  startAuthListener: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const user = await sendMessage<AuthUser>(MESSAGE_TYPES.LOGIN, { email, password });
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  register: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const user = await sendMessage<AuthUser>(MESSAGE_TYPES.REGISTER, { email, password });
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const user = await sendMessage<AuthUser>(MESSAGE_TYPES.LOGIN_GOOGLE);
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loginWithGithub: async () => {
    set({ loading: true, error: null });
    try {
      const user = await sendMessage<AuthUser>(MESSAGE_TYPES.LOGIN_GITHUB);
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await sendMessage(MESSAGE_TYPES.LOGOUT);
      set({ user: null, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  fetchUser: async () => {
    set({ loading: true });
    try {
      const user = await sendMessage<AuthUser | null>(MESSAGE_TYPES.GET_CURRENT_USER);
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  clearError: () => set({ error: null }),

  startAuthListener: () => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === MESSAGE_TYPES.AUTH_STATE_CHANGED) {
        set({ user: message.payload as AuthUser | null });
      }
    });
  },
}));
