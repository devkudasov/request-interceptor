import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  GithubAuthProvider,
  type Auth,
  type User,
} from 'firebase/auth';
import { firebaseConfig } from './firebase-config';
import type { AuthUser } from '@/shared/types';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

const SESSION_KEY = '__ri_auth_user';

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    plan: 'free',
  };
}

export function initializeFirebase(): void {
  if (app) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return auth;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  const authInstance = getAuthInstance();
  const credential = await signInWithEmailAndPassword(authInstance, email, password);
  const authUser = mapFirebaseUser(credential.user);
  await chrome.storage.session.set({ [SESSION_KEY]: authUser });
  return authUser;
}

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  const authInstance = getAuthInstance();
  const credential = await createUserWithEmailAndPassword(authInstance, email, password);
  await sendEmailVerification(credential.user);
  const authUser = mapFirebaseUser(credential.user);
  await chrome.storage.session.set({ [SESSION_KEY]: authUser });
  return authUser;
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const authInstance = getAuthInstance();
  const redirectUrl = chrome.identity.getRedirectURL();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('Google Client ID is not configured');
  }

  const nonce = crypto.randomUUID();
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&response_type=token%20id_token` +
    `&scope=openid%20email%20profile` +
    `&nonce=${nonce}`;

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error('Google sign-in was cancelled');
  }

  const hash = new URL(responseUrl).hash.substring(1);
  const params = new URLSearchParams(hash);
  const idToken = params.get('id_token');

  if (!idToken) {
    throw new Error('Failed to get ID token from Google');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(authInstance, credential);
  const authUser = mapFirebaseUser(result.user);
  await chrome.storage.session.set({ [SESSION_KEY]: authUser });
  return authUser;
}

export async function signInWithGithub(): Promise<AuthUser> {
  const authInstance = getAuthInstance();
  const redirectUrl = chrome.identity.getRedirectURL();
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET;

  if (!clientId) {
    throw new Error('GitHub Client ID is not configured');
  }

  const authUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&scope=user:email`;

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error('GitHub sign-in was cancelled');
  }

  const url = new URL(responseUrl);
  const code = url.searchParams.get('code');

  if (!code) {
    throw new Error('Failed to get authorization code from GitHub');
  }

  // Exchange code for access token
  const tokenResponse = await fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUrl,
      }),
    },
  );

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error('Failed to exchange GitHub code for access token');
  }

  const credential = GithubAuthProvider.credential(accessToken);
  const result = await signInWithCredential(authInstance, credential);
  const authUser = mapFirebaseUser(result.user);
  await chrome.storage.session.set({ [SESSION_KEY]: authUser });
  return authUser;
}

export async function signOut(): Promise<void> {
  const authInstance = getAuthInstance();
  await firebaseSignOut(authInstance);
  await chrome.storage.session.remove(SESSION_KEY);
}

export function setupAuthListener(): void {
  const authInstance = getAuthInstance();
  onAuthStateChanged(authInstance, async (user) => {
    if (user) {
      const authUser = mapFirebaseUser(user);
      await chrome.storage.session.set({ [SESSION_KEY]: authUser });
    } else {
      await chrome.storage.session.remove(SESSION_KEY);
    }
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const result = await chrome.storage.session.get(SESSION_KEY);
  return (result[SESSION_KEY] as AuthUser) ?? null;
}
