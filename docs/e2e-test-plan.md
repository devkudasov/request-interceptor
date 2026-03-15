# Request Interceptor — E2E Test Plan

## Overview

This document defines end-to-end test cases for the Request Interceptor Chrome extension. Tests cover all user-facing flows from authentication through billing, core rule management, recording, team collaboration, and UI interactions.

**Test Environment:**
- Chrome 120+ with extension loaded in developer mode
- Firebase project: `request-intercaptor` (test mode)
- Stripe test mode with test cards
- Extension ID: `fbbmaakjnpjehcjbieohopekokcbimke`

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

---

## 1. Auth Flows

### E2E-AUTH-001: Email/Password Registration

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-001 |
| **Description** | New user registers with email and password |
| **Preconditions** | Extension installed, user not logged in, email not previously registered |
| **Steps** | 1. Open extension side panel<br>2. Click "Sign Up" / "Create Account"<br>3. Enter valid email and password (min 6 chars)<br>4. Click "Register" button<br>5. Check that a verification email is sent |
| **Expected Result** | Account created successfully. User is logged in with `plan: 'free'`. User document created in `users/{uid}` in Firestore. Verification email received. `emailVerified` is `false` until verified. |
| **Priority** | P0 |

### E2E-AUTH-002: Email/Password Login

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-002 |
| **Description** | Existing user logs in with email and password |
| **Preconditions** | User has a registered account |
| **Steps** | 1. Open extension side panel<br>2. Click "Sign In"<br>3. Enter registered email and password<br>4. Click "Login" button |
| **Expected Result** | User is authenticated. Side panel shows user's display name/email and plan badge. Auth state persisted to `chrome.storage.local`. |
| **Priority** | P0 |

### E2E-AUTH-003: Logout

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-003 |
| **Description** | Logged-in user logs out |
| **Preconditions** | User is authenticated |
| **Steps** | 1. Open side panel<br>2. Click account popover / avatar<br>3. Click "Sign Out"<br>4. Confirm logout |
| **Expected Result** | User is signed out. Auth token cleared from `chrome.storage.local`. Side panel returns to unauthenticated state. Premium features (cloud sync, teams) are no longer accessible. |
| **Priority** | P0 |

### E2E-AUTH-004: Google OAuth Login

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-004 |
| **Description** | User logs in via Google OAuth |
| **Preconditions** | Extension installed, user not logged in, Google account available |
| **Steps** | 1. Open extension side panel<br>2. Click "Sign in with Google"<br>3. Complete Google OAuth consent flow in the opened tab/popup<br>4. Authorize the application |
| **Expected Result** | User is authenticated via Google provider. Display name and photo pulled from Google profile. Redirect back to extension completes via `chrome.identity.launchWebAuthFlow` (redirect URL: `https://fbbmaakjnpjehcjbieohopekokcbimke.chromiumapp.org/`). User document created/updated in Firestore. |
| **Priority** | P0 |

### E2E-AUTH-005: GitHub OAuth Login

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-005 |
| **Description** | User logs in via GitHub OAuth |
| **Preconditions** | Extension installed, user not logged in, GitHub account available |
| **Steps** | 1. Open extension side panel<br>2. Click "Sign in with GitHub"<br>3. Complete GitHub OAuth authorization flow<br>4. Authorize the application |
| **Expected Result** | User is authenticated via GitHub provider. Display name and avatar pulled from GitHub profile. Redirect completes via `chrome.identity.launchWebAuthFlow`. User document created/updated in Firestore. |
| **Priority** | P0 |

### E2E-AUTH-006: Auth State Persistence Across Extension Restart

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-006 |
| **Description** | Auth state survives extension reload/restart |
| **Preconditions** | User is authenticated |
| **Steps** | 1. Verify user is logged in (side panel shows user info)<br>2. Close the side panel<br>3. Go to `chrome://extensions`<br>4. Click the reload button on the extension<br>5. Open the side panel again |
| **Expected Result** | User remains authenticated after extension reload. Auth token restored from `chrome.storage.local`. User profile, plan, and subscription status are correct. No re-login required. |
| **Priority** | P0 |

### E2E-AUTH-007: Email Verification Flow

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-007 |
| **Description** | User verifies their email address after registration |
| **Preconditions** | User registered with email/password, `emailVerified` is `false` |
| **Steps** | 1. Register a new account (E2E-AUTH-001)<br>2. Check email inbox for verification email from Firebase<br>3. Click the verification link in the email<br>4. Return to the extension and reload/refresh |
| **Expected Result** | `emailVerified` field becomes `true` on the AuthUser object. Any UI banners prompting for verification are dismissed. Features gated behind email verification (if any) become accessible. |
| **Priority** | P1 |

### E2E-AUTH-008: Login with Invalid Credentials

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-008 |
| **Description** | User attempts login with wrong password |
| **Preconditions** | User has a registered account |
| **Steps** | 1. Open side panel<br>2. Enter correct email but wrong password<br>3. Click "Login" |
| **Expected Result** | Login fails. Error message displayed (e.g., "Invalid email or password"). User remains unauthenticated. No crash or unhandled error. |
| **Priority** | P1 |

### E2E-AUTH-009: Login with Unregistered Email

| Field | Value |
|-------|-------|
| **Test ID** | E2E-AUTH-009 |
| **Description** | User attempts login with an email that has no account |
| **Preconditions** | Extension installed |
| **Steps** | 1. Open side panel<br>2. Enter an email that is not registered<br>3. Enter any password<br>4. Click "Login" |
| **Expected Result** | Login fails. Appropriate error message displayed. No information leakage about whether the email exists. |
| **Priority** | P1 |

---

## 2. Billing / Stripe Flows

### E2E-BILL-001: Free User Upgrades to Pro via Stripe Checkout

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-001 |
| **Description** | Free user completes upgrade to Pro plan through Stripe Checkout |
| **Preconditions** | User authenticated with `plan: 'free'`, no active subscription |
| **Steps** | 1. Open side panel, navigate to Billing page<br>2. Verify current plan shows "Free"<br>3. Click "Upgrade to Pro" button<br>4. Verify redirect to Stripe Checkout<br>5. Enter test card `4242 4242 4242 4242`, any future expiry, any CVC<br>6. Complete payment<br>7. Verify redirect back to extension (`sidepanel.html#/billing?checkout=success`) |
| **Expected Result** | Stripe Checkout session created via `createCheckoutSession` Cloud Function. After payment, `checkout.session.completed` webhook fires. Firestore `users/{uid}` updated: `plan: 'pro'`, `subscriptionStatus: 'active'`, `subscriptionId` populated, `currentPeriodEnd` set. Extension UI updates to show Pro badge. Plan limits change to Pro (100 rules, 20 collections, 50MB storage). Success toast shown. |
| **Priority** | P0 |

### E2E-BILL-002: Pro User Manages Subscription via Customer Portal

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-002 |
| **Description** | Pro user accesses Stripe Customer Portal to manage subscription |
| **Preconditions** | User authenticated with `plan: 'pro'`, active subscription |
| **Steps** | 1. Open side panel, navigate to Billing page<br>2. Verify current plan shows "Pro" with "Active" status<br>3. Click "Manage Subscription" button<br>4. Verify redirect to Stripe Customer Portal |
| **Expected Result** | `createCustomerPortalSession` Cloud Function called successfully. User redirected to Stripe Customer Portal where they can view invoices, update payment method, or cancel subscription. Return URL correctly points back to extension billing page. |
| **Priority** | P0 |

### E2E-BILL-003: Cancel Subscription — Plan Reverts to Free

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-003 |
| **Description** | User cancels subscription; plan reverts to free at period end |
| **Preconditions** | User authenticated with `plan: 'pro'`, active subscription |
| **Steps** | 1. Open Billing page, click "Manage Subscription"<br>2. In Stripe Customer Portal, click "Cancel plan"<br>3. Confirm cancellation<br>4. Return to extension<br>5. Verify cancellation notice appears<br>6. Wait for period end (or simulate via Stripe test clock) |
| **Expected Result** | After cancellation: `customer.subscription.updated` webhook fires with `cancelAtPeriodEnd: true`. UI shows "Your subscription will end on {date}". User retains Pro access until period end. At period end: `customer.subscription.deleted` webhook fires. `plan` reverts to `'free'`, subscription fields cleared. Existing rules/collections preserved but new creation limited to free quotas. |
| **Priority** | P0 |

### E2E-BILL-004: Webhook — checkout.session.completed Grants Pro Access

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-004 |
| **Description** | Verify webhook correctly processes successful checkout |
| **Preconditions** | Stripe webhook endpoint configured, user has `plan: 'free'` |
| **Steps** | 1. Trigger a `checkout.session.completed` event (via Stripe CLI or actual checkout)<br>2. Ensure event contains `metadata.firebaseUID` matching the user<br>3. Ensure subscription has product ID `prod_U7O6buq8fg5tZ5` (Pro) |
| **Expected Result** | Cloud Function processes webhook. `users/{uid}` updated: `plan: 'pro'`, `subscriptionId` set, `subscriptionStatus: 'active'`, `currentPeriodEnd` set. `billing/{uid}` audit record created. Extension receives update via Firestore listener and reflects new plan immediately. |
| **Priority** | P0 |

### E2E-BILL-005: Webhook — customer.subscription.updated Syncs Status

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-005 |
| **Description** | Verify webhook processes subscription status changes |
| **Preconditions** | User has active Pro subscription |
| **Steps** | 1. Trigger a `customer.subscription.updated` event (e.g., user cancels at period end in Portal)<br>2. Verify event data includes `cancel_at_period_end: true` |
| **Expected Result** | Cloud Function updates `users/{uid}`: `cancelAtPeriodEnd: true`, `subscriptionStatus` remains `'active'`. `billing/{uid}` audit record updated. Extension UI shows cancellation notice with period end date. |
| **Priority** | P0 |

### E2E-BILL-006: Webhook — customer.subscription.deleted Reverts to Free

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-006 |
| **Description** | Verify webhook processes subscription deletion |
| **Preconditions** | User had Pro subscription that was canceled and reached period end |
| **Steps** | 1. Trigger a `customer.subscription.deleted` event<br>2. Verify event references the correct user via metadata |
| **Expected Result** | Cloud Function updates `users/{uid}`: `plan: 'free'`, `subscriptionId: null`, `subscriptionStatus: null`, `currentPeriodEnd: null`, `cancelAtPeriodEnd: false`. `billing/{uid}` updated. Extension UI reverts to Free plan badge and quotas. Cloud sync features disabled. |
| **Priority** | P0 |

### E2E-BILL-007: Webhook — invoice.payment_failed Sets Past Due

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-007 |
| **Description** | Verify webhook handles payment failure |
| **Preconditions** | User has active subscription |
| **Steps** | 1. Trigger an `invoice.payment_failed` event (via Stripe test card `4000 0000 0000 0341` or Stripe CLI)<br>2. Verify event references the correct user |
| **Expected Result** | Cloud Function updates `users/{uid}`: `subscriptionStatus: 'past_due'`. Plan remains unchanged (grace period). Extension UI shows a warning banner about payment failure. `billing/{uid}` updated with `status: 'past_due'`. |
| **Priority** | P0 |

### E2E-BILL-008: Quota Enforcement — Free Plan Storage Limit (5MB)

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-008 |
| **Description** | Free user is blocked from exceeding 5MB storage quota |
| **Preconditions** | User authenticated with `plan: 'free'`, existing storage usage near 5MB |
| **Steps** | 1. Create mock rules with large response bodies to approach 5MB<br>2. Attempt to push to cloud sync (should be blocked for free users anyway)<br>3. Attempt to create rules until hitting the 10-rule limit<br>4. Verify StorageBar shows usage relative to 5MB quota |
| **Expected Result** | When rule limit (10) is reached, UpgradePrompt dialog appears: "You've reached the limit of 10 rules on the free plan." StorageBar displays correct usage/quota ratio. "Upgrade to Pro" button is functional. Cannot create 11th rule. |
| **Priority** | P0 |

### E2E-BILL-009: Quota Enforcement — Pro Plan Storage Limit (50MB)

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-009 |
| **Description** | Pro user has expanded quotas of 100 rules, 20 collections, 50MB storage |
| **Preconditions** | User authenticated with `plan: 'pro'` |
| **Steps** | 1. Verify user can create up to 100 rules<br>2. Verify user can create up to 20 collections<br>3. Verify StorageBar shows usage relative to 50MB quota<br>4. Attempt to create 101st rule |
| **Expected Result** | User can freely create up to 100 rules and 20 collections. At the limit, UpgradePrompt offers Team plan upgrade. StorageBar reflects 50MB limit. Cloud sync and version history features are accessible. |
| **Priority** | P1 |

### E2E-BILL-010: Payment Declined During Checkout

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-010 |
| **Description** | User attempts upgrade but card is declined |
| **Preconditions** | User authenticated with `plan: 'free'` |
| **Steps** | 1. Click "Upgrade to Pro"<br>2. In Stripe Checkout, enter declined test card `4000 0000 0000 0002`<br>3. Attempt payment |
| **Expected Result** | Stripe shows card declined error on Checkout page. No webhook fires. User remains on free plan. Extension state unchanged. User can retry with a different card. |
| **Priority** | P1 |

### E2E-BILL-011: User Already Has Active Subscription Clicks Upgrade

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-011 |
| **Description** | Pro user attempts to create another checkout session |
| **Preconditions** | User authenticated with `plan: 'pro'`, active subscription |
| **Steps** | 1. Navigate to Billing page<br>2. Attempt to click an upgrade button (if visible) |
| **Expected Result** | Cloud Function returns `already-exists` error. UI shows message: "You already have an active subscription. Use Manage Subscription to change plans." No duplicate subscription created. |
| **Priority** | P1 |

### E2E-BILL-012: Grace Period on Downgrade — Existing Data Preserved

| Field | Value |
|-------|-------|
| **Test ID** | E2E-BILL-012 |
| **Description** | When a Pro user downgrades to free, existing data above free limits is preserved but creation is blocked |
| **Preconditions** | User was Pro with 50 rules and 15 collections, subscription now canceled and expired |
| **Steps** | 1. Verify user plan is now `'free'`<br>2. Verify all 50 existing rules are still visible and functional<br>3. Attempt to create a new rule<br>4. Verify the UpgradePrompt appears |
| **Expected Result** | All existing rules and collections remain intact (not deleted). User cannot create new rules (exceeds 10 limit). Banner shown: "You have 50 rules but your plan allows 10. Delete some rules or upgrade to continue creating." Cloud sync is disabled (read-only). |
| **Priority** | P1 |

---

## 3. Core Rule Flows

### E2E-RULE-001: Create HTTP Mock Rule and Verify Interception

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-001 |
| **Description** | Create a mock rule and verify it intercepts matching requests on the active tab |
| **Preconditions** | Extension installed, a test webpage open that makes fetch/XHR requests |
| **Steps** | 1. Open side panel<br>2. Enable interception on the active tab (toggle on)<br>3. Click "Add Rule"<br>4. Set URL pattern: `https://api.example.com/users` (exact match)<br>5. Set method: `GET`<br>6. Set status code: `200`<br>7. Set response body: `{"users": [{"id": 1, "name": "Test User"}]}`<br>8. Set response type: `json`<br>9. Save the rule<br>10. Navigate to the test page and trigger a `GET https://api.example.com/users` request<br>11. Inspect the response in DevTools Network tab |
| **Expected Result** | Rule created with unique ID, `enabled: true`, stored in `chrome.storage.local`. When the matching request is made, the injected content script intercepts it via fetch/XHR override. Response body matches the configured mock. Status code is `200`. No real network request is made to the actual server. Request log entry shows the request as "mocked". |
| **Priority** | P0 |

### E2E-RULE-002: Edit Rule and Verify Updated Response

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-002 |
| **Description** | Modify an existing rule's response and verify the new response is served |
| **Preconditions** | Rule from E2E-RULE-001 exists and is active |
| **Steps** | 1. Open side panel, find the existing rule<br>2. Click edit on the rule<br>3. Change response body to `{"users": [{"id": 1, "name": "Updated User"}]}`<br>4. Change status code to `201`<br>5. Save changes<br>6. Trigger the matching request again on the test page |
| **Expected Result** | Rule `updatedAt` timestamp updated. New response body `{"users": [{"id": 1, "name": "Updated User"}]}` is served. Status code `201` returned. Previous response is no longer served. |
| **Priority** | P0 |

### E2E-RULE-003: Delete Rule and Verify Passthrough

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-003 |
| **Description** | Delete a mock rule and verify requests pass through to the real server |
| **Preconditions** | An active mock rule exists for a specific URL pattern |
| **Steps** | 1. Open side panel, find the rule<br>2. Click delete on the rule<br>3. Confirm deletion<br>4. Trigger the matching request on the test page |
| **Expected Result** | Rule removed from `chrome.storage.local`. Request passes through to the real server. Real response returned (not the mock). Request log shows the request as "not intercepted" (or no matching rule). |
| **Priority** | P0 |

### E2E-RULE-004: Toggle Rule On/Off

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-004 |
| **Description** | Disable and re-enable a rule, verifying interception toggles accordingly |
| **Preconditions** | An active mock rule exists |
| **Steps** | 1. Open side panel, find the rule (should show `enabled: true`)<br>2. Click the toggle switch to disable the rule<br>3. Trigger the matching request — verify real response is returned<br>4. Click the toggle switch to re-enable the rule<br>5. Trigger the matching request again — verify mock response is returned |
| **Expected Result** | When disabled: `enabled: false` persisted, requests pass through to real server. When re-enabled: `enabled: true` persisted, mock response served again. Toggle change is immediate (no page reload required). |
| **Priority** | P0 |

### E2E-RULE-005: Rule Priority Ordering

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-005 |
| **Description** | When multiple rules match the same request, the highest-priority rule wins |
| **Preconditions** | Two or more enabled rules that match the same URL/method |
| **Steps** | 1. Create Rule A: URL `https://api.example.com/*` (wildcard), GET, response `{"source": "rule-a"}`, priority 1<br>2. Create Rule B: URL `https://api.example.com/*` (wildcard), GET, response `{"source": "rule-b"}`, priority 2<br>3. Trigger a GET request to `https://api.example.com/anything`<br>4. Verify which response is served<br>5. Reorder rules (drag-and-drop or manual priority change) so Rule B has higher priority<br>6. Trigger the request again |
| **Expected Result** | The first matching enabled rule by priority order wins (lower priority number = higher precedence per FR-013/FR-014). After reordering, the newly top-priority rule's response is served. |
| **Priority** | P1 |

### E2E-RULE-006: WebSocket Rule Creation and Interception

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-006 |
| **Description** | Create a WebSocket mock rule and verify it intercepts WebSocket connections |
| **Preconditions** | Extension installed, test page that establishes WebSocket connections |
| **Steps** | 1. Open side panel<br>2. Enable interception on the active tab<br>3. Click "Add Rule", select request type: `websocket`<br>4. Set URL pattern: `wss://ws.example.com/socket`<br>5. Set `onConnect` message: `{"type": "welcome"}`<br>6. Add a message rule: match `{"type": "ping"}`, respond `{"type": "pong"}`, delay 100ms<br>7. Save the rule<br>8. On the test page, establish a WebSocket connection to `wss://ws.example.com/socket`<br>9. Send `{"type": "ping"}` message |
| **Expected Result** | WebSocket connection intercepted. On connect, `{"type": "welcome"}` message received automatically. When `{"type": "ping"}` is sent, `{"type": "pong"}` is received after 100ms delay. Real WebSocket server is not contacted. |
| **Priority** | P1 |

### E2E-RULE-007: GraphQL Operation Matching

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-007 |
| **Description** | Create a rule that matches GraphQL requests by operation name |
| **Preconditions** | Extension installed, test page making GraphQL requests to a single endpoint |
| **Steps** | 1. Create a mock rule:<br>&nbsp;&nbsp;- URL pattern: `https://api.example.com/graphql`<br>&nbsp;&nbsp;- Method: POST<br>&nbsp;&nbsp;- GraphQL operation: `GetUsers`<br>&nbsp;&nbsp;- Response: `{"data": {"users": [{"id": 1}]}}`<br>2. Create another rule for the same URL but operation: `GetPosts`, response: `{"data": {"posts": []}}`<br>3. Trigger a POST to `https://api.example.com/graphql` with body containing `"operationName": "GetUsers"`<br>4. Trigger another POST with `"operationName": "GetPosts"` |
| **Expected Result** | Each GraphQL operation is matched by its `operationName` field in the request body. `GetUsers` returns the users mock. `GetPosts` returns the posts mock. A request with a different operation name (e.g., `GetComments`) passes through to the real server. |
| **Priority** | P1 |

### E2E-RULE-008: Rule with Response Delay

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-008 |
| **Description** | Mock rule with a configured delay correctly delays the response |
| **Preconditions** | Extension installed, interception enabled on active tab |
| **Steps** | 1. Create a rule with URL pattern matching a test endpoint<br>2. Set delay to `2000` (2 seconds)<br>3. Trigger the matching request<br>4. Measure time between request initiation and response |
| **Expected Result** | Response is delayed by approximately 2000ms (within reasonable tolerance). This allows testing loading states and timeout handling on the frontend. |
| **Priority** | P1 |

### E2E-RULE-009: Rule with Custom Headers

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-009 |
| **Description** | Mock rule returns custom response headers |
| **Preconditions** | Extension installed, interception enabled |
| **Steps** | 1. Create a rule with custom response headers:<br>&nbsp;&nbsp;- `X-Custom-Header: test-value`<br>&nbsp;&nbsp;- `Content-Type: application/json`<br>2. Trigger the matching request<br>3. Inspect response headers in DevTools |
| **Expected Result** | Response includes the configured custom headers. Headers are correctly formatted and readable by the consuming JavaScript code. |
| **Priority** | P2 |

### E2E-RULE-010: URL Pattern Matching — Wildcard and Regex

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-010 |
| **Description** | Verify wildcard and regex URL matching modes |
| **Preconditions** | Extension installed, interception enabled |
| **Steps** | 1. Create a wildcard rule: `https://api.example.com/users/*/profile`<br>2. Trigger `https://api.example.com/users/123/profile` — should match<br>3. Trigger `https://api.example.com/users/456/profile` — should match<br>4. Trigger `https://api.example.com/users/123/settings` — should NOT match<br>5. Create a regex rule: `https://api\\.example\\.com/v[0-9]+/data`<br>6. Trigger `https://api.example.com/v1/data` — should match<br>7. Trigger `https://api.example.com/v2/data` — should match<br>8. Trigger `https://api.example.com/latest/data` — should NOT match |
| **Expected Result** | Wildcard patterns match using `*` as any-segment placeholder. Regex patterns match using full regular expression syntax. Non-matching URLs pass through to the real server. |
| **Priority** | P1 |

### E2E-RULE-011: Body Match for POST Requests

| Field | Value |
|-------|-------|
| **Test ID** | E2E-RULE-011 |
| **Description** | Rule matches by partial JSON body content |
| **Preconditions** | Extension installed, interception enabled |
| **Steps** | 1. Create a rule with URL `https://api.example.com/action`, method POST, bodyMatch: `{"action": "create"}`<br>2. POST to the URL with body `{"action": "create", "data": {"name": "test"}}` — should match<br>3. POST to the URL with body `{"action": "delete"}` — should NOT match |
| **Expected Result** | Partial JSON body matching works correctly. The rule matches when the request body contains the specified JSON subset, regardless of additional fields. |
| **Priority** | P1 |

---

## 4. Recording Flow

### E2E-REC-001: Start Recording, Capture Requests, Stop Recording

| Field | Value |
|-------|-------|
| **Test ID** | E2E-REC-001 |
| **Description** | Record real API responses from a tab |
| **Preconditions** | Extension installed, a test webpage open that makes API requests |
| **Steps** | 1. Open side panel<br>2. Select a tab for recording<br>3. Click "Start Recording"<br>4. On the test page, trigger several API requests (e.g., page navigation, button clicks)<br>5. Observe recording indicator is visible<br>6. Click "Stop Recording" |
| **Expected Result** | Recording starts: `isRecording: true`, `recordingTabId` set in storage. All fetch/XHR requests from the tab are captured with full details (URL, method, status, headers, response body). Recording indicator visible in the UI. After stopping: captured entries listed in the recording panel. `isRecording: false`. |
| **Priority** | P0 |

### E2E-REC-002: Save Recorded Entries as Rules

| Field | Value |
|-------|-------|
| **Test ID** | E2E-REC-002 |
| **Description** | Convert recorded API responses into mock rules |
| **Preconditions** | Recording completed with captured entries (E2E-REC-001) |
| **Steps** | 1. View the list of recorded entries<br>2. Select one or more entries to save as rules<br>3. Click "Save as Rules" (or equivalent action)<br>4. Optionally edit the pre-filled rule details (URL, method, response body)<br>5. Confirm save |
| **Expected Result** | Each selected recorded entry is converted to a `MockRule` with pre-filled fields: `urlPattern` from request URL, `method`, `statusCode`, `responseBody`, `responseHeaders` from the captured response. Rules appear in the rules list. `urlMatchType` defaults to `'exact'`. |
| **Priority** | P0 |

### E2E-REC-003: Saved Recorded Rules Intercept Correctly

| Field | Value |
|-------|-------|
| **Test ID** | E2E-REC-003 |
| **Description** | Rules created from recordings correctly intercept subsequent requests |
| **Preconditions** | Rules saved from recording (E2E-REC-002), interception enabled |
| **Steps** | 1. Enable interception on the tab<br>2. Trigger the same API requests that were recorded<br>3. Inspect the responses |
| **Expected Result** | Recorded responses are served as mock responses. Response body, status code, and headers match the originally recorded values. Requests do not reach the real server. |
| **Priority** | P1 |

---

## 5. Teams & Sync

### E2E-TEAM-001: Create Team and Invite Member

| Field | Value |
|-------|-------|
| **Test ID** | E2E-TEAM-001 |
| **Description** | User creates a team workspace and invites another user |
| **Preconditions** | User A authenticated with `plan: 'team'`, User B has a registered account |
| **Steps** | 1. User A opens side panel, navigates to Teams<br>2. Click "Create Team"<br>3. Enter team name: "QA Team"<br>4. Click "Create"<br>5. Click "Invite Member"<br>6. Enter User B's email address<br>7. Click "Send Invite" |
| **Expected Result** | Team created in Firestore `teams/{teamId}` with User A as owner. TeamInvite created with `status: 'pending'`. User B receives invitation (visible in their extension). Team appears in User A's team list with role `'owner'`. |
| **Priority** | P0 |

### E2E-TEAM-002: Accept Team Invite

| Field | Value |
|-------|-------|
| **Test ID** | E2E-TEAM-002 |
| **Description** | Invited user accepts a team invitation |
| **Preconditions** | User B has a pending team invite from E2E-TEAM-001 |
| **Steps** | 1. User B opens side panel<br>2. Navigate to Teams or Notifications section<br>3. See pending invite from "QA Team"<br>4. Click "Accept" |
| **Expected Result** | Invite status changes to `'accepted'`. User B added to `teams/{teamId}/members/{uid}` with role `'member'`. Team appears in User B's team list. User B can see shared collections. |
| **Priority** | P0 |

### E2E-TEAM-003: Decline Team Invite

| Field | Value |
|-------|-------|
| **Test ID** | E2E-TEAM-003 |
| **Description** | Invited user declines a team invitation |
| **Preconditions** | User has a pending team invite |
| **Steps** | 1. Open side panel, view pending invite<br>2. Click "Decline" |
| **Expected Result** | Invite status changes to `'declined'`. User is NOT added to the team. Team does not appear in user's team list. Invite no longer shown in notifications. |
| **Priority** | P1 |

### E2E-TEAM-004: Push Rules to Cloud and Pull on Another Device

| Field | Value |
|-------|-------|
| **Test ID** | E2E-TEAM-004 |
| **Description** | Push local collections to cloud and pull them on a different browser/device |
| **Preconditions** | User A is a team member with Pro/Team plan, has local collections with rules. User A also logged in on a second Chrome profile/device. |
| **Steps** | 1. On Device 1: User A creates a collection "API Mocks" with 3 rules<br>2. Click "Push to Cloud" / Sync button<br>3. Verify collections appear in Firestore `teams/{teamId}/collections/`<br>4. On Device 2: User A opens extension, logs in<br>5. Navigate to team collections<br>6. Click "Pull from Cloud" / Sync button |
| **Expected Result** | Push: collections and rules serialized and stored in Firestore as `CloudCollection` with version number, `updatedBy`, and timestamps. Pull: collections and rules downloaded and stored locally. Rules are fully functional for interception on Device 2. Version numbers match. |
| **Priority** | P0 |

### E2E-TEAM-005: Conflict Detection and Resolution

| Field | Value |
|-------|-------|
| **Test ID** | E2E-TEAM-005 |
| **Description** | When two users modify the same collection, conflict is detected and resolved |
| **Preconditions** | Two team members (User A and User B) with access to the same team collection |
| **Steps** | 1. User A and User B both pull the same collection (version N)<br>2. User A edits a rule and pushes (collection becomes version N+1)<br>3. User B edits a different rule and attempts to push<br>4. Conflict detected (User B's local version is N, cloud is N+1)<br>5. User B is presented with conflict resolution options: merge, replace-local, replace-cloud |
| **Expected Result** | `SyncConflict` detected with `localVersion` and `cloudVersion` mismatch. Conflict dialog shows collection name, local and cloud timestamps. **Merge**: Both changes combined. **Replace-local**: User B's changes overwritten with cloud version. **Replace-cloud**: User B's changes pushed, overwriting cloud version. Version incremented after resolution. |
| **Priority** | P1 |

### E2E-TEAM-006: Version History — View and Restore Previous Version

| Field | Value |
|-------|-------|
| **Test ID** | E2E-TEAM-006 |
| **Description** | View version history of a cloud collection and restore a previous version |
| **Preconditions** | User with Pro/Team plan, collection with multiple cloud versions |
| **Steps** | 1. Open a cloud-synced collection<br>2. Click "Version History"<br>3. View list of previous versions with timestamps and authors<br>4. Select a previous version to preview<br>5. Click "Restore" on the previous version<br>6. Confirm restoration |
| **Expected Result** | Version history shows all `VersionSnapshot` entries from `teams/{teamId}/collections/{collectionId}/versions/`. Each entry shows version number, `updatedBy`, `updatedAt`. Restoring a version creates a new version (N+1) with the content of the selected old version. Current rules are replaced with the restored version's rules. |
| **Priority** | P1 |

### E2E-TEAM-007: Team Member Quota Enforcement

| Field | Value |
|-------|-------|
| **Test ID** | E2E-TEAM-007 |
| **Description** | Cannot invite more than the plan limit of team members |
| **Preconditions** | Team plan with 10-member limit, team already has 10 members |
| **Steps** | 1. Team owner tries to invite an 11th member<br>2. Click "Send Invite" |
| **Expected Result** | UpgradePrompt or error displayed: "You've reached the limit of 10 team members on the team plan." Invite is not created. |
| **Priority** | P2 |

---

## 6. UI / Extension

### E2E-UI-001: Popup Tab Toggle — Activate/Deactivate Interception Per Tab

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-001 |
| **Description** | Toggle interception on/off for individual tabs from the popup |
| **Preconditions** | Extension installed, multiple tabs open |
| **Steps** | 1. Click extension icon to open popup<br>2. See list of open tabs with their URLs<br>3. Toggle interception ON for Tab A<br>4. Toggle interception OFF for Tab B (if it was on)<br>5. Verify Tab A has content script injected and intercepts requests<br>6. Verify Tab B does NOT intercept requests |
| **Expected Result** | Popup shows all open tabs (FR-006). Each tab has an independent toggle (FR-007). Toggling ON adds tab ID to `activeTabIds` in storage, injects content script. Toggling OFF removes tab ID, stops interception. Changes are immediate without page reload. Extension icon may show active/inactive badge per tab. |
| **Priority** | P0 |

### E2E-UI-002: Side Panel Navigation

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-002 |
| **Description** | All side panel sections are accessible and render correctly |
| **Preconditions** | Extension installed, user authenticated |
| **Steps** | 1. Open side panel<br>2. Navigate to Rules section — verify rule list renders<br>3. Navigate to Collections section — verify collection tree renders<br>4. Navigate to Recording section — verify recording controls render<br>5. Navigate to Request Log section — verify log entries render<br>6. Navigate to Teams section — verify team list renders<br>7. Navigate to Billing section — verify plan info renders<br>8. Navigate to Settings section — verify settings form renders |
| **Expected Result** | All navigation links/tabs work correctly. Each section loads without errors. Content is displayed appropriately based on auth state and plan. No blank screens or uncaught exceptions in console. |
| **Priority** | P0 |

### E2E-UI-003: Theme Switching — Dark/Light/System

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-003 |
| **Description** | User can switch between dark, light, and system themes |
| **Preconditions** | Extension installed |
| **Steps** | 1. Open side panel, go to Settings<br>2. Select "Light" theme — verify UI uses light color scheme<br>3. Select "Dark" theme — verify UI uses dark color scheme<br>4. Select "System" theme<br>5. Change OS theme preference and verify extension follows |
| **Expected Result** | Theme selection persisted in `settings.theme` in `chrome.storage.local`. Light theme: light backgrounds, dark text. Dark theme: dark backgrounds, light text. System theme: follows OS `prefers-color-scheme`. All UI components respect the theme (side panel, popup, dialogs). Theme tokens from `ui/theme/tokens.ts` applied correctly. |
| **Priority** | P1 |

### E2E-UI-004: Import Collections from JSON

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-004 |
| **Description** | Import mock collections from a JSON file |
| **Preconditions** | Extension installed, a valid export JSON file available |
| **Steps** | 1. Open side panel, navigate to Import/Export section<br>2. Click "Import"<br>3. Select a valid JSON file containing collections and rules<br>4. Handle any conflict resolution (merge/replace) if duplicate collections exist<br>5. Confirm import |
| **Expected Result** | Collections and rules from the JSON file are added to local storage. Duplicate handling follows FR-042 (merge or replace options). Imported rules are functional for interception. Collection structure (nesting, ordering) preserved. Success notification shown with count of imported items. |
| **Priority** | P1 |

### E2E-UI-005: Export Collections to JSON

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-005 |
| **Description** | Export mock collections to a JSON file |
| **Preconditions** | Extension has at least one collection with rules |
| **Steps** | 1. Open side panel, navigate to Import/Export section<br>2. Select collections to export (or "Export All")<br>3. Click "Export"<br>4. Save the downloaded JSON file<br>5. Open the file and verify its content |
| **Expected Result** | JSON file downloaded with correct structure containing selected collections and their rules. File is valid JSON. Re-importing the file produces identical collections and rules. File includes all rule properties (URL pattern, method, response body, headers, delay, etc.). |
| **Priority** | P1 |

### E2E-UI-006: Collection Management — Create, Nest, Toggle, Reorder

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-006 |
| **Description** | Full collection management including nesting and bulk toggle |
| **Preconditions** | Extension installed |
| **Steps** | 1. Create a collection "API v1"<br>2. Create a sub-collection "Users" inside "API v1"<br>3. Add rules to both collections<br>4. Toggle the parent collection "API v1" off<br>5. Verify all rules in "API v1" and "Users" are disabled<br>6. Drag a rule from "Users" to "API v1"<br>7. Verify the rule moves correctly |
| **Expected Result** | Collections support at least 2 levels of nesting (FR-031). Toggling a collection enables/disables all contained rules (FR-032). Drag-and-drop reordering works for rules within and across collections (FR-033). Collection state persisted to `chrome.storage.local`. |
| **Priority** | P1 |

### E2E-UI-007: Request Log — Real-Time Entries

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-007 |
| **Description** | Request log shows real-time intercepted requests with correct details |
| **Preconditions** | Extension installed, interception enabled, logging enabled in settings |
| **Steps** | 1. Open side panel, navigate to Request Log<br>2. Trigger several API requests on the intercepted tab (some matching rules, some not)<br>3. Observe log entries appearing in real time |
| **Expected Result** | Log entries appear in real time (FR-050). Each entry shows: timestamp, HTTP method, URL, status code, and whether it was intercepted/mocked (FR-051). Mocked requests clearly distinguished from passthrough requests. Log respects `maxLogEntries` setting. |
| **Priority** | P1 |

### E2E-UI-008: Create Rule from Log Entry

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-008 |
| **Description** | Click a log entry to create a mock rule from it |
| **Preconditions** | Request log has entries from real (non-mocked) requests |
| **Steps** | 1. Open Request Log<br>2. Click on a log entry for a real request<br>3. Click "Create Rule from This" (or equivalent action)<br>4. Verify the rule form is pre-filled with the request details<br>5. Save the rule |
| **Expected Result** | Rule creation form pre-filled with URL, method, and (if available) response details from the log entry (FR-052). User can edit before saving. Saved rule is functional for interception. |
| **Priority** | P2 |

### E2E-UI-009: Extension Does Not Break Page When Interception Disabled

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-009 |
| **Description** | Pages function normally when interception is disabled for a tab |
| **Preconditions** | Extension installed, interception OFF for the active tab |
| **Steps** | 1. Open a complex web application (e.g., Gmail, GitHub)<br>2. Verify interception is OFF for this tab<br>3. Use the web application normally (navigation, API calls, WebSocket connections)<br>4. Check browser console for errors |
| **Expected Result** | Web application functions identically to how it would without the extension installed (NFR-005). No JavaScript errors from the extension in the console. No fetch/XHR/WebSocket override code injected. No performance degradation. |
| **Priority** | P0 |

### E2E-UI-010: Extension Works with CSP-Restricted Pages

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-010 |
| **Description** | Extension correctly intercepts requests on pages with strict Content Security Policy |
| **Preconditions** | Extension installed, a webpage with strict CSP headers |
| **Steps** | 1. Navigate to a page with strict CSP (e.g., GitHub, banking sites)<br>2. Enable interception on the tab<br>3. Create a rule matching a request on that page<br>4. Trigger the matching request |
| **Expected Result** | Content script injected successfully despite CSP restrictions (NFR-006). Request interception works correctly. No CSP violation errors in console related to the extension's operation. |
| **Priority** | P1 |

### E2E-UI-011: Account Popover — Plan Badge and Actions

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-011 |
| **Description** | Account popover shows correct plan badge and appropriate actions |
| **Preconditions** | User authenticated |
| **Steps** | 1. Open side panel<br>2. Click user avatar / account area to open AccountPopover<br>3. If free user: verify "Upgrade Plan" button is visible<br>4. If Pro/Team user: verify "Manage Plan" link is visible<br>5. Verify plan badge color matches plan (free=gray, pro=blue, team=purple) |
| **Expected Result** | AccountPopover displays user email, display name, and plan badge. Free users see "Upgrade Plan" button that navigates to Billing page. Paid users see "Manage Plan" that navigates to Billing page. Sign Out option is present. Badge variant matches `PLAN_BADGE_VARIANT`. |
| **Priority** | P1 |

### E2E-UI-012: Storage Bar Displays Accurate Usage

| Field | Value |
|-------|-------|
| **Test ID** | E2E-UI-012 |
| **Description** | StorageBar component shows real storage usage vs plan quota |
| **Preconditions** | User authenticated, has some stored rules/collections |
| **Steps** | 1. Open side panel<br>2. Locate the StorageBar component<br>3. Verify it shows current usage (e.g., "2.3 MB / 5 MB")<br>4. Create a rule with a large response body<br>5. Verify StorageBar updates |
| **Expected Result** | StorageBar reflects actual `storageUsedBytes` from Firestore. Quota limit matches `PLAN_LIMITS[user.plan].storageBytes`. Progress bar fills proportionally. Color changes as usage approaches limit (using size analyzer color coding). |
| **Priority** | P2 |

---

## Test Execution Notes

### Environment Setup
1. Load extension in Chrome developer mode
2. Configure Firebase emulator or test project
3. Configure Stripe test mode keys in `.env`
4. Prepare test web pages with known API endpoints for interception testing
5. Set up two Chrome profiles for multi-device/team tests

### Test Data
- Test user accounts (email/password, Google, GitHub)
- Pre-built JSON export files for import testing
- Test web pages making fetch, XHR, WebSocket, and GraphQL requests
- Stripe test cards for billing flow testing

### Priority Definitions
| Priority | Definition | When to Run |
|----------|-----------|-------------|
| P0 | Critical path — must pass for any release | Every build, pre-merge |
| P1 | Important functionality — should pass for release | Daily, pre-release |
| P2 | Nice-to-have — can ship with known issues | Weekly, milestone review |
