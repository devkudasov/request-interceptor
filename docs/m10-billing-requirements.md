# M10: Stripe Billing — Requirements Document

## 1. Overview

Milestone M10 adds subscription billing to Request Interceptor via Stripe. Users can upgrade from the Free plan to Pro or Team, manage their subscription, and are subject to quota enforcement based on their active plan.

**Goal:** Monetize the extension through a freemium model — core features remain free, advanced features (cloud sync, version history, higher quotas) require a paid subscription.

**Payment processor:** Stripe (Checkout + Customer Portal).
**Backend:** Firebase Cloud Functions (all Stripe secret-key operations).
**Frontend:** Chrome extension side panel (React).

---

## 2. Plan Tiers & Quotas

| Feature | Free | Pro ($9/mo) | Team ($19/mo) |
|---------|------|-------------|---------------|
| Mock rules | 10 | 100 | Unlimited |
| Collections | 3 | 20 | Unlimited |
| Team members | — | — | 10 |
| Cloud sync | — | Yes | Yes |
| Version history | — | Yes | Yes |
| Import/Export | Yes | Yes | Yes |
| Storage quota | 5 MB | 50 MB | 500 MB |

### Quota Constants

```typescript
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
```

---

## 3. Stripe Configuration

| Item | Value |
|------|-------|
| Pro product ID | `prod_U7O6buq8fg5tZ5` |
| Team product ID | `prod_U7O791CNkuR3Ho` |
| Pro price ID | TBD (create monthly recurring price in Stripe Dashboard) |
| Team price ID | TBD (create monthly recurring price in Stripe Dashboard) |
| Publishable key | Configured in `extension/.env` as `VITE_STRIPE_PUBLISHABLE_KEY` |
| Secret key | Stored in Firebase Cloud Functions config (`functions:config:set stripe.secret_key=sk_...`) |
| Webhook secret | Stored in Firebase Cloud Functions config (`functions:config:set stripe.webhook_secret=whsec_...`) |

---

## 4. Data Model Changes

### 4.1 Firestore: `users/{uid}` — Updated Fields

| Field | Type | Description |
|-------|------|-------------|
| `plan` | `'free' \| 'pro' \| 'team'` | Current active plan (already exists) |
| `stripeCustomerId` | `string \| null` | Stripe Customer ID, set on first checkout |
| `subscriptionId` | `string \| null` | Active Stripe Subscription ID |
| `subscriptionStatus` | `'active' \| 'canceled' \| 'past_due' \| 'incomplete' \| null` | Stripe subscription status |
| `currentPeriodEnd` | `Timestamp \| null` | When the current billing period ends |
| `cancelAtPeriodEnd` | `boolean` | Whether subscription will cancel at period end |

### 4.2 Firestore: `billing/{uid}` (existing in architecture, populate now)

This collection is written only by Cloud Functions (never by the client). It serves as an audit trail.

| Field | Type | Description |
|-------|------|-------------|
| `stripeCustomerId` | `string` | Stripe Customer ID |
| `subscriptionId` | `string` | Stripe Subscription ID |
| `plan` | `'pro' \| 'team'` | Subscribed plan |
| `status` | `'active' \| 'canceled' \| 'past_due' \| 'incomplete'` | Subscription status |
| `currentPeriodEnd` | `Timestamp` | Billing period end |
| `cancelAtPeriodEnd` | `boolean` | Pending cancellation |
| `createdAt` | `Timestamp` | Record creation time |
| `updatedAt` | `Timestamp` | Last update time |

### 4.3 Firestore Security Rules Update

```
match /billing/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow write: if false; // Only Cloud Functions write here
}

match /users/{uid} {
  // Existing rules remain; plan/stripe fields are read-only for clients
  allow update: if request.auth != null
    && request.auth.uid == uid
    && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['plan', 'stripeCustomerId', 'subscriptionId',
                 'subscriptionStatus', 'currentPeriodEnd', 'cancelAtPeriodEnd']);
}
```

### 4.4 TypeScript Type Updates

```typescript
// In shared/types.ts — add:
export interface PlanLimits {
  maxRules: number;
  maxCollections: number;
  maxTeamMembers: number;
  cloudSync: boolean;
  versionHistory: boolean;
  importExport: boolean;
  storageBytes: number;
}

// Update AuthUser — add optional billing fields:
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  plan: AuthPlan;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'incomplete' | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}
```

---

## 5. API Contracts — Firebase Cloud Functions

### 5.1 `createCheckoutSession`

Creates a Stripe Checkout Session for upgrading to Pro or Team.

**Callable function** (invoked via `httpsCallable`).

**Request:**
```typescript
interface CreateCheckoutSessionRequest {
  priceId: string;       // Stripe Price ID for the selected plan
  successUrl: string;    // URL to redirect after successful payment
  cancelUrl: string;     // URL to redirect if user cancels
}
```

**Response:**
```typescript
interface CreateCheckoutSessionResponse {
  sessionId: string;     // Stripe Checkout Session ID
  url: string;           // Stripe Checkout URL for redirect
}
```

**Logic:**
1. Verify caller is authenticated (`context.auth`)
2. Look up or create Stripe Customer using `users/{uid}.stripeCustomerId` and user's email
3. If creating new customer, save `stripeCustomerId` to Firestore
4. Create Checkout Session with:
   - `customer`: Stripe Customer ID
   - `mode`: `'subscription'`
   - `line_items`: `[{ price: priceId, quantity: 1 }]`
   - `success_url`: provided URL with `{CHECKOUT_SESSION_ID}` placeholder
   - `cancel_url`: provided URL
   - `metadata`: `{ firebaseUID: uid }`
   - `subscription_data.metadata`: `{ firebaseUID: uid }`
5. Return session ID and URL

**Errors:**
| Code | Condition |
|------|-----------|
| `unauthenticated` | No auth context |
| `invalid-argument` | Missing or invalid priceId |
| `already-exists` | User already has an active subscription |

### 5.2 `createCustomerPortalSession`

Creates a Stripe Customer Portal session for managing/canceling subscriptions.

**Callable function.**

**Request:**
```typescript
interface CreateCustomerPortalSessionRequest {
  returnUrl: string;     // URL to return to after portal
}
```

**Response:**
```typescript
interface CreateCustomerPortalSessionResponse {
  url: string;           // Stripe Customer Portal URL
}
```

**Logic:**
1. Verify caller is authenticated
2. Get `stripeCustomerId` from `users/{uid}`
3. Create portal session with `customer` and `return_url`
4. Return portal URL

**Errors:**
| Code | Condition |
|------|-----------|
| `unauthenticated` | No auth context |
| `not-found` | No stripeCustomerId for this user |

### 5.3 `stripeWebhook`

HTTPS endpoint (not callable) that receives Stripe webhook events.

**Endpoint:** `POST /stripeWebhook`

**Handled Events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set user plan based on product, save subscriptionId |
| `customer.subscription.updated` | Update plan, status, currentPeriodEnd, cancelAtPeriodEnd |
| `customer.subscription.deleted` | Set plan to `'free'`, clear subscription fields |
| `invoice.payment_failed` | Set subscriptionStatus to `'past_due'` |

**Webhook Processing Logic:**

```
1. Verify webhook signature using whsec_ secret
2. Parse event type and data
3. Extract firebaseUID from subscription/customer metadata
4. Determine plan from product ID:
   - prod_U7O6buq8fg5tZ5 → 'pro'
   - prod_U7O791CNkuR3Ho → 'team'
5. Update users/{uid} document:
   - plan, subscriptionId, subscriptionStatus, currentPeriodEnd, cancelAtPeriodEnd
6. Update billing/{uid} document (audit trail)
7. Return 200
```

---

## 6. User Flows

### 6.1 Upgrade Flow

```
User                    Extension               Cloud Function           Stripe
 │                         │                         │                      │
 ├─ Click "Upgrade" ──────►│                         │                      │
 │                         ├─ createCheckoutSession ─►│                      │
 │                         │                         ├─ Create/get customer ─►│
 │                         │                         │◄─ Customer ID ────────┤
 │                         │                         ├─ Create session ──────►│
 │                         │                         │◄─ Session URL ────────┤
 │                         │◄─ { url } ──────────────┤                      │
 │◄─ Redirect to Stripe ──┤                         │                      │
 │                         │                         │                      │
 │── Complete payment ────────────────────────────────────────────────────►│
 │                         │                         │                      │
 │                         │                         │◄── Webhook: ─────────┤
 │                         │                         │    checkout.session   │
 │                         │                         │    .completed         │
 │                         │                         │                      │
 │                         │                         ├─ Update Firestore ──►│
 │                         │                         │   users/{uid}.plan    │
 │                         │                         │   = 'pro' or 'team'  │
 │                         │                         │                      │
 │◄─ Redirect to success ─┤                         │                      │
 │                         │◄─ Firestore listener ───┤                      │
 │                         │   (plan changed)        │                      │
 │◄─ UI updates plan ─────┤                         │                      │
```

### 6.2 Cancel/Manage Subscription Flow

```
User                    Extension               Cloud Function           Stripe
 │                         │                         │                      │
 ├─ Click "Manage" ───────►│                         │                      │
 │                         ├─ createCustomerPortal ──►│                      │
 │                         │                         ├─ Create portal ──────►│
 │                         │                         │◄─ Portal URL ────────┤
 │                         │◄─ { url } ──────────────┤                      │
 │◄─ Redirect to Portal ──┤                         │                      │
 │                         │                         │                      │
 │── Cancel subscription ─────────────────────────────────────────────────►│
 │                         │                         │                      │
 │                         │                         │◄── Webhook: ─────────┤
 │                         │                         │    subscription      │
 │                         │                         │    .updated          │
 │                         │                         │    (cancelAtPeriodEnd)│
 │                         │                         │                      │
 │                         │                         ├─ Update Firestore ──►│
 │                         │                         │   cancelAtPeriodEnd   │
 │                         │                         │   = true              │
 │                         │                         │                      │
 │         ... at period end ...                     │                      │
 │                         │                         │◄── Webhook: ─────────┤
 │                         │                         │    subscription      │
 │                         │                         │    .deleted           │
 │                         │                         │                      │
 │                         │                         ├─ Update Firestore ──►│
 │                         │                         │   plan = 'free'       │
```

### 6.3 Quota Enforcement Flow

```
User                    Extension
 │                         │
 ├─ Create new rule ──────►│
 │                         ├─ Check: rules.length < PLAN_LIMITS[plan].maxRules?
 │                         │
 │                    ┌────┴────┐
 │                    │ Yes     │ No
 │                    │         │
 │               Create rule   Show UpgradePrompt dialog:
 │                             "You've reached the limit of 10 rules
 │                              on the Free plan. Upgrade to Pro
 │                              for up to 100 rules."
 │                             [Upgrade to Pro] [Cancel]
```

---

## 7. Frontend Features

### 7.1 Billing Page

**Location:** New page in side panel, accessible from AccountPopover ("Manage Plan" button) and navigation.

**Sections:**

1. **Current Plan Card**
   - Plan name with color-coded badge (free=gray/default, pro=blue/success, team=purple/info — matches existing `PLAN_BADGE_VARIANT`)
   - Subscription status (active, canceling at period end, past due)
   - Next billing date (from `currentPeriodEnd`)
   - "Manage Subscription" button (opens Stripe Customer Portal) — visible only for paid plans

2. **Plan Comparison Table**
   - Three columns: Free, Pro, Team
   - Rows for each feature/quota from the table in Section 2
   - Current plan column highlighted
   - "Upgrade" button under Pro and Team columns (hidden if on that plan or higher)
   - "Current Plan" label under the user's active plan

3. **Cancellation Notice**
   - If `cancelAtPeriodEnd` is true: "Your subscription will end on {date}. You'll be downgraded to Free after this date."
   - "Reactivate" button (opens Customer Portal)

### 7.2 AccountPopover Updates

Existing AccountPopover (`extension/src/sidepanel/components/AccountPopover.tsx`) needs:

- Wire the "Upgrade Plan" button (already rendered for free users) to navigate to Billing page
- Add "Manage Plan" link for paid users
- The plan badge already works via `PLAN_BADGE_VARIANT`

### 7.3 Upgrade Prompt Dialog

A modal/dialog shown when quota is exceeded:

- Title: "Upgrade Required" or "Plan Limit Reached"
- Message describing which limit was hit (rules, collections, storage)
- Current usage vs. limit
- "Upgrade to Pro" / "Upgrade to Team" button
- "Cancel" button

### 7.4 StorageBar Updates

The existing `StorageBar` component (`extension/src/sidepanel/components/StorageBar.tsx`) currently receives hardcoded `usedBytes=0`. Wire it to:
- Actual storage usage from Firestore (`users/{uid}.storageUsedBytes`)
- Plan quota from `PLAN_LIMITS[user.plan].storageBytes`

---

## 8. Quota Enforcement — Detailed Rules

### 8.1 Where to Enforce (Frontend)

| Action | Check | Limit Source |
|--------|-------|-------------|
| Create mock rule | `rules.length < PLAN_LIMITS[plan].maxRules` | `maxRules` |
| Create collection | `collections.length < PLAN_LIMITS[plan].maxCollections` | `maxCollections` |
| Push to cloud | `PLAN_LIMITS[plan].cloudSync === true` | `cloudSync` |
| View version history | `PLAN_LIMITS[plan].versionHistory === true` | `versionHistory` |
| Invite team member | `team.members.length < PLAN_LIMITS[plan].maxTeamMembers` | `maxTeamMembers` |

### 8.2 Where to Enforce (Backend — Cloud Functions / Security Rules)

Firestore security rules should also enforce limits as a second line of defense:
- Deny writes to `teams/{teamId}/collections` if user plan does not include `cloudSync`
- Deny adding members beyond `maxTeamMembers`

### 8.3 Grace Period on Downgrade

When a user downgrades (subscription canceled at period end):
- Existing rules and collections are NOT deleted
- User cannot create new rules/collections beyond the free limit
- Cloud sync stops working (data remains in Firestore but is read-only)
- Show a banner: "You have {N} rules but your plan allows {limit}. Delete some rules or upgrade to continue creating."

---

## 9. Success/Cancel URLs

Since this is a Chrome extension, Stripe redirect URLs need special handling:

**Option A (recommended):** Use the extension's side panel redirect page.
```
Success: chrome-extension://{EXTENSION_ID}/sidepanel.html#/billing?checkout=success
Cancel:  chrome-extension://{EXTENSION_ID}/sidepanel.html#/billing?checkout=canceled
```

**Option B:** Use a hosted redirect page that sends a message to the extension.

Use Option A. The extension ID is known (`fbbmaakjnpjehcjbieohopekokcbimke`). The Billing page checks URL params on mount and shows a success/canceled toast.

---

## 10. Message Types (New)

Add to `shared/constants.ts`:

```typescript
// Billing
CREATE_CHECKOUT_SESSION: 'CREATE_CHECKOUT_SESSION',
CREATE_CUSTOMER_PORTAL_SESSION: 'CREATE_CUSTOMER_PORTAL_SESSION',
```

These messages route through the background service worker, which calls the Firebase Cloud Functions via `httpsCallable`.

---

## 11. Billing Store

New Zustand store for billing operations:

```typescript
interface BillingState {
  loading: boolean;
  error: string | null;
  createCheckoutSession: (priceId: string) => Promise<string>; // returns redirect URL
  createPortalSession: () => Promise<string>;                  // returns redirect URL
}
```

---

## 12. Task Breakdown

| Ticket | Title | Agent | Dependencies |
|--------|-------|-------|-------------|
| M10-T1 | Firebase Cloud Functions setup — createCheckoutSession, stripeWebhook, createCustomerPortalSession | @nestjs-developer | None |
| M10-T2 | Firestore schema & security rules update — add billing fields to users, billing collection rules | @nestjs-developer | None |
| M10-T3 | Type & constant updates — PlanLimits, AuthUser billing fields, message types, PLAN_LIMITS config | @react-developer | None |
| M10-T4 | Billing page UI — current plan card, plan comparison table, upgrade/manage buttons | @react-developer | M10-T3 |
| M10-T5 | Checkout flow — BillingStore, background SW message handler, Stripe redirect integration | @react-developer | M10-T1, M10-T3 |
| M10-T6 | Quota enforcement — checks on rule/collection creation, UpgradePrompt dialog | @react-developer | M10-T3 |
| M10-T7 | Customer Portal integration — manage/cancel subscription flow | @react-developer | M10-T1, M10-T5 |
| M10-T8 | Wire StorageBar to real usage data from Firestore | @react-developer | M10-T3 |
| M10-T9 | AccountPopover updates — wire Upgrade button, add Manage Plan for paid users | @react-developer | M10-T4 |
| M10-T10 | QA — test plans for all billing flows (upgrade, cancel, quota enforcement, webhook handling) | @qa-engineer | M10-T1 through M10-T9 |

### Task Order (TDD)

1. **M10-T1, M10-T2, M10-T3** — can be done in parallel (backend + schema + frontend types)
2. **M10-T4** — Billing page UI (QA writes tests first, then React dev implements)
3. **M10-T5** — Checkout flow integration
4. **M10-T6** — Quota enforcement
5. **M10-T7** — Customer Portal
6. **M10-T8, M10-T9** — Wiring existing components
7. **M10-T10** — End-to-end QA

---

## 13. Edge Cases & Error Handling

| Scenario | Handling |
|----------|---------|
| Webhook arrives before redirect completes | Plan updates via Firestore listener; UI reflects change regardless of redirect timing |
| Payment fails (card declined) | Stripe shows error on Checkout page; no webhook fires; user stays on free plan |
| Subscription goes past_due | Webhook updates status; UI shows warning banner; features remain active for grace period (Stripe default) |
| User already has active subscription and clicks upgrade | Cloud Function returns `already-exists` error; UI shows "You already have an active subscription. Use Manage Subscription to change plans." |
| Double-click on upgrade button | Disable button after first click; loading state prevents duplicate requests |
| Webhook signature verification fails | Return 400; log error; do not update Firestore |
| User deletes account while subscribed | Cloud Function cancels Stripe subscription on account deletion |
| Extension ID changes (dev vs prod) | Success/cancel URLs should use `chrome.runtime.id` dynamically |

---

## 14. Out of Scope for M10

- Annual billing (monthly only for now)
- Promo codes / coupons (can be added in Stripe Dashboard later without code changes)
- Invoice PDF downloads (available through Stripe Customer Portal)
- Usage-based billing
- Free trial period (can be configured in Stripe later)
- Refund processing (handled manually via Stripe Dashboard)
