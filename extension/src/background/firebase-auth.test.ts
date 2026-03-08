import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const {
  mockSignInWithEmailAndPassword,
  mockCreateUserWithEmailAndPassword,
  mockSignInWithCredential,
  mockSignOut,
  mockOnAuthStateChanged,
  mockSendEmailVerification,
  mockGoogleAuthProvider,
  mockGithubAuthProvider,
} = vi.hoisted(() => ({
  mockSignInWithEmailAndPassword: vi.fn(),
  mockCreateUserWithEmailAndPassword: vi.fn(),
  mockSignInWithCredential: vi.fn(),
  mockSignOut: vi.fn(),
  mockOnAuthStateChanged: vi.fn(),
  mockSendEmailVerification: vi.fn(),
  mockGoogleAuthProvider: { credential: vi.fn() },
  mockGithubAuthProvider: { credential: vi.fn() },
}));

// Mock firebase/app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApp: vi.fn(),
}));

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithCredential: mockSignInWithCredential,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
  sendEmailVerification: mockSendEmailVerification,
  GoogleAuthProvider: {
    credential: mockGoogleAuthProvider.credential,
  },
  GithubAuthProvider: {
    credential: mockGithubAuthProvider.credential,
  },
}));

// Mock chrome APIs
const mockChromeStorage: Record<string, unknown> = {};

const mockChrome = {
  identity: {
    getRedirectURL: vi.fn(() => 'https://test-extension-id.chromiumapp.org/'),
    launchWebAuthFlow: vi.fn(),
  },
  storage: {
    session: {
      get: vi.fn((keys: string | string[]) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        const result: Record<string, unknown> = {};
        for (const key of keyList) {
          if (key in mockChromeStorage) {
            result[key] = mockChromeStorage[key];
          }
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockChromeStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          delete mockChromeStorage[key];
        }
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    id: 'test-extension-id',
  },
};

vi.stubGlobal('chrome', mockChrome);

// Provide env vars for OAuth
import.meta.env.VITE_GOOGLE_CLIENT_ID = 'mock-google-client-id';
import.meta.env.VITE_GITHUB_CLIENT_ID = 'mock-github-client-id';
import.meta.env.VITE_GITHUB_CLIENT_SECRET = 'mock-github-secret';

import {
  initializeFirebase,
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  signInWithGithub,
  signOut as firebaseSignOut,
  setupAuthListener,
  getCurrentUser,
} from './firebase-auth';

const mockUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  getIdToken: vi.fn(() => Promise.resolve('mock-id-token')),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockChromeStorage).forEach((k) => delete mockChromeStorage[k]);
});

describe('initializeFirebase', () => {
  it('initializes Firebase app without throwing', () => {
    expect(() => initializeFirebase()).not.toThrow();
  });
});

describe('signInWithEmail', () => {
  it('calls Firebase signInWithEmailAndPassword with correct args', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const result = await signInWithEmail('test@example.com', 'password123');

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password123'
    );
    expect(result).toBeDefined();
    expect(result.email).toBe('test@example.com');
  });

  it('throws on invalid credentials', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(
      new Error('auth/invalid-credential')
    );

    await expect(
      signInWithEmail('test@example.com', 'wrongpassword')
    ).rejects.toThrow('auth/invalid-credential');
  });

  it('throws on network error', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(
      new Error('auth/network-request-failed')
    );

    await expect(
      signInWithEmail('test@example.com', 'password123')
    ).rejects.toThrow('auth/network-request-failed');
  });
});

describe('registerWithEmail', () => {
  it('calls Firebase createUserWithEmailAndPassword and sends email verification', async () => {
    const newUser = { ...mockUser, emailVerified: false };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: newUser });
    mockSendEmailVerification.mockResolvedValue(undefined);

    const result = await registerWithEmail('new@example.com', 'password123');

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'new@example.com',
      'password123'
    );
    expect(mockSendEmailVerification).toHaveBeenCalledWith(newUser);
    expect(result).toBeDefined();
  });

  it('throws on weak password', async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue(
      new Error('auth/weak-password')
    );

    await expect(
      registerWithEmail('new@example.com', '123')
    ).rejects.toThrow('auth/weak-password');
  });

  it('throws on email already in use', async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue(
      new Error('auth/email-already-in-use')
    );

    await expect(
      registerWithEmail('existing@example.com', 'password123')
    ).rejects.toThrow('auth/email-already-in-use');
  });
});

describe('signInWithGoogle', () => {
  it('launches OAuth flow via chrome.identity and exchanges credential with Firebase', async () => {
    const redirectUrl = 'https://test-extension-id.chromiumapp.org/#id_token=mock-id-token&token_type=bearer';
    (mockChrome.identity.launchWebAuthFlow as Mock).mockResolvedValue(redirectUrl);
    mockGoogleAuthProvider.credential.mockReturnValue({ providerId: 'google.com' });
    mockSignInWithCredential.mockResolvedValue({ user: mockUser });

    const result = await signInWithGoogle();

    expect(mockChrome.identity.launchWebAuthFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive: true,
        url: expect.stringContaining('accounts.google.com'),
      })
    );
    expect(mockSignInWithCredential).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('throws when popup is blocked or closed', async () => {
    (mockChrome.identity.launchWebAuthFlow as Mock).mockRejectedValue(
      new Error('The user did not approve access.')
    );

    await expect(signInWithGoogle()).rejects.toThrow();
  });

  it('throws when OAuth flow returns no redirect URL', async () => {
    (mockChrome.identity.launchWebAuthFlow as Mock).mockResolvedValue(undefined);

    await expect(signInWithGoogle()).rejects.toThrow();
  });
});

describe('signInWithGithub', () => {
  it('launches OAuth flow via chrome.identity for GitHub and exchanges credential', async () => {
    const redirectUrl = 'https://test-extension-id.chromiumapp.org/?code=mock-github-code';
    (mockChrome.identity.launchWebAuthFlow as Mock).mockResolvedValue(redirectUrl);
    mockGithubAuthProvider.credential.mockReturnValue({ providerId: 'github.com' });
    mockSignInWithCredential.mockResolvedValue({ user: mockUser });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ access_token: 'mock-github-token' }),
    })));

    const result = await signInWithGithub();

    expect(mockChrome.identity.launchWebAuthFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive: true,
        url: expect.stringContaining('github.com'),
      })
    );
    expect(mockSignInWithCredential).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('throws when GitHub OAuth is rejected', async () => {
    (mockChrome.identity.launchWebAuthFlow as Mock).mockRejectedValue(
      new Error('The user did not approve access.')
    );

    await expect(signInWithGithub()).rejects.toThrow();
  });
});

describe('signOut', () => {
  it('signs out from Firebase and clears auth state from storage', async () => {
    mockSignOut.mockResolvedValue(undefined);

    await firebaseSignOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockChrome.storage.session.remove).toHaveBeenCalledWith('__ri_auth_user');
  });
});

describe('setupAuthListener', () => {
  it('persists user to chrome.storage.session when user signs in', () => {
    let authCallback: (user: typeof mockUser | null) => void = () => {};
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof authCallback) => {
      authCallback = cb;
      return vi.fn();
    });

    initializeFirebase();
    setupAuthListener();

    authCallback(mockUser);

    expect(mockChrome.storage.session.set).toHaveBeenCalledWith(
      expect.objectContaining({
        __ri_auth_user: expect.objectContaining({
          uid: 'user-123',
          email: 'test@example.com',
        }),
      })
    );
  });

  it('clears user from storage when user signs out', () => {
    let authCallback: (user: typeof mockUser | null) => void = () => {};
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof authCallback) => {
      authCallback = cb;
      return vi.fn();
    });

    initializeFirebase();
    setupAuthListener();

    authCallback(null);

    expect(mockChrome.storage.session.remove).toHaveBeenCalledWith('__ri_auth_user');
  });
});

describe('getCurrentUser', () => {
  it('returns user from chrome.storage.session', async () => {
    mockChromeStorage['__ri_auth_user'] = {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    const user = await getCurrentUser();

    expect(user).toBeDefined();
    expect(user?.uid).toBe('user-123');
    expect(user?.email).toBe('test@example.com');
  });

  it('returns null when no user in storage', async () => {
    const user = await getCurrentUser();

    expect(user).toBeNull();
  });
});

describe('error cases', () => {
  it('handles token expired error', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(
      new Error('auth/user-token-expired')
    );

    await expect(
      signInWithEmail('test@example.com', 'password123')
    ).rejects.toThrow('auth/user-token-expired');
  });

  it('handles too-many-requests error', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(
      new Error('auth/too-many-requests')
    );

    await expect(
      signInWithEmail('test@example.com', 'password123')
    ).rejects.toThrow('auth/too-many-requests');
  });
});
