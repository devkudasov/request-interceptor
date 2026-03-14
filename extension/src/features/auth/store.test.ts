import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './store';
import type { AuthUser } from './types';

const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: mockAddListener },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn() },
});

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    uid: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    emailVerified: true,
    plan: 'free',
    ...overrides,
  };
}

function mockSuccess(data: unknown = undefined) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: true, data });
    },
  );
}

function mockError(error: string) {
  mockSendMessage.mockImplementation(
    (_msg: unknown, cb: (response: unknown) => void) => {
      cb({ ok: false, error });
    },
  );
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState());
    vi.clearAllMocks();
    (chrome.runtime as unknown as Record<string, unknown>).lastError = null;
  });

  describe('initial state', () => {
    it('starts with null user, no loading, no error', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('sets user on success', async () => {
      const user = makeUser();
      mockSuccess(user);

      await useAuthStore.getState().login('test@example.com', 'password');

      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().loading).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('sends LOGIN message with email and password', async () => {
      mockSuccess(makeUser());

      await useAuthStore.getState().login('a@b.com', 'pass123');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'LOGIN', payload: { email: 'a@b.com', password: 'pass123' } },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Invalid credentials');

      await useAuthStore.getState().login('a@b.com', 'wrong');

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().loading).toBe(false);
      expect(useAuthStore.getState().error).toBe('Invalid credentials');
    });

    it('clears previous error on new login attempt', async () => {
      useAuthStore.setState({ error: 'Previous error' });
      mockSuccess(makeUser());

      await useAuthStore.getState().login('a@b.com', 'pass');

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('register', () => {
    it('sets user on success', async () => {
      const user = makeUser({ uid: 'new-user' });
      mockSuccess(user);

      await useAuthStore.getState().register('new@test.com', 'password');

      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('sends REGISTER message', async () => {
      mockSuccess(makeUser());

      await useAuthStore.getState().register('a@b.com', 'pass');

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'REGISTER', payload: { email: 'a@b.com', password: 'pass' } },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Email already exists');

      await useAuthStore.getState().register('a@b.com', 'pass');

      expect(useAuthStore.getState().error).toBe('Email already exists');
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('loginWithGoogle', () => {
    it('sets user on success', async () => {
      const user = makeUser({ uid: 'google-user' });
      mockSuccess(user);

      await useAuthStore.getState().loginWithGoogle();

      expect(useAuthStore.getState().user).toEqual(user);
    });

    it('sends LOGIN_GOOGLE message', async () => {
      mockSuccess(makeUser());

      await useAuthStore.getState().loginWithGoogle();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'LOGIN_GOOGLE', payload: undefined },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('Google auth failed');

      await useAuthStore.getState().loginWithGoogle();

      expect(useAuthStore.getState().error).toBe('Google auth failed');
    });
  });

  describe('loginWithGithub', () => {
    it('sets user on success', async () => {
      const user = makeUser({ uid: 'github-user' });
      mockSuccess(user);

      await useAuthStore.getState().loginWithGithub();

      expect(useAuthStore.getState().user).toEqual(user);
    });

    it('sends LOGIN_GITHUB message', async () => {
      mockSuccess(makeUser());

      await useAuthStore.getState().loginWithGithub();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'LOGIN_GITHUB', payload: undefined },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      mockError('GitHub auth failed');

      await useAuthStore.getState().loginWithGithub();

      expect(useAuthStore.getState().error).toBe('GitHub auth failed');
    });
  });

  describe('logout', () => {
    it('clears user on success', async () => {
      useAuthStore.setState({ user: makeUser() });
      mockSuccess(undefined);

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('sends LOGOUT message', async () => {
      mockSuccess(undefined);

      await useAuthStore.getState().logout();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'LOGOUT', payload: undefined },
        expect.any(Function),
      );
    });

    it('sets error on failure', async () => {
      useAuthStore.setState({ user: makeUser() });
      mockError('Logout failed');

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().error).toBe('Logout failed');
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('fetchUser', () => {
    it('sets user on success', async () => {
      const user = makeUser();
      mockSuccess(user);

      await useAuthStore.getState().fetchUser();

      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('sets user to null when response is null', async () => {
      mockSuccess(null);

      await useAuthStore.getState().fetchUser();

      expect(useAuthStore.getState().user).toBeNull();
    });

    it('sets user to null on error (silent catch)', async () => {
      mockError('Not authenticated');

      await useAuthStore.getState().fetchUser();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('sends GET_CURRENT_USER message', async () => {
      mockSuccess(null);

      await useAuthStore.getState().fetchUser();

      expect(mockSendMessage).toHaveBeenCalledWith(
        { type: 'GET_CURRENT_USER', payload: undefined },
        expect.any(Function),
      );
    });
  });

  describe('clearError', () => {
    it('clears the error', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('startAuthListener', () => {
    it('registers a chrome.runtime.onMessage listener', () => {
      useAuthStore.getState().startAuthListener();

      expect(mockAddListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('updates user on AUTH_STATE_CHANGED message', () => {
      useAuthStore.getState().startAuthListener();

      const listener = mockAddListener.mock.calls[0][0];
      const user = makeUser({ uid: 'new-user' });
      listener({ type: 'AUTH_STATE_CHANGED', payload: user });

      expect(useAuthStore.getState().user).toEqual(user);
    });

    it('sets user to null on AUTH_STATE_CHANGED with null payload', () => {
      useAuthStore.setState({ user: makeUser() });
      useAuthStore.getState().startAuthListener();

      const listener = mockAddListener.mock.calls[0][0];
      listener({ type: 'AUTH_STATE_CHANGED', payload: null });

      expect(useAuthStore.getState().user).toBeNull();
    });

    it('ignores non-AUTH_STATE_CHANGED messages', () => {
      useAuthStore.setState({ user: makeUser() });
      useAuthStore.getState().startAuthListener();

      const listener = mockAddListener.mock.calls[0][0];
      listener({ type: 'SOME_OTHER_MESSAGE', payload: null });

      expect(useAuthStore.getState().user).toEqual(makeUser());
    });
  });
});
