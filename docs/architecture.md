# Request Interceptor — Architecture Document

## 1. System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Browser                        │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Popup   │  │  Side Panel  │  │  Content Script   │  │
│  │ (React)  │  │   (React)    │  │  (Injected JS)    │  │
│  │          │  │              │  │                   │  │
│  │ Tab list │  │ Rule editor  │  │ fetch/XHR/WS      │  │
│  │ Quick    │  │ Collections  │  │ override +        │  │
│  │ toggles  │  │ Request log  │  │ interception      │  │
│  │          │  │ Settings     │  │                   │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
│       │               │                   │             │
│       └───────┬───────┘                   │             │
│               │    chrome.runtime         │             │
│               │    .sendMessage           │             │
│       ┌───────▼───────────────────────────▼──────────┐  │
│       │         Background Service Worker            │  │
│       │                                              │  │
│       │  - Tab management                            │  │
│       │  - Rule storage (chrome.storage.local)       │  │
│       │  - webRequest listener (logging)             │  │
│       │  - Content script injection                  │  │
│       │  - Firebase SDK (auth, sync)                 │  │
│       └──────────────────────┬───────────────────────┘  │
│                              │                          │
└──────────────────────────────┼──────────────────────────┘
                               │ HTTPS
                    ┌──────────▼──────────┐
                    │      Firebase       │
                    │                     │
                    │  Auth (Google/GH)   │
                    │  Firestore (data)   │
                    │  Cloud Storage      │
                    │  Cloud Functions    │
                    │  (Stripe webhooks)  │
                    └─────────────────────┘
```

## 2. Extension Architecture

### Components

| Component | Type | Responsibility |
|-----------|------|---------------|
| **Popup** | Browser Action Popup | Tab listing, quick toggles, entry point to side panel |
| **Side Panel** | Chrome Side Panel API | Full editor UI: rules, collections, log, account |
| **Background SW** | Service Worker | Orchestration, storage, tab management, Firebase client, webRequest logging |
| **Content Script** | Injected per-tab | Intercepts fetch/XHR/WebSocket by monkey-patching native APIs |
| **Injected Script** | Page context (`MAIN` world) | Actual API override — runs in page context to intercept real fetch/XHR/WS |

### Why two scripts (Content Script + Injected Script)?

Chrome content scripts run in an **isolated world** — they can't override the page's `window.fetch`. To intercept real API calls, we must inject a script into the **MAIN world** (page context) that:

1. Overrides `window.fetch`, `XMLHttpRequest`, `WebSocket`
2. Communicates with the content script via `window.postMessage`
3. Content script relays to background SW via `chrome.runtime.sendMessage`

```
Page JS ←→ Injected Script (MAIN world) ←→ Content Script (ISOLATED) ←→ Background SW
              │                                      │
              │ window.postMessage                   │ chrome.runtime.sendMessage
              │                                      │
         Overrides fetch/XHR/WS              Relays rules & log data
```

### Manifest V3 Considerations

- **Service Worker** has no DOM access, limited lifetime (can be terminated). Use `chrome.storage` for persistence, not in-memory state.
- **`scripting.executeScript`** with `world: "MAIN"` to inject the interceptor into page context.
- **`webRequest`** in MV3 is read-only (can observe but not block/modify). We use it only for logging. Actual interception is via injected script.
- **Side Panel** API (`chrome.sidePanel`) for persistent editor UI.

## 3. Data Flow

### Mock Rule Application Flow

```
1. User creates rule in Side Panel UI
2. UI sends rule to Background SW via chrome.runtime.sendMessage
3. Background SW saves rule to chrome.storage.local
4. Background SW sends updated rules to Content Script via chrome.tabs.sendMessage
5. Content Script forwards rules to Injected Script via window.postMessage
6. Injected Script evaluates rules on every fetch/XHR/WS call
7. If rule matches → return mock response
8. If no match → pass through to real network
```

### Recording Flow

```
1. User enables recording in Side Panel
2. Background SW notifies Content Script: "start recording"
3. Content Script tells Injected Script: "start recording"
4. Injected Script wraps real fetch/XHR responses
5. On each response: posts {url, method, status, headers, body} to Content Script
6. Content Script relays to Background SW
7. Background SW buffers recorded responses
8. User stops recording → sees captured responses in Side Panel
9. User selects responses → saves as mock rules
```

### Cloud Sync Flow (Premium)

```
1. User clicks "Push to Cloud"
2. Background SW reads collections from chrome.storage.local
3. Background SW pushes to Firestore (teams/{teamId}/collections/...)
4. Creates version snapshot in versions subcollection
5. Other team members click "Pull from Cloud"
6. Background SW fetches from Firestore
7. Compares with local data → detects conflicts
8. If conflict → UI shows merge/replace dialog
9. Resolved data saved to chrome.storage.local
```

## 4. State Management

### Local State (chrome.storage.local)

```typescript
interface StorageSchema {
  // Active interception state
  activeTabIds: number[];           // Tabs currently being intercepted
  isRecording: boolean;             // Recording mode active
  recordingTabId: number | null;    // Tab being recorded

  // Mock rules & collections
  rules: MockRule[];                // All mock rules
  collections: Collection[];       // Collection tree structure

  // Request log (circular buffer)
  requestLog: LogEntry[];           // Last N log entries
  logMaxSize: number;               // Max entries to keep (default 1000)

  // Settings
  settings: {
    theme: 'light' | 'dark' | 'system';
    defaultDelay: number;
    logEnabled: boolean;
    maxLogEntries: number;
  };

  // Auth (token cache)
  authToken: string | null;
  userId: string | null;
}
```

### Key Data Types

```typescript
interface MockRule {
  id: string;                       // UUID
  enabled: boolean;
  priority: number;                 // Lower = higher priority
  collectionId: string | null;

  // Matching
  urlPattern: string;
  urlMatchType: 'exact' | 'wildcard' | 'regex';
  method: HttpMethod | 'ANY';
  bodyMatch?: string;               // Partial JSON match (optional)
  graphqlOperation?: string;        // GraphQL operation name (optional)
  requestType: 'http' | 'websocket';

  // Response
  statusCode: number;
  responseType: 'json' | 'raw' | 'multipart';
  responseBody: string;
  responseHeaders: Record<string, string>;
  delay: number;                    // ms

  // Metadata
  createdAt: string;
  updatedAt: string;
}

interface WebSocketRule extends MockRule {
  requestType: 'websocket';
  onConnect?: string;               // Message to send on connect
  messageRules: Array<{
    match: string;                  // Pattern to match incoming message
    respond: string;                // Response message
    delay: number;
  }>;
}

interface Collection {
  id: string;
  name: string;
  parentId: string | null;          // For nesting
  enabled: boolean;
  order: number;
  ruleIds: string[];               // Rules in this collection
  createdAt: string;
  updatedAt: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  tabId: number;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  responseSize: number;             // bytes
  duration: number;                 // ms
  mocked: boolean;                  // Was this response from a mock rule?
  matchedRuleId: string | null;     // Which rule matched (if mocked)
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

## 5. Firebase Data Model

```
firestore/
├── users/{uid}
│   ├── email: string
│   ├── displayName: string
│   ├── plan: 'free' | 'premium' | 'team'
│   ├── storageUsedBytes: number
│   ├── storageQuotaBytes: number
│   ├── stripeCustomerId: string
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
├── teams/{teamId}
│   ├── name: string
│   ├── ownerId: string (uid)
│   ├── createdAt: timestamp
│   ├── storageUsedBytes: number
│   ├── storageQuotaBytes: number
│   │
│   ├── members/{uid}
│   │   ├── role: 'owner' | 'admin' | 'member'
│   │   ├── joinedAt: timestamp
│   │   └── email: string
│   │
│   └── collections/{collectionId}
│       ├── name: string
│       ├── parentId: string | null
│       ├── enabled: boolean
│       ├── order: number
│       ├── rules: MockRule[]      // Embedded for atomic sync
│       ├── version: number
│       ├── updatedBy: string (uid)
│       ├── updatedAt: timestamp
│       │
│       └── versions/{versionId}
│           ├── version: number
│           ├── rules: MockRule[]
│           ├── createdBy: string (uid)
│           ├── createdAt: timestamp
│           └── message: string
│
├── invites/{inviteId}
│   ├── teamId: string
│   ├── email: string
│   ├── invitedBy: string (uid)
│   ├── status: 'pending' | 'accepted' | 'declined'
│   └── createdAt: timestamp
│
└── billing/{uid}
    ├── stripeCustomerId: string
    ├── subscriptionId: string
    ├── plan: string
    ├── status: 'active' | 'canceled' | 'past_due'
    └── currentPeriodEnd: timestamp
```

### Firestore Security Rules (high-level)

```
- users/{uid}: read/write only by owner
- teams/{teamId}: read by members, write by owner/admin
- teams/{teamId}/members: read by members, write by owner/admin
- teams/{teamId}/collections: read/write by members (role-based)
- invites: create by team owner/admin, read by invitee email
- billing/{uid}: read only by owner, write only by Cloud Functions
```

## 6. Security Considerations

### Content Security Policy
- Injected script runs in MAIN world — bypasses extension CSP but must respect page CSP
- If page has strict CSP blocking inline scripts → use `scripting.executeScript` with file reference, not inline code
- Extension pages (popup, side panel) follow extension's own CSP

### Data Security
- Mock rules with sensitive data (auth tokens, API keys) stored only in chrome.storage.local
- Cloud sync: warn user if rules contain potential secrets before pushing
- Firebase Auth tokens managed by Firebase SDK (auto-refresh)
- Stripe payment data never stored locally — handled entirely by Stripe + Cloud Functions

### Extension Permissions Justification
| Permission | Why |
|-----------|-----|
| `tabs` | List open tabs for tab selector in popup |
| `scripting` | Inject interceptor script into page context |
| `storage` | Persist mock rules, settings, log |
| `webRequest` | Observe requests for logging (read-only) |
| `<all_urls>` | Intercept requests on any website |

## 7. File/Folder Structure

```
projects/request-interceptor/
├── docs/
│   ├── requirements.md
│   ├── architecture.md          # This file
│   ├── design-spec.md
│   └── tech-stack.md
│
├── extension/                   # Chrome extension (React + Vite)
│   ├── public/
│   │   ├── icons/               # Extension icons (16, 32, 48, 128)
│   │   └── manifest.json        # MV3 manifest
│   │
│   ├── src/
│   │   ├── popup/               # Popup entry point
│   │   │   ├── Popup.tsx
│   │   │   ├── components/
│   │   │   │   ├── TabList.tsx
│   │   │   │   ├── TabItem.tsx
│   │   │   │   └── QuickStats.tsx
│   │   │   └── popup.html
│   │   │
│   │   ├── sidepanel/           # Side panel entry point
│   │   │   ├── SidePanel.tsx
│   │   │   ├── pages/
│   │   │   │   ├── RulesPage.tsx
│   │   │   │   ├── RuleEditorPage.tsx
│   │   │   │   ├── CollectionsPage.tsx
│   │   │   │   ├── RequestLogPage.tsx
│   │   │   │   ├── RecordingPage.tsx
│   │   │   │   ├── AccountPage.tsx
│   │   │   │   ├── TeamPage.tsx
│   │   │   │   ├── PricingPage.tsx
│   │   │   │   └── VersionHistoryPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── RuleCard.tsx
│   │   │   │   ├── RuleEditor.tsx
│   │   │   │   ├── WebSocketRuleEditor.tsx
│   │   │   │   ├── CollectionTree.tsx
│   │   │   │   ├── RequestLogEntry.tsx
│   │   │   │   ├── LogEntryDetail.tsx
│   │   │   │   ├── JsonEditor.tsx
│   │   │   │   ├── KeyValueEditor.tsx
│   │   │   │   ├── StatusCodePicker.tsx
│   │   │   │   ├── MethodPicker.tsx
│   │   │   │   ├── URLPatternInput.tsx
│   │   │   │   ├── SizeIndicator.tsx
│   │   │   │   ├── ImportExportDialog.tsx
│   │   │   │   ├── ConflictResolver.tsx
│   │   │   │   ├── StorageBar.tsx
│   │   │   │   ├── PricingCards.tsx
│   │   │   │   ├── AuthForm.tsx
│   │   │   │   ├── TeamMemberList.tsx
│   │   │   │   └── VersionHistoryList.tsx
│   │   │   └── sidepanel.html
│   │   │
│   │   ├── background/          # Service worker
│   │   │   ├── index.ts         # SW entry point
│   │   │   ├── tab-manager.ts   # Tab tracking & content script injection
│   │   │   ├── rule-engine.ts   # Rule matching logic
│   │   │   ├── storage.ts       # chrome.storage wrapper
│   │   │   ├── recorder.ts      # Recording mode management
│   │   │   ├── logger.ts        # Request log management
│   │   │   ├── firebase-client.ts  # Firebase auth & sync
│   │   │   └── message-handler.ts  # Message routing
│   │   │
│   │   ├── content/             # Content script (ISOLATED world)
│   │   │   └── index.ts         # Message relay between page and SW
│   │   │
│   │   ├── injected/            # Injected into page (MAIN world)
│   │   │   ├── index.ts         # Entry point
│   │   │   ├── fetch-interceptor.ts
│   │   │   ├── xhr-interceptor.ts
│   │   │   ├── websocket-interceptor.ts
│   │   │   └── rule-matcher.ts  # Evaluates rules against requests
│   │   │
│   │   ├── shared/              # Shared types and utilities
│   │   │   ├── types.ts         # MockRule, Collection, LogEntry, etc.
│   │   │   ├── constants.ts     # Message types, storage keys
│   │   │   ├── url-matcher.ts   # URL pattern matching (wildcard, regex)
│   │   │   └── size-analyzer.ts # Response size categorization
│   │   │
│   │   └── ui/                  # Shared UI components
│   │       ├── theme/
│   │       │   ├── tokens.ts    # Color tokens, spacing, typography
│   │       │   └── ThemeProvider.tsx
│   │       └── common/
│   │           ├── Button.tsx
│   │           ├── Toggle.tsx
│   │           ├── Input.tsx
│   │           ├── Select.tsx
│   │           ├── Modal.tsx
│   │           ├── Badge.tsx
│   │           └── Spinner.tsx
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── postcss.config.js
│
└── firebase/                    # Firebase config & Cloud Functions
    ├── firestore.rules
    ├── firestore.indexes.json
    ├── storage.rules
    └── functions/
        ├── src/
        │   ├── index.ts         # Cloud Functions entry
        │   ├── stripe-webhooks.ts
        │   ├── team-invites.ts  # Send invite emails
        │   └── storage-quota.ts # Enforce storage limits
        ├── package.json
        └── tsconfig.json
```

## 8. Performance Considerations

### Interceptor Performance
- Injected script keeps rules in memory (no async storage lookups per request)
- Rule matching uses optimized data structure: index by method, then URL prefix tree for fast lookup
- Rules are re-sent to injected script only when changed, not on every request

### Request Log
- Circular buffer with configurable max size (default 1000)
- Log entries stored in chrome.storage.local in batches (not per-entry writes)
- UI uses virtual scrolling for large logs

### Extension Startup
- Popup shows cached tab list while querying fresh data
- Side panel lazy-loads pages (code splitting per route)
- Firebase SDK loaded only when user accesses account features

### Storage
- Rules serialized to chrome.storage.local (effectively unlimited size)
- Large mock response bodies (>1MB): consider storing in IndexedDB for better performance
- Cloud sync: diff-based — only push changed collections, not entire dataset
