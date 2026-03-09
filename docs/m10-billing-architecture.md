# M10: Stripe Billing — Technical Architecture

## 1. Overview

This document defines the technical architecture for M10 (Stripe Billing). It covers Firebase Cloud Functions, Firestore schema changes, frontend components, data flows, and a task breakdown for implementation.

**Key constraints:**
- Backend is Firebase Cloud Functions (no NestJS)
- Stripe Checkout + Customer Portal for payment UX (no custom payment forms)
- Extension side panel is a `MemoryRouter` — Stripe redirect URLs use `chrome-extension://` scheme
- The `firebase/` directory does not yet exist in the project; M10 creates it

---

## 2. Firebase Cloud Functions

### 2.1 Project Structure

```
projects/request-interceptor/
└── firebase/
    ├── firebase.json              # Firebase project config (hosting, functions, firestore)
    ├── .firebaserc                # Project alias (request-intercaptor)
    ├── firestore.rules            # Security rules
    ├── firestore.indexes.json     # Composite indexes
    └── functions/
        ├── package.json
        ├── tsconfig.json
        ├── .eslintrc.js
        └── src/
            ├── index.ts           # Exports all Cloud Functions
            ├── config.ts          # Stripe + Firebase config helpers
            ├── stripe/
            │   ├── checkout.ts    # createCheckoutSession callable
            │   ├── portal.ts      # createCustomerPortalSession callable
            │   ├── webhook.ts     # stripeWebhook HTTPS endpoint
            │   └── helpers.ts     # Shared Stripe utilities (getOrCreateCustomer, mapProductToPlan)
            └── types.ts           # Shared types for Cloud Functions
```

### 2.2 Dependencies (`functions/package.json`)

```json
{
  "name": "request-interceptor-functions",
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions",
    "lint": "eslint src/"
  },
  "engines": { "node": "20" },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "stripe": "^17.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.0.0"
  }
}
```

### 2.3 Configuration (`src/config.ts`)

Stripe secrets are stored via Firebase environment config, not hardcoded.

```typescript
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin once
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();

// Stripe singleton — initialized lazily from environment config
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new functions.https.HttpsError('internal', 'Stripe secret key not configured');
    }
    stripeInstance = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' });
  }
  return stripeInstance;
}

export const PRODUCT_TO_PLAN: Record<string, 'pro' | 'team'> = {
  'prod_U7O6buq8fg5tZ5': 'pro',
  'prod_U7O791CNkuR3Ho': 'team',
};
```

> **Note:** Use `firebase functions:secrets:set STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (Firebase v2 secret manager) rather than the deprecated `functions.config()`.

### 2.4 Shared Types (`src/types.ts`)

```typescript
export interface CreateCheckoutSessionRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CreateCustomerPortalSessionRequest {
  returnUrl: string;
}

export interface CreateCustomerPortalSessionResponse {
  url: string;
}

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';

export interface BillingRecord {
  stripeCustomerId: string;
  subscriptionId: string;
  plan: 'pro' | 'team';
  status: SubscriptionStatus;
  currentPeriodEnd: FirebaseFirestore.Timestamp;
  cancelAtPeriodEnd: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### 2.5 `createCheckoutSession` (Callable)

**File:** `src/stripe/checkout.ts`

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStripe, db } from '../config';
import { getOrCreateCustomer } from './helpers';
import type { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '../types';

export const createCheckoutSession = onCall<
  CreateCheckoutSessionRequest,
  Promise<CreateCheckoutSessionResponse>
>(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { priceId, successUrl, cancelUrl } = request.data;

    // 2. Validate input
    if (!priceId || typeof priceId !== 'string') {
      throw new HttpsError('invalid-argument', 'priceId is required');
    }
    if (!successUrl || !cancelUrl) {
      throw new HttpsError('invalid-argument', 'successUrl and cancelUrl are required');
    }

    const uid = request.auth.uid;
    const stripe = getStripe();

    // 3. Check for existing active subscription
    const userDoc = await db.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    if (userData?.subscriptionStatus === 'active') {
      throw new HttpsError('already-exists', 'You already have an active subscription');
    }

    // 4. Get or create Stripe customer
    const customerId = await getOrCreateCustomer(uid, request.auth.token.email ?? '');

    // 5. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { firebaseUID: uid },
      subscription_data: {
        metadata: { firebaseUID: uid },
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  },
);
```

**Error handling:**

| Condition | Error Code | Message |
|-----------|-----------|---------|
| Not authenticated | `unauthenticated` | Must be logged in |
| Missing `priceId` | `invalid-argument` | priceId is required |
| Already subscribed | `already-exists` | You already have an active subscription |
| Stripe API failure | `internal` | Failed to create checkout session |

### 2.6 `createCustomerPortalSession` (Callable)

**File:** `src/stripe/portal.ts`

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStripe, db } from '../config';
import type {
  CreateCustomerPortalSessionRequest,
  CreateCustomerPortalSessionResponse,
} from '../types';

export const createCustomerPortalSession = onCall<
  CreateCustomerPortalSessionRequest,
  Promise<CreateCustomerPortalSessionResponse>
>(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { returnUrl } = request.data;
    if (!returnUrl) {
      throw new HttpsError('invalid-argument', 'returnUrl is required');
    }

    const uid = request.auth.uid;
    const userDoc = await db.doc(`users/${uid}`).get();
    const stripeCustomerId = userDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new HttpsError('not-found', 'No billing account found');
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  },
);
```

### 2.7 `stripeWebhook` (HTTPS Endpoint)

**File:** `src/stripe/webhook.ts`

This is an HTTPS function (not callable) because Stripe sends raw POST requests with a signature header.

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { getStripe, db, PRODUCT_TO_PLAN } from '../config';
import * as admin from 'firebase-admin';
import type Stripe from 'stripe';

export const stripeWebhook = onRequest(
  {
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    cors: false,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const stripe = getStripe();
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).send('Invalid signature');
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      res.status(200).json({ received: true });
    } catch (err) {
      console.error(`Error processing webhook ${event.type}:`, err);
      res.status(500).send('Webhook processing failed');
    }
  },
);
```

**Webhook handler implementations:**

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const uid = session.metadata?.firebaseUID;
  if (!uid) {
    console.error('No firebaseUID in checkout session metadata');
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
    expand: ['items.data.price.product'],
  });

  const product = subscription.items.data[0]?.price?.product as Stripe.Product;
  const plan = PRODUCT_TO_PLAN[product.id];
  if (!plan) {
    console.error(`Unknown product ID: ${product.id}`);
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const billingFields = {
    plan,
    stripeCustomerId: session.customer as string,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
      subscription.current_period_end * 1000,
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  const batch = db.batch();

  // Update users/{uid}
  batch.update(db.doc(`users/${uid}`), { ...billingFields, updatedAt: now });

  // Write billing/{uid} audit record
  batch.set(db.doc(`billing/${uid}`), {
    ...billingFields,
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const uid = subscription.metadata?.firebaseUID;
  if (!uid) return;

  const product = subscription.items.data[0]?.price?.product as string;
  const plan = PRODUCT_TO_PLAN[product] ?? 'free';

  const now = admin.firestore.FieldValue.serverTimestamp();
  const fields = {
    plan,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
      subscription.current_period_end * 1000,
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.update(db.doc(`users/${uid}`), fields);
  batch.update(db.doc(`billing/${uid}`), fields);
  await batch.commit();
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const uid = subscription.metadata?.firebaseUID;
  if (!uid) return;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.update(db.doc(`users/${uid}`), {
    plan: 'free',
    subscriptionId: null,
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    updatedAt: now,
  });

  batch.update(db.doc(`billing/${uid}`), {
    status: 'canceled',
    cancelAtPeriodEnd: false,
    updatedAt: now,
  });

  await batch.commit();
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Find user by subscriptionId
  const snapshot = await db
    .collection('users')
    .where('subscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const uid = snapshot.docs[0].id;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const batch = db.batch();
  batch.update(db.doc(`users/${uid}`), {
    subscriptionStatus: 'past_due',
    updatedAt: now,
  });
  batch.update(db.doc(`billing/${uid}`), {
    status: 'past_due',
    updatedAt: now,
  });
  await batch.commit();
}
```

### 2.8 Stripe Helpers (`src/stripe/helpers.ts`)

```typescript
import { getStripe, db } from '../config';

/**
 * Gets existing Stripe customer or creates a new one.
 * Saves stripeCustomerId to Firestore on creation.
 */
export async function getOrCreateCustomer(uid: string, email: string): Promise<string> {
  const userDoc = await db.doc(`users/${uid}`).get();
  const existing = userDoc.data()?.stripeCustomerId;

  if (existing) return existing;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { firebaseUID: uid },
  });

  await db.doc(`users/${uid}`).update({ stripeCustomerId: customer.id });
  return customer.id;
}
```

### 2.9 Function Entry Point (`src/index.ts`)

```typescript
export { createCheckoutSession } from './stripe/checkout';
export { createCustomerPortalSession } from './stripe/portal';
export { stripeWebhook } from './stripe/webhook';
```

---

## 3. Firestore Schema Updates

### 3.1 `users/{uid}` — New Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `stripeCustomerId` | `string \| null` | `null` | Stripe Customer ID |
| `subscriptionId` | `string \| null` | `null` | Active Stripe Subscription ID |
| `subscriptionStatus` | `'active' \| 'canceled' \| 'past_due' \| 'incomplete' \| null` | `null` | Current subscription status |
| `currentPeriodEnd` | `Timestamp \| null` | `null` | Billing period end date |
| `cancelAtPeriodEnd` | `boolean` | `false` | Whether subscription cancels at period end |

All billing fields on `users/{uid}` are written exclusively by Cloud Functions via webhooks. The client reads them through its existing Firestore `onSnapshot` listener.

### 3.2 `billing/{uid}` — Audit Collection

| Field | Type | Description |
|-------|------|-------------|
| `stripeCustomerId` | `string` | Stripe Customer ID |
| `subscriptionId` | `string` | Stripe Subscription ID |
| `plan` | `'pro' \| 'team'` | Subscribed plan |
| `status` | `'active' \| 'canceled' \| 'past_due' \| 'incomplete'` | Subscription status |
| `currentPeriodEnd` | `Timestamp` | Billing period end |
| `cancelAtPeriodEnd` | `boolean` | Pending cancellation flag |
| `createdAt` | `Timestamp` | Record creation time |
| `updatedAt` | `Timestamp` | Last update time |

This is a single-document collection (one doc per user), written only by Cloud Functions.

### 3.3 Security Rules

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;

      // Client can update user profile fields but NOT billing fields
      allow update: if request.auth != null
        && request.auth.uid == uid
        && !request.resource.data.diff(resource.data).affectedKeys()
            .hasAny(['plan', 'stripeCustomerId', 'subscriptionId',
                     'subscriptionStatus', 'currentPeriodEnd', 'cancelAtPeriodEnd']);

      allow create: if request.auth != null && request.auth.uid == uid;
    }

    match /billing/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false; // Only Cloud Functions (Admin SDK) write here
    }

    // ... existing rules for teams, invites, etc. remain unchanged
  }
}
```

### 3.4 Index Requirements

One composite index is needed for the `handlePaymentFailed` query:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "subscriptionId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

This is a single-field index (Firestore auto-creates these). No custom composite indexes are needed for M10.

---

## 4. Frontend Architecture

### 4.1 Type Updates

**File:** `extension/src/shared/types.ts`

Add `PlanLimits` interface and extend `AuthUser`:

```typescript
// New type
export interface PlanLimits {
  maxRules: number;
  maxCollections: number;
  maxTeamMembers: number;
  cloudSync: boolean;
  versionHistory: boolean;
  importExport: boolean;
  storageBytes: number;
}

// Updated AuthUser — add billing fields
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  plan: AuthPlan;
  // New M10 billing fields:
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'incomplete' | null;
  currentPeriodEnd?: string | null;   // ISO string (serialized from Firestore Timestamp)
  cancelAtPeriodEnd?: boolean;
  storageUsedBytes?: number;
}
```

### 4.2 New File: `shared/billing.ts`

Plan limits constant and quota check helpers.

```typescript
import type { AuthPlan, PlanLimits } from './types';

export const PLAN_LIMITS: Record<AuthPlan, PlanLimits> = {
  free: {
    maxRules: 10,
    maxCollections: 3,
    maxTeamMembers: 0,
    cloudSync: false,
    versionHistory: false,
    importExport: true,
    storageBytes: 5 * 1024 * 1024,
  },
  pro: {
    maxRules: 100,
    maxCollections: 20,
    maxTeamMembers: 0,
    cloudSync: true,
    versionHistory: true,
    importExport: true,
    storageBytes: 50 * 1024 * 1024,
  },
  team: {
    maxRules: Infinity,
    maxCollections: Infinity,
    maxTeamMembers: 10,
    cloudSync: true,
    versionHistory: true,
    importExport: true,
    storageBytes: 500 * 1024 * 1024,
  },
};

export function canCreateRule(plan: AuthPlan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxRules;
}

export function canCreateCollection(plan: AuthPlan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxCollections;
}

export function canUseCloudSync(plan: AuthPlan): boolean {
  return PLAN_LIMITS[plan].cloudSync;
}

export function canViewVersionHistory(plan: AuthPlan): boolean {
  return PLAN_LIMITS[plan].versionHistory;
}

export function canInviteTeamMember(plan: AuthPlan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxTeamMembers;
}

export function getQuotaMessage(
  resource: 'rules' | 'collections' | 'storage' | 'team members',
  plan: AuthPlan,
): { title: string; message: string; suggestedPlan: AuthPlan } {
  const limits = PLAN_LIMITS[plan];
  const suggestedPlan: AuthPlan = plan === 'free' ? 'pro' : 'team';
  const suggestedLimits = PLAN_LIMITS[suggestedPlan];

  const limitMap = {
    rules: { current: limits.maxRules, next: suggestedLimits.maxRules, label: 'rules' },
    collections: { current: limits.maxCollections, next: suggestedLimits.maxCollections, label: 'collections' },
    storage: { current: limits.storageBytes, next: suggestedLimits.storageBytes, label: 'storage' },
    'team members': { current: limits.maxTeamMembers, next: suggestedLimits.maxTeamMembers, label: 'team members' },
  };

  const info = limitMap[resource];
  const nextLabel = info.next === Infinity ? 'unlimited' : String(info.next);

  return {
    title: 'Plan Limit Reached',
    message: `You've reached the limit of ${info.current} ${info.label} on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan. Upgrade to ${suggestedPlan.charAt(0).toUpperCase() + suggestedPlan.slice(1)} for ${nextLabel} ${info.label}.`,
    suggestedPlan,
  };
}
```

### 4.3 New File: `shared/billing-store.ts`

Zustand store for billing operations. Communicates with the background SW via message passing, which then calls Firebase Cloud Functions via `httpsCallable`.

```typescript
import { create } from 'zustand';

function sendMessage<T = unknown>(type: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.ok) resolve(response.data as T);
      else reject(new Error(response?.error ?? 'Unknown error'));
    });
  });
}

interface BillingState {
  loading: boolean;
  error: string | null;
  createCheckoutSession: (priceId: string) => Promise<string>;   // returns Stripe URL
  createPortalSession: () => Promise<string>;                     // returns Portal URL
  clearError: () => void;
}

export const useBillingStore = create<BillingState>((set) => ({
  loading: false,
  error: null,

  createCheckoutSession: async (priceId) => {
    set({ loading: true, error: null });
    try {
      const extensionId = chrome.runtime.id;
      const successUrl = `chrome-extension://${extensionId}/sidepanel.html#/billing?checkout=success`;
      const cancelUrl = `chrome-extension://${extensionId}/sidepanel.html#/billing?checkout=canceled`;

      const result = await sendMessage<{ url: string }>('CREATE_CHECKOUT_SESSION', {
        priceId,
        successUrl,
        cancelUrl,
      });
      set({ loading: false });
      return result.url;
    } catch (err) {
      const message = (err as Error).message;
      set({ loading: false, error: message });
      throw err;
    }
  },

  createPortalSession: async () => {
    set({ loading: true, error: null });
    try {
      const extensionId = chrome.runtime.id;
      const returnUrl = `chrome-extension://${extensionId}/sidepanel.html#/billing`;

      const result = await sendMessage<{ url: string }>('CREATE_CUSTOMER_PORTAL_SESSION', {
        returnUrl,
      });
      set({ loading: false });
      return result.url;
    } catch (err) {
      const message = (err as Error).message;
      set({ loading: false, error: message });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
```

### 4.4 Constants Update

**File:** `extension/src/shared/constants.ts` — add message types:

```typescript
// Add to MESSAGE_TYPES object:

// Billing
CREATE_CHECKOUT_SESSION: 'CREATE_CHECKOUT_SESSION',
CREATE_CUSTOMER_PORTAL_SESSION: 'CREATE_CUSTOMER_PORTAL_SESSION',
```

### 4.5 Background SW — New Message Handlers

**File:** `extension/src/background/message-handler.ts` — add billing handlers:

```typescript
// In registerHandlers():

registerHandler(MESSAGE_TYPES.CREATE_CHECKOUT_SESSION, async (payload) => {
  const { priceId, successUrl, cancelUrl } = payload as {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  };

  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions();
  const createCheckout = httpsCallable(functions, 'createCheckoutSession');

  const result = await createCheckout({ priceId, successUrl, cancelUrl });
  return result.data;
});

registerHandler(MESSAGE_TYPES.CREATE_CUSTOMER_PORTAL_SESSION, async (payload) => {
  const { returnUrl } = payload as { returnUrl: string };

  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions();
  const createPortal = httpsCallable(functions, 'createCustomerPortalSession');

  const result = await createPortal({ returnUrl });
  return result.data;
});
```

The `getFunctions` import should be added to the existing `firebase-config.ts` / `firebase-auth.ts` module pattern. The background SW initializes Firebase once; `getFunctions()` reuses the existing app instance.

### 4.6 Auth Store Update — Firestore Listener for Billing Fields

**File:** `extension/src/background/firebase-auth.ts`

The current `mapFirebaseUser` hardcodes `plan: 'free'`. For M10, the auth flow must also read the user's Firestore document to get billing fields.

**Change:** After Firebase Auth resolves the user, read `users/{uid}` from Firestore and merge billing fields into the `AuthUser` object. Set up an `onSnapshot` listener on `users/{uid}` so that when webhooks update the plan, the UI receives the change in real-time.

```typescript
// New function in firebase-auth.ts:
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

let unsubscribeBilling: (() => void) | null = null;

function startBillingListener(uid: string): void {
  if (unsubscribeBilling) unsubscribeBilling();

  const firestore = getFirestore();
  unsubscribeBilling = onSnapshot(doc(firestore, 'users', uid), (snapshot) => {
    const data = snapshot.data();
    if (!data) return;

    const billingFields = {
      plan: data.plan ?? 'free',
      subscriptionStatus: data.subscriptionStatus ?? null,
      currentPeriodEnd: data.currentPeriodEnd?.toDate()?.toISOString() ?? null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      storageUsedBytes: data.storageUsedBytes ?? 0,
    };

    // Update session storage with merged user data
    chrome.storage.session.get(SESSION_KEY).then((result) => {
      const existing = result[SESSION_KEY] as AuthUser | undefined;
      if (existing) {
        chrome.storage.session.set({
          [SESSION_KEY]: { ...existing, ...billingFields },
        });
      }
    });

    // Broadcast to sidepanel for reactive UI update
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.AUTH_STATE_CHANGED,
        payload: billingFields,
      });
    } catch {
      // Sidepanel may not be open
    }
  });
}

// Update mapFirebaseUser to include billing defaults
function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    plan: 'free',  // Will be overwritten by Firestore listener
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    storageUsedBytes: 0,
  };
}
```

Call `startBillingListener(user.uid)` inside `setupAuthListener` when a user signs in, and call `unsubscribeBilling?.()` on sign out.

### 4.7 Auth Store Frontend Update

**File:** `extension/src/shared/store.ts` — `useAuthStore`

Listen for `AUTH_STATE_CHANGED` messages from the background SW to update billing fields reactively:

```typescript
// Add to useAuthStore initialization or a useEffect in the root component:
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.AUTH_STATE_CHANGED && message.payload) {
    useAuthStore.setState((state) => {
      if (!state.user) return state;
      return { user: { ...state.user, ...message.payload } };
    });
  }
});
```

---

## 5. Routing

### 5.1 Add `/billing` Route

**File:** `extension/src/sidepanel/SidePanel.tsx`

```tsx
import { BillingPage } from './pages/BillingPage';

// In <Routes>:
<Route path="/billing" element={<BillingPage />} />
```

### 5.2 Success/Cancel URL Handling

The extension uses `MemoryRouter`, but Stripe redirects to a real URL (`chrome-extension://{id}/sidepanel.html#/billing?checkout=success`). When the sidepanel opens at this URL, the hash fragment `#/billing?checkout=success` is parsed.

**Approach:** On `BillingPage` mount, read `window.location.hash` to extract URL params. `MemoryRouter` does not parse the real URL, so we access `window.location` directly:

```typescript
// In BillingPage.tsx
useEffect(() => {
  const hash = window.location.hash; // e.g. "#/billing?checkout=success"
  const params = new URLSearchParams(hash.split('?')[1] ?? '');
  const checkout = params.get('checkout');

  if (checkout === 'success') {
    showToast('Subscription activated! Welcome to your new plan.');
    // Clean up URL param
    window.history.replaceState(null, '', window.location.pathname + '#/billing');
  } else if (checkout === 'canceled') {
    showToast('Checkout was canceled.', 'info');
    window.history.replaceState(null, '', window.location.pathname + '#/billing');
  }
}, []);
```

---

## 6. Component Architecture

### 6.1 Component Tree

```
BillingPage
├── PlanCard                           # Current plan info + manage button
│   ├── Badge (plan name)
│   ├── Subscription status label
│   ├── Next billing date
│   ├── CancellationNotice (conditional)
│   └── Button ("Manage Subscription" → opens Stripe Portal)
│
├── PlanComparisonTable                # 3-column feature matrix
│   ├── Column: Free
│   ├── Column: Pro ($9/mo)
│   └── Column: Team ($19/mo)
│       └── each column: feature rows + "Upgrade" / "Current Plan" button
│
└── Toast (checkout success/canceled)  # Shown on URL param, auto-dismiss
```

### 6.2 New Files

| File | Purpose |
|------|---------|
| `sidepanel/pages/BillingPage.tsx` | Main billing page. Reads user plan from `useAuthStore`, renders `PlanCard` + `PlanComparisonTable`. Handles checkout success/cancel URL params. |
| `sidepanel/components/billing/PlanCard.tsx` | Displays current plan badge, subscription status, next billing date, "Manage Subscription" button. |
| `sidepanel/components/billing/PlanComparisonTable.tsx` | 3-column table comparing Free/Pro/Team features. Highlights current plan. "Upgrade" buttons trigger `useBillingStore.createCheckoutSession`. |
| `sidepanel/components/billing/UpgradePrompt.tsx` | Modal dialog shown when a quota is exceeded. Displays limit message from `getQuotaMessage()`. "Upgrade" button navigates to billing page or starts checkout directly. |

### 6.3 Modified Files

| File | Change |
|------|--------|
| `shared/types.ts` | Add `PlanLimits` interface, extend `AuthUser` with billing fields |
| `shared/constants.ts` | Add `CREATE_CHECKOUT_SESSION`, `CREATE_CUSTOMER_PORTAL_SESSION` message types |
| `shared/store.ts` | Add `AUTH_STATE_CHANGED` listener to `useAuthStore` for reactive billing updates |
| `sidepanel/SidePanel.tsx` | Add `/billing` route |
| `sidepanel/components/AccountPopover.tsx` | Wire "Upgrade Plan" button to `navigate('/billing')`. Add "Manage Plan" button for paid users. |
| `sidepanel/components/StorageBar.tsx` | No code change needed — already accepts `usedBytes`/`totalBytes` props. The change is in `AccountPopover` where `used = 0` becomes `used = user.storageUsedBytes ?? 0`. |
| `sidepanel/pages/WorkspacePage.tsx` | Add quota checks before `createRule` and `createCollection`. Show `UpgradePrompt` when limit exceeded. |
| `background/message-handler.ts` | Add handlers for `CREATE_CHECKOUT_SESSION`, `CREATE_CUSTOMER_PORTAL_SESSION` |
| `background/firebase-auth.ts` | Add Firestore `onSnapshot` listener for billing fields, update `mapFirebaseUser` |

---

## 7. Data Flow Diagrams

### 7.1 Checkout Flow

```
┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────┐
│ BillingPage│     │ billing-  │     │  Background  │     │  Cloud       │     │ Stripe │
│ (React)   │     │ store.ts  │     │  SW (msg     │     │  Function    │     │        │
│           │     │           │     │  handler)    │     │              │     │        │
└─────┬─────┘     └─────┬─────┘     └──────┬───────┘     └──────┬───────┘     └───┬────┘
      │                 │                   │                    │                  │
      │ click "Upgrade" │                   │                    │                  │
      ├────────────────►│                   │                    │                  │
      │                 │ sendMessage       │                    │                  │
      │                 │ (CREATE_CHECKOUT) │                    │                  │
      │                 ├──────────────────►│                    │                  │
      │                 │                   │ httpsCallable      │                  │
      │                 │                   │ (createCheckout)   │                  │
      │                 │                   ├───────────────────►│                  │
      │                 │                   │                    │ stripe.checkout  │
      │                 │                   │                    │ .sessions.create │
      │                 │                   │                    ├─────────────────►│
      │                 │                   │                    │◄────────────────┤
      │                 │                   │                    │  { url }        │
      │                 │                   │◄───────────────────┤                  │
      │                 │◄──────────────────┤                    │                  │
      │◄────────────────┤                   │                    │                  │
      │  { url }        │                   │                    │                  │
      │                 │                   │                    │                  │
      │ chrome.tabs.create({ url })         │                    │                  │
      │─────────────────────────────────────────────────────────────────────────►│
      │                 │                   │                    │  User pays      │
      │                 │                   │                    │                  │
      │                 │                   │                    │◄─── webhook ────┤
      │                 │                   │                    │  checkout.       │
      │                 │                   │                    │  session.        │
      │                 │                   │                    │  completed       │
      │                 │                   │                    │                  │
      │                 │                   │                    │ Firestore write: │
      │                 │                   │                    │ users/{uid}.plan │
      │                 │                   │                    │ = 'pro'          │
      │                 │                   │                    │                  │
      │                 │                   │◄── onSnapshot ────┤                  │
      │                 │                   │    (plan changed)  │                  │
      │                 │                   │                    │                  │
      │                 │                   │ AUTH_STATE_CHANGED  │                  │
      │◄────────────────┼───────────────────┤                    │                  │
      │  UI updates     │                   │                    │                  │
      │  plan badge     │                   │                    │                  │
```

### 7.2 Quota Enforcement Flow

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│ WorkspacePage │     │ billing.ts  │     │ UpgradePrompt│     │ BillingPage    │
│              │     │ (helpers)   │     │ (modal)      │     │                │
└──────┬───────┘     └──────┬──────┘     └──────┬───────┘     └───────┬────────┘
       │                    │                    │                     │
       │ "New Rule" click   │                    │                     │
       │                    │                    │                     │
       ├── canCreateRule   │                    │                     │
       │   (plan, count) ──►│                    │                     │
       │                    │                    │                     │
       │◄── false ──────────┤                    │                     │
       │                    │                    │                     │
       │── getQuotaMessage  │                    │                     │
       │   ('rules', plan) ►│                    │                     │
       │                    │                    │                     │
       │◄── { title,       │                    │                     │
       │    message,       │                    │                     │
       │    suggestedPlan }│                    │                     │
       │                    │                    │                     │
       ├── Show modal ──────────────────────────►│                     │
       │                    │                    │                     │
       │                    │                    │ "Upgrade" click     │
       │                    │                    ├────────────────────►│
       │                    │                    │  navigate('/billing')│
```

### 7.3 Real-time Plan Update Flow

```
Stripe Webhook → Cloud Function → Firestore write (users/{uid})
                                        │
                                        ▼
                              Background SW onSnapshot listener
                                        │
                                        ▼
                        1. Update chrome.storage.session (cached AuthUser)
                        2. Broadcast AUTH_STATE_CHANGED message
                                        │
                                        ▼
                              useAuthStore listener in sidepanel
                                        │
                                        ▼
                              setState({ user: { ...user, plan: 'pro', ... } })
                                        │
                                        ▼
                              All components re-render with new plan
                              (PlanCard, Badge, quota checks, StorageBar)
```

---

## 8. Stripe Redirect Handling in Chrome Extension

Chrome extensions require special handling for Stripe redirects since `chrome-extension://` URLs are not standard web URLs.

**Strategy:** Open Stripe Checkout in a new browser tab using `chrome.tabs.create({ url })`. After payment, Stripe redirects the tab to the success/cancel URL. Since the URL contains `chrome-extension://{id}/sidepanel.html#/billing?checkout=success`, Chrome will open/reload the sidepanel HTML.

```typescript
// In PlanComparisonTable.tsx or BillingPage.tsx:
const handleUpgrade = async (priceId: string) => {
  const url = await billingStore.createCheckoutSession(priceId);
  // Open Stripe Checkout in a new tab
  chrome.tabs.create({ url });
};
```

The sidepanel stays open. When the user returns (Stripe redirects to `chrome-extension://...`), the sidepanel may already show the updated plan via the Firestore listener (webhook arrives before redirect in most cases). The success toast confirms the action.

---

## 9. Environment Configuration

### 9.1 Extension `.env` Additions

```env
# Add to extension/.env (existing file):
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Price IDs (set after creating prices in Stripe Dashboard):
VITE_STRIPE_PRO_PRICE_ID=price_...
VITE_STRIPE_TEAM_PRICE_ID=price_...
```

### 9.2 Firebase Functions Secrets

```bash
# Set using Firebase CLI (v2 secrets):
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

### 9.3 Stripe Dashboard Setup

1. Create monthly recurring prices for existing products:
   - `prod_U7O6buq8fg5tZ5` (Pro) → $9/month
   - `prod_U7O791CNkuR3Ho` (Team) → $19/month
2. Configure Customer Portal:
   - Enable subscription cancellation
   - Enable plan switching (Pro ↔ Team)
   - Set return URL to `chrome-extension://fbbmaakjnpjehcjbieohopekokcbimke/sidepanel.html#/billing`
3. Configure Webhook endpoint:
   - URL: `https://<region>-request-intercaptor.cloudfunctions.net/stripeWebhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## 10. Task Breakdown

Tasks follow TDD order: QA writes tests first, then developer implements. Each ticket = one branch = one PR.

### Phase 1: Foundation (parallel)

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T1 | Set up `firebase/` directory with Cloud Functions project scaffolding | @devops-engineer | — | `feat/m10-t1-firebase-scaffold` |
| M10-T2 | Types & constants — add `PlanLimits`, billing fields to `AuthUser`, billing message types | @react-developer | — | `feat/m10-t2-billing-types` |

### Phase 2: Cloud Functions

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T3-test | Write unit tests for `createCheckoutSession` Cloud Function | @qa-engineer | M10-T1 | `test/m10-t3-checkout-fn` |
| M10-T3 | Implement `createCheckoutSession` Cloud Function + `helpers.ts` | @nestjs-developer | M10-T3-test | `feat/m10-t3-checkout-fn` |
| M10-T4-test | Write unit tests for `stripeWebhook` Cloud Function (all 4 event types) | @qa-engineer | M10-T1 | `test/m10-t4-webhook-fn` |
| M10-T4 | Implement `stripeWebhook` Cloud Function (checkout.completed, subscription.updated, subscription.deleted, invoice.payment_failed) | @nestjs-developer | M10-T4-test | `feat/m10-t4-webhook-fn` |
| M10-T5-test | Write unit tests for `createCustomerPortalSession` Cloud Function | @qa-engineer | M10-T1 | `test/m10-t5-portal-fn` |
| M10-T5 | Implement `createCustomerPortalSession` Cloud Function | @nestjs-developer | M10-T5-test | `feat/m10-t5-portal-fn` |

### Phase 3: Firestore & Security

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T6 | Firestore security rules update — protect billing fields on `users/{uid}`, add `billing/{uid}` rules | @nestjs-developer | M10-T1 | `feat/m10-t6-security-rules` |

### Phase 4: Background SW Integration

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T7-test | Write tests for billing message handlers + Firestore billing listener in background SW | @qa-engineer | M10-T2 | `test/m10-t7-bg-billing` |
| M10-T7 | Implement billing message handlers in `message-handler.ts` + Firestore `onSnapshot` billing listener in `firebase-auth.ts` | @react-developer | M10-T7-test, M10-T2 | `feat/m10-t7-bg-billing` |

### Phase 5: Billing Utilities

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T8-test | Write unit tests for `shared/billing.ts` — `canCreateRule`, `canCreateCollection`, `getQuotaMessage`, etc. | @qa-engineer | M10-T2 | `test/m10-t8-billing-utils` |
| M10-T8 | Implement `shared/billing.ts` — `PLAN_LIMITS` constant, quota check helpers | @react-developer | M10-T8-test | `feat/m10-t8-billing-utils` |

### Phase 6: Billing Store

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T9-test | Write tests for `shared/billing-store.ts` | @qa-engineer | M10-T2 | `test/m10-t9-billing-store` |
| M10-T9 | Implement `shared/billing-store.ts` — `useBillingStore` Zustand store | @react-developer | M10-T9-test | `feat/m10-t9-billing-store` |

### Phase 7: Billing Page UI

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T10-test | Write component tests for `BillingPage`, `PlanCard`, `PlanComparisonTable` | @qa-engineer | M10-T2, M10-T8 | `test/m10-t10-billing-page` |
| M10-T10 | Implement `BillingPage`, `PlanCard`, `PlanComparisonTable` + add `/billing` route | @react-developer | M10-T10-test, M10-T9 | `feat/m10-t10-billing-page` |

### Phase 8: Quota Enforcement

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T11-test | Write tests for `UpgradePrompt` component + quota checks in WorkspacePage | @qa-engineer | M10-T8 | `test/m10-t11-quota-enforce` |
| M10-T11 | Implement `UpgradePrompt` modal + wire quota checks into `WorkspacePage` (rule/collection creation) | @react-developer | M10-T11-test | `feat/m10-t11-quota-enforce` |

### Phase 9: Wiring Existing Components

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T12-test | Write tests for AccountPopover billing integration + StorageBar wiring | @qa-engineer | M10-T8 | `test/m10-t12-account-wiring` |
| M10-T12 | Wire `AccountPopover` upgrade/manage buttons + wire `StorageBar` to real `storageUsedBytes` | @react-developer | M10-T12-test, M10-T10 | `feat/m10-t12-account-wiring` |

### Phase 10: Auth Store Reactive Updates

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T13 | Wire `AUTH_STATE_CHANGED` listener in `useAuthStore` for real-time billing field updates | @react-developer | M10-T7 | `feat/m10-t13-auth-billing-sync` |

### Phase 11: E2E & QA Verification

| Ticket | Title | Agent | Depends On | Branch |
|--------|-------|-------|-----------|--------|
| M10-T14 | E2E test plan — full checkout flow, cancel flow, quota enforcement, webhook processing, edge cases | @qa-engineer | All above | `test/m10-t14-e2e` |

### Dependency Graph

```
M10-T1 (scaffold) ──┬── M10-T3 (checkout fn) ──┐
                     ├── M10-T4 (webhook fn) ───┤
                     ├── M10-T5 (portal fn) ────┤
                     └── M10-T6 (security rules) │
                                                 │
M10-T2 (types) ─────┬── M10-T7 (bg handlers) ──┼── M10-T13 (auth sync)
                     ├── M10-T8 (billing utils) ─┤
                     ├── M10-T9 (billing store) ─┤
                     │                            │
                     │   M10-T10 (billing page) ──┤
                     │   M10-T11 (quota enforce) ─┤
                     │   M10-T12 (acct wiring) ───┤
                     │                            │
                     └────────────────────────────┴── M10-T14 (E2E QA)
```

---

## 11. Edge Cases & Error Handling

| Scenario | Handling |
|----------|---------|
| **Webhook arrives before redirect** | Plan updates via Firestore `onSnapshot` listener; UI reflects change immediately. Success toast is supplementary confirmation. |
| **Card declined during checkout** | Stripe handles this on their Checkout page. No webhook fires. User stays on free plan. |
| **Past due subscription** | Webhook sets `subscriptionStatus: 'past_due'`. UI shows warning banner on BillingPage. Features remain active during Stripe's grace period. |
| **User already subscribed clicks upgrade** | `createCheckoutSession` Cloud Function checks `subscriptionStatus === 'active'` and throws `already-exists`. UI shows "Use Manage Subscription to change plans." |
| **Double-click on upgrade button** | `billingStore.loading` state disables the button. Second click is no-op. |
| **Webhook signature verification fails** | Return 400. Log error. Do not update Firestore. |
| **Extension ID changes (dev vs prod)** | Success/cancel URLs use `chrome.runtime.id` dynamically, not a hardcoded ID. |
| **User on Team downgrades to Pro** | Handled via Stripe Customer Portal plan change. Webhook `subscription.updated` fires with new product. Cloud Function maps to correct plan. |
| **Subscription deleted (period end)** | `subscription.deleted` webhook resets plan to `free`. Existing data preserved. User cannot create new rules/collections beyond free limits. |
| **Firestore listener disconnects** | Firebase SDK auto-reconnects. On reconnect, it receives the latest snapshot. Stale plan data is self-correcting. |
| **Offline user tries to upgrade** | `httpsCallable` fails with network error. `billingStore.error` is set. UI shows error message. |

---

## 12. Security Considerations

1. **Stripe secret key** never touches the client. All Stripe SDK calls are in Cloud Functions.
2. **Webhook signature** is verified on every request. Unsigned/tampered requests are rejected.
3. **Firestore security rules** prevent clients from writing billing fields (`plan`, `stripeCustomerId`, etc.).
4. **`billing/{uid}` collection** is write-locked to clients. Only Admin SDK (Cloud Functions) can write.
5. **Price IDs** are stored in environment variables, not hardcoded. The Cloud Function validates that the provided `priceId` is legitimate by letting Stripe reject invalid IDs.
6. **No payment data stored locally** — Stripe handles all card/payment data. The extension only stores plan status.

---

## 13. Testing Strategy

### Cloud Functions (Jest)

- Mock Stripe SDK (`stripe.checkout.sessions.create`, `stripe.customers.create`, etc.)
- Mock Firebase Admin SDK (`admin.firestore()`)
- Test each webhook event handler independently
- Test signature verification (valid/invalid/missing)
- Test `getOrCreateCustomer` — new customer vs existing

### Frontend (Vitest + Testing Library)

- **billing.ts helpers**: Pure functions, straightforward unit tests
- **billing-store.ts**: Mock `chrome.runtime.sendMessage`, test state transitions
- **BillingPage**: Mock store, test render for free/pro/team users, test checkout/cancel URL params
- **PlanComparisonTable**: Test correct plan highlighting, button states
- **UpgradePrompt**: Test render with different quota messages, test button actions
- **WorkspacePage quota checks**: Test that "New Rule" is blocked when at limit
- **AccountPopover**: Test "Upgrade" button navigates for free users, "Manage Plan" for paid users

### Integration

- Firebase Emulator Suite for Cloud Functions + Firestore rules testing
- Stripe CLI (`stripe listen --forward-to`) for local webhook testing
