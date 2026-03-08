# Request Interceptor — Tickets

All tickets are organized by milestones. Each ticket follows the Phase 2 output format.
GitHub Issues will be created after Phase 0 (repo setup).

---

## Milestone 0: DevOps Setup

### TICKET-001: Create GitHub repo and CI/CD

**Labels:** `devops`
**Agent:** @devops-engineer

#### Requirements
- Create GitHub repo `devkudasov/request-interceptor`
- Set up `main` and `develop` branches with protection rules
- Create CI workflow (lint, typecheck, test)
- Set up project scaffolding: Vite + CRXJS + React + TypeScript + Tailwind
- Configure ESLint, Prettier, Husky + lint-staged
- Create base MV3 manifest.json
- Set up Firebase project config (placeholder)

#### Acceptance Criteria
- [ ] Repo exists at `devkudasov/request-interceptor`
- [ ] `develop` branch is default, `main` is protected
- [ ] CI runs on PR: lint + typecheck + tests
- [ ] `npm run dev` starts extension in dev mode with HMR
- [ ] `npm run build` produces loadable Chrome extension
- [ ] Empty popup, side panel, and background SW load without errors

#### Technical Notes
- Use CRXJS Vite Plugin for MV3 support
- Manifest permissions: `tabs`, `scripting`, `storage`, `webRequest`, `sidePanel`, `<all_urls>`
- Two HTML entry points: `popup.html`, `sidepanel.html`
- Tailwind config with custom tokens from design-spec.md

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 1: Core Extension Shell

### TICKET-002: Shared types, constants, and theme system

**Labels:** `frontend`
**Agent:** @react-developer

#### Requirements
- US: As a developer, I want consistent types across all extension components
- Define all TypeScript interfaces: MockRule, WebSocketRule, Collection, LogEntry, StorageSchema
- Define message types for chrome.runtime communication
- Implement theme provider with dark/light/system mode support
- Define color tokens, typography, spacing from design-spec.md

#### Design
- Figma ref: design-spec.md → "Dark / Light Mode" section, "Color Tokens", "Typography", "Spacing"

#### Acceptance Criteria
- [ ] All shared types exported from `src/shared/types.ts`
- [ ] All message types in `src/shared/constants.ts`
- [ ] ThemeProvider wraps popup and sidepanel, reads system preference
- [ ] Theme toggle works: dark → light → system
- [ ] Tailwind config includes all design tokens

#### Corner Cases
- [ ] System theme changes while extension is open → auto-switch
- [ ] Different theme in popup vs sidepanel → should be synced via storage

#### Technical Notes
- Theme stored in `chrome.storage.local` under `settings.theme`
- Tailwind `darkMode: 'class'` — ThemeProvider sets class on root
- Tokens defined in `tailwind.config.ts` `extend.colors`

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-003: Common UI components library

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-002

#### Requirements
- Build reusable UI components: Button, Toggle, Input, Select, Modal, Badge, Spinner
- All components support dark/light mode via theme tokens
- All components are accessible (keyboard nav, ARIA labels)

#### Design
- Figma ref: design-spec.md → "Component Inventory"

#### Acceptance Criteria
- [ ] All components listed in Component Inventory are created
- [ ] Components render correctly in dark and light mode
- [ ] Toggle component fires onChange with boolean value
- [ ] Modal supports open/close, overlay click to close, Escape to close
- [ ] All interactive elements keyboard-navigable

#### Corner Cases
- [ ] Modal open when popup closes → no memory leak
- [ ] Very long text in Badge → truncate with ellipsis
- [ ] Button disabled state → no click handler fires

#### Technical Notes
- Components in `src/ui/common/`
- Use Tailwind classes, no inline styles
- Export all from `src/ui/common/index.ts` barrel file

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-004: Background service worker — message handler and storage wrapper

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-002

#### Requirements
- Implement chrome.storage.local wrapper with typed get/set/update
- Implement message handler that routes messages from popup/sidepanel/content scripts
- Initialize storage with defaults on extension install

#### Acceptance Criteria
- [ ] `storage.get<T>(key)` returns typed value
- [ ] `storage.set(key, value)` persists to chrome.storage.local
- [ ] `storage.onChanged(key, callback)` listens to storage changes
- [ ] Message handler routes messages by `type` field
- [ ] On install: storage initialized with default settings, empty rules/collections

#### Corner Cases
- [ ] Service worker restarts (MV3 lifecycle) → state restored from storage
- [ ] Concurrent writes to same storage key → last write wins
- [ ] Storage quota exceeded → error handled, user notified

#### Technical Notes
- SW has no DOM — no React, pure TypeScript
- Use `chrome.runtime.onInstalled` for initialization
- Message format: `{ type: string, payload: any }`
- Typed message map for type-safe routing

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 2: Interception Engine

### TICKET-005: Content script + MAIN world injection pipeline

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-004

#### Requirements
- FR-005, FR-007: Per-tab interception, enable/disable independently
- Content script (ISOLATED world): relay messages between page and background SW
- Injected script (MAIN world): placeholder for interceptors, loaded via `chrome.scripting.executeScript`
- Background SW: inject/remove scripts when user toggles tab interception

#### Design
- Architecture: "Why two scripts" section

#### Acceptance Criteria
- [ ] When interception enabled for tab → scripts injected into page
- [ ] When interception disabled → scripts cleaned up (originals restored)
- [ ] Content script relays messages between injected script and SW
- [ ] Multiple tabs can be intercepted simultaneously
- [ ] Navigating to new page on intercepted tab → re-inject scripts

#### Corner Cases
- [ ] Tab navigates to chrome:// URL → skip injection, no error
- [ ] Tab closed while intercepting → cleanup, remove from activeTabIds
- [ ] Extension reloaded while tabs are intercepted → restore state from storage
- [ ] Page with strict CSP → inject via file reference, not inline
- [ ] iframe pages → inject into main frame only (configurable later)

#### Technical Notes
- Use `chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", files: ["injected.js"] })`
- Content script registered in manifest for `<all_urls>` but only active when tab is in activeTabIds
- Use `chrome.tabs.onRemoved` and `chrome.tabs.onUpdated` listeners
- Communication: `window.postMessage` with unique prefix to avoid conflicts

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-006: Fetch interceptor

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-005

#### Requirements
- FR-001: Intercept fetch API calls on selected tabs
- Override `window.fetch` in MAIN world
- Evaluate mock rules against each fetch request
- If match → return mock response with configured delay
- If no match → pass through to real fetch

#### Acceptance Criteria
- [ ] `window.fetch` calls are intercepted when rules are active
- [ ] Matching works by URL pattern (exact, wildcard, regex)
- [ ] Matching works by HTTP method
- [ ] Matching works by request body (partial JSON match)
- [ ] Mock response includes custom body, status, headers
- [ ] Configured delay is applied before returning mock response
- [ ] Non-matching requests pass through to real fetch unchanged
- [ ] Original `window.fetch` is fully restored on cleanup

#### Corner Cases
- [ ] fetch with Request object instead of URL string → handle both signatures
- [ ] fetch with AbortController → abort should still work for real requests
- [ ] fetch with streaming response → mock returns complete body
- [ ] Concurrent fetches → each evaluated independently
- [ ] Rule disabled mid-request → complete current mock, don't affect in-flight

#### Technical Notes
- Store original fetch: `const originalFetch = window.fetch`
- Create `window.fetch = async function(...args) { ... }`
- Parse Request/URL to extract method, url, body
- Use `rule-matcher.ts` to find matching rule
- Mock Response: `new Response(body, { status, headers })`
- Delay: `await new Promise(r => setTimeout(r, rule.delay))`

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-007: XMLHttpRequest interceptor

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-005

#### Requirements
- FR-002: Intercept XHR calls on selected tabs
- Override `XMLHttpRequest.prototype.open` and `.send` in MAIN world
- Apply same rule matching as fetch interceptor

#### Acceptance Criteria
- [ ] XHR calls are intercepted when rules are active
- [ ] Matching by URL, method, request body works
- [ ] Mock response sets `status`, `statusText`, `responseText`, `response`, `responseType`
- [ ] Response headers accessible via `getResponseHeader()` / `getAllResponseHeaders()`
- [ ] Configured delay is applied
- [ ] `onload`, `onreadystatechange`, `load` event fired correctly
- [ ] Non-matching XHR pass through unchanged
- [ ] Original XHR restored on cleanup

#### Corner Cases
- [ ] XHR with `responseType = 'blob'` or `'arraybuffer'` → handle non-text responses
- [ ] XHR `abort()` called → respect it
- [ ] XHR with upload progress events → fire for real requests, skip for mocked
- [ ] Synchronous XHR (`async = false` in `.open()`) → mock synchronously

#### Technical Notes
- Override `XMLHttpRequest.prototype.open` to capture method + url
- Override `XMLHttpRequest.prototype.send` to capture body and evaluate rules
- If mocked: set response properties, fire readyState changes (1→2→3→4), fire `load` event
- Preserve all other XHR methods and properties

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-008: WebSocket interceptor

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-005

#### Requirements
- FR-003: Intercept WebSocket connections on selected tabs
- Override `window.WebSocket` in MAIN world
- Match by WebSocket URL
- Support: mock onConnect message, mock response to specific incoming messages

#### Acceptance Criteria
- [ ] `new WebSocket(url)` is intercepted when rules match the URL
- [ ] On connect: mock sends configured message via `onmessage` event
- [ ] When client sends message matching a rule → mock responds with configured message after delay
- [ ] Non-matching WebSocket URLs → real connection established
- [ ] `onopen`, `onmessage`, `onclose`, `onerror` events work correctly
- [ ] `ws.send()`, `ws.close()` work for both mocked and real connections

#### Corner Cases
- [ ] WebSocket in MAIN world but WS server doesn't exist → mock should still work (no real connection)
- [ ] Binary messages (Blob/ArrayBuffer) → pass through or mock
- [ ] WebSocket reconnection logic in page → mock handles repeated `new WebSocket()`
- [ ] `ws.close()` on mocked connection → fire `onclose` event

#### Technical Notes
- Create mock WebSocket class that extends/mimics WebSocket API
- For mocked connections: no real socket opened, all events simulated
- For real connections: proxy through original WebSocket
- Message matching: JSON.parse incoming message, match against rule pattern

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-009: GraphQL request detection and operation matching

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-006, TICKET-007

#### Requirements
- FR-004, FR-012 (US-012): Detect GraphQL requests and match by operation name
- Works over both fetch and XHR interceptors
- Parse request body to extract `operationName` and `query`

#### Acceptance Criteria
- [ ] POST requests with `{"query": "..."}` body detected as GraphQL
- [ ] `operationName` extracted from body or parsed from query string
- [ ] Mock rules with `graphqlOperation` field match by operation name
- [ ] Multiple operations in one request (batched) → match first matching operation
- [ ] Non-GraphQL POST requests not affected

#### Corner Cases
- [ ] GraphQL over GET (query in URL params) → detect and match
- [ ] Batched GraphQL (array of operations) → match any in batch
- [ ] Persisted queries (hash instead of query string) → match by operationName only
- [ ] Malformed GraphQL body → skip, treat as regular request

#### Technical Notes
- Detection: body contains `query` field with GraphQL syntax
- Parse `operationName` from body, or extract from `query` via regex: `(query|mutation|subscription)\s+(\w+)`
- Add to rule-matcher: if `rule.graphqlOperation` is set, compare with extracted operation name

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-010: URL pattern matching engine

**Labels:** `frontend`
**Agent:** @react-developer

#### Requirements
- FR-010, FR-014 (US-014): URL pattern matching with exact, wildcard, regex
- Shared between injected script and UI (validation)

#### Acceptance Criteria
- [ ] Exact match: `https://api.example.com/users` matches only that URL
- [ ] Wildcard: `**/api/users` matches any origin, `/api/users/**` matches any suffix
- [ ] Wildcard: `*` matches single path segment, `**` matches any number of segments
- [ ] Regex: `/api\/users\/\d+/` matches with regex
- [ ] Query parameters: option to include or ignore query string in matching
- [ ] Partial JSON body match: `{"email": "*"}` matches any body with `email` field

#### Corner Cases
- [ ] URL with special characters → proper escaping
- [ ] Invalid regex → caught, returns false, no crash
- [ ] Empty URL pattern → matches nothing
- [ ] URL with hash fragment → ignored in matching
- [ ] Body match with nested objects → deep partial match
- [ ] Body match with arrays → array element match

#### Technical Notes
- `url-matcher.ts` in `src/shared/`
- Wildcard: convert to regex internally (`*` → `[^/]+`, `**` → `.*`)
- Body match: recursive partial match function
- Export `matchUrl(url, pattern, type)` and `matchBody(body, pattern)`
- Must be fast: O(1) for exact, O(n) regex/wildcard where n = pattern length

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 3: Mock Rules CRUD

### TICKET-011: Rule storage — CRUD operations

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-004

#### Requirements
- FR-010–FR-014: Create, read, update, delete mock rules
- Rules persisted in chrome.storage.local
- Rules have priority order (user-defined)
- Rules can be enabled/disabled individually

#### Acceptance Criteria
- [ ] `createRule(rule)` adds rule to storage and returns it with generated ID
- [ ] `updateRule(id, changes)` updates rule in storage
- [ ] `deleteRule(id)` removes rule from storage
- [ ] `getRules()` returns all rules sorted by priority
- [ ] `toggleRule(id)` flips enabled state
- [ ] `reorderRules(orderedIds)` updates priority for all rules
- [ ] Storage changes trigger notification to active content scripts

#### Corner Cases
- [ ] Create rule with duplicate URL+method → allowed (warn in UI)
- [ ] Delete rule that's referenced by a collection → remove from collection too
- [ ] Reorder when some rules are in collections → maintain collection grouping

#### Technical Notes
- Rules stored as array in `chrome.storage.local` under key `rules`
- On any change: broadcast updated rules to all intercepted tabs
- Use optimistic updates in UI + confirm from background SW

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-012: Rules list UI

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-003, TICKET-011

#### Requirements
- US-002, US-006: View all rules, toggle on/off, filter, sort

#### Design
- Figma ref: design-spec.md → "Screen 2a: Rules List"

#### Acceptance Criteria
- [ ] Rules displayed as cards with: method badge, URL, status code, delay, collection name
- [ ] Toggle switch enables/disables individual rule
- [ ] Filter by URL text and HTTP method
- [ ] Sort by priority (default), name, created date
- [ ] Empty state: "No mock rules yet" + CTA buttons
- [ ] Loading state: skeleton cards
- [ ] "New Rule" button navigates to rule editor

#### Corner Cases
- [ ] 100+ rules → virtual scrolling
- [ ] Very long URL → truncate with ellipsis, tooltip on hover
- [ ] Filter with no results → "No rules match" message
- [ ] Rule updated externally (another tab) → list refreshes via storage listener

#### Technical Notes
- Page: `src/sidepanel/pages/RulesPage.tsx`
- Component: `src/sidepanel/components/RuleCard.tsx`
- Use Zustand store with chrome.storage sync
- Method badge colors: GET=green, POST=blue, PUT=orange, DELETE=red, PATCH=purple

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-013: Rule editor UI — HTTP rules

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-003, TICKET-010, TICKET-011

#### Requirements
- US-002, US-003, US-004, US-005: Create/edit mock rule with all matching and response options

#### Design
- Figma ref: design-spec.md → "Screen 2b: Rule Editor"

#### Acceptance Criteria
- [ ] URL pattern input with match type selector (exact/wildcard/regex)
- [ ] HTTP method dropdown
- [ ] Request body match editor (optional JSON)
- [ ] GraphQL operation name field (shown when URL looks like GraphQL endpoint)
- [ ] Response type selector: JSON / Raw / Multipart
- [ ] JSON body editor with syntax highlighting (CodeMirror)
- [ ] Status code picker with common codes (200, 201, 400, 401, 403, 404, 500)
- [ ] Response headers key-value editor (add/remove pairs)
- [ ] Delay input (milliseconds)
- [ ] Collection selector dropdown
- [ ] Size indicator badge (green/yellow/orange/red) updates in real-time
- [ ] Save and Cancel buttons
- [ ] Form validation: URL required, status code required, JSON must be valid

#### Corner Cases
- [ ] Invalid JSON in body → red border, error message, save disabled
- [ ] Invalid regex in URL → validation error shown in real-time
- [ ] Very large response body (>1MB) → red size badge + warning
- [ ] Edit mode: all fields pre-populated
- [ ] From recording: fields pre-filled, title says "Save Recorded Response"
- [ ] From log entry: fields pre-filled, title says "Create from Log Entry"

#### Technical Notes
- Page: `src/sidepanel/pages/RuleEditorPage.tsx`
- Components: `RuleEditor.tsx`, `JsonEditor.tsx`, `KeyValueEditor.tsx`, `StatusCodePicker.tsx`, `MethodPicker.tsx`, `URLPatternInput.tsx`, `SizeIndicator.tsx`
- CodeMirror 6 with `@codemirror/lang-json` for JSON editing
- `size-analyzer.ts`: categorize by byte size → excellent/good/acceptable/poor
- Route params: `/rules/new`, `/rules/:id/edit`

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-014: WebSocket rule editor UI

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-003, TICKET-008, TICKET-011

#### Requirements
- US-011: Create/edit WebSocket mock rules

#### Design
- Figma ref: design-spec.md → "Screen 2c: WebSocket Rule Editor"

#### Acceptance Criteria
- [ ] WebSocket URL input
- [ ] "On Connect" message editor
- [ ] Message rules list: match pattern → response message → delay
- [ ] Add/remove message rules
- [ ] Save and Cancel

#### Corner Cases
- [ ] Empty message rules → only on-connect message sent
- [ ] Invalid JSON in messages → validation error

#### Technical Notes
- Component: `WebSocketRuleEditor.tsx`
- Reuses JsonEditor, KeyValueEditor components
- Route: `/rules/new?type=websocket`, `/rules/:id/edit` (auto-detects type)

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-015: Rule drag-and-drop reordering

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-012

#### Requirements
- FR-013, FR-033: Drag-and-drop to reorder rules and move between collections

#### Acceptance Criteria
- [ ] Drag handle on each rule card
- [ ] Drag to reorder within same collection
- [ ] Drag to move between collections
- [ ] Priority numbers updated after reorder
- [ ] Drop zones highlighted during drag
- [ ] Touch support for drag-and-drop

#### Corner Cases
- [ ] Drag to nested collection → expand on hover
- [ ] Drag outside of list → cancel drag
- [ ] Reorder syncs to storage immediately

#### Technical Notes
- Use `@dnd-kit/core` + `@dnd-kit/sortable`
- On drop: call `reorderRules(newOrder)` from rule storage

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 4: Popup

### TICKET-016: Popup — tab list with interception toggles

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-003, TICKET-004, TICKET-005

#### Requirements
- US-001, FR-005, FR-006, FR-007: Show all tabs, toggle interception per tab

#### Design
- Figma ref: design-spec.md → "Screen 1: Popup"

#### Acceptance Criteria
- [ ] On popup open: query all Chrome tabs, display list with favicon + title + URL
- [ ] Toggle switch per tab enables/disables interception
- [ ] Active tabs count shown
- [ ] Quick stats: active rules count, recorded count
- [ ] Action buttons: Open Editor, Record, Request Log, Account
- [ ] "Open Editor" opens side panel
- [ ] Theme respects dark/light mode setting

#### Corner Cases
- [ ] No tabs → "No tabs found"
- [ ] chrome:// tabs → hidden from list
- [ ] 20+ tabs → scrollable list
- [ ] Tab URL very long → truncate with ellipsis
- [ ] Tab closed while popup open → remove from list
- [ ] First install → welcome message + "Get started" link
- [ ] Offline (no backend) → Account button hidden or shows "Local only"

#### Technical Notes
- Entry: `src/popup/Popup.tsx`
- Use `chrome.tabs.query({})` to get all tabs
- Filter out `chrome://`, `chrome-extension://`, `edge://` URLs
- Toggle calls background SW to inject/remove scripts
- Width: 400px fixed, height: auto (max 500px)

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 5: Collections

### TICKET-017: Collection tree — CRUD and nesting

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-003, TICKET-011

#### Requirements
- FR-030, FR-031, FR-032, US-008: Create/edit/delete collections, nested groups, toggle all

#### Design
- Figma ref: design-spec.md → "Screen 2d: Collections"

#### Acceptance Criteria
- [ ] Create named collection
- [ ] Rename collection
- [ ] Delete collection (with confirmation if contains rules)
- [ ] Nest collections up to 2 levels
- [ ] Expand/collapse collection in tree view
- [ ] Toggle enables/disables all rules in collection (and nested)
- [ ] Show rule count per collection
- [ ] Empty state message

#### Corner Cases
- [ ] Delete parent collection → move children to root or delete cascade (confirm dialog)
- [ ] Collection with 0 rules → still shown
- [ ] Very long collection name → truncate

#### Technical Notes
- Page: `src/sidepanel/pages/CollectionsPage.tsx`
- Component: `CollectionTree.tsx` — recursive tree component
- Collections stored in `chrome.storage.local` under key `collections`
- Tree rendered with indentation, expand/collapse icons

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-018: Import/Export mock collections

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-017

#### Requirements
- FR-040, FR-041, FR-042, US-009, US-010: Export/import collections as JSON

#### Acceptance Criteria
- [ ] Export selected collections (or all) to .json file download
- [ ] Import from .json file via file picker
- [ ] Export format includes collection structure + all rules within
- [ ] Import detects conflicts (same collection name/rule ID)
- [ ] Conflict resolution dialog: Merge / Replace / Skip per collection
- [ ] Invalid JSON file → error message
- [ ] Success notification after import/export

#### Corner Cases
- [ ] Import file with unknown fields → ignore extra fields, no crash
- [ ] Import file with missing required fields → validation error
- [ ] Export empty collection → valid JSON with empty rules array
- [ ] Very large import file (10MB+) → handle without UI freeze (async parsing)

#### Technical Notes
- Components: `ImportExportDialog.tsx`, `ConflictResolver.tsx`
- Export: `JSON.stringify` → `Blob` → `URL.createObjectURL` → download link
- Import: `FileReader` → `JSON.parse` → validate schema → conflict check → merge
- Schema version field in export for forward compatibility

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 6: Request Log

### TICKET-019: Request log capture engine

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-005, TICKET-006, TICKET-007

#### Requirements
- FR-050, FR-051: Capture all requests from intercepted tabs in real-time

#### Acceptance Criteria
- [ ] All fetch/XHR requests from intercepted tabs captured with: timestamp, method, URL, request headers, request body, response status, response headers, response body, duration, mocked flag
- [ ] Log stored as circular buffer in chrome.storage.local (max 1000 entries)
- [ ] Mocked requests marked with `mocked: true` and `matchedRuleId`
- [ ] Log entries sent to side panel in real-time via messaging

#### Corner Cases
- [ ] Very large response body → truncate in log (store first 100KB)
- [ ] Binary response → store as "[Binary data, X bytes]"
- [ ] 1000+ entries → oldest entries evicted
- [ ] Tab closed → log entries remain, marked with tab info
- [ ] Service worker restarts → log restored from storage

#### Technical Notes
- Injected script sends request data to content script → background SW
- Background SW stores in circular buffer, broadcasts to side panel
- Buffer implemented as array with index wrapping
- Large bodies: truncate, store size separately

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-020: Request log UI

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-003, TICKET-019

#### Requirements
- FR-050, FR-051, FR-052, US-013: Real-time request log with filtering and "create mock" action

#### Design
- Figma ref: design-spec.md → "Screen 2e: Request Log" + "Log Entry Detail"

#### Acceptance Criteria
- [ ] Log entries displayed with: timestamp, method badge, URL, status, mocked/real badge, duration
- [ ] Color coding: green = mocked, blue = real, red = error status
- [ ] Filter by URL and method
- [ ] Toggle: show mocked / show real
- [ ] Pause/Resume button stops/starts new entries appearing
- [ ] Clear button empties log (with confirmation)
- [ ] Click entry → expand to show full detail (headers, body)
- [ ] "Create Mock" button on each entry → opens rule editor pre-filled
- [ ] "Copy cURL" button on expanded entry
- [ ] Virtual scrolling for large logs

#### Corner Cases
- [ ] New entries while scrolled down → "X new entries" badge at top
- [ ] Log empty → "No requests captured" message
- [ ] Filter with no results → "No requests match"
- [ ] Paused state → entries still captured but not shown until resume

#### Technical Notes
- Page: `src/sidepanel/pages/RequestLogPage.tsx`
- Components: `RequestLogEntry.tsx`, `LogEntryDetail.tsx`
- Use `react-window` or similar for virtual scrolling
- Real-time updates via `chrome.runtime.onMessage` listener
- cURL generation: format method, URL, headers, body as curl command

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 7: Recording

### TICKET-021: Recording mode — capture and save real responses

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-005, TICKET-019, TICKET-011

#### Requirements
- FR-020, FR-021, FR-022, US-007: Record real API responses and save as mocks

#### Design
- Figma ref: design-spec.md → "Screen 2f: Recording Mode"

#### Acceptance Criteria
- [ ] "Start Recording" button in side panel → selects active tab, starts capture
- [ ] Popup shows red recording indicator
- [ ] All real responses from recording tab captured with full data
- [ ] "Stop Recording" → show list of captured responses with checkboxes
- [ ] User can select which responses to save as mocks
- [ ] User can choose target collection
- [ ] "Save Selected as Mocks" creates rules pre-filled with real response data
- [ ] User can edit each captured response before saving
- [ ] "Discard" clears captured responses

#### Corner Cases
- [ ] Recording tab closed → auto-stop recording, show captured so far
- [ ] Recording tab navigates → continue recording on new page
- [ ] No responses captured → "No responses recorded" message
- [ ] Filter noise (favicon, analytics, etc.) → option to auto-exclude common patterns

#### Technical Notes
- Recording state managed in background SW
- Injected script captures full response (clone before consuming)
- Captured responses buffered in SW memory (not storage) until save/discard
- On save: convert to MockRule objects, add to storage

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 8: Premium — Auth & Account

### TICKET-022: Firebase Auth setup — email + OAuth

**Labels:** `frontend`
**Agent:** @react-developer

#### Requirements
- FR-060: Register/login via Firebase Auth (email/password, Google, GitHub OAuth)

#### Acceptance Criteria
- [ ] Firebase initialized in background SW
- [ ] Email/password registration with email verification
- [ ] Email/password login
- [ ] Google OAuth login via `chrome.identity.launchWebAuthFlow`
- [ ] GitHub OAuth login via `chrome.identity.launchWebAuthFlow`
- [ ] Auth state persisted across SW restarts
- [ ] Logout clears auth state
- [ ] Auth token available for Firestore operations

#### Corner Cases
- [ ] OAuth popup blocked → fallback or error message
- [ ] Network error during auth → "Check your connection" message
- [ ] Token expired → auto-refresh via Firebase SDK
- [ ] User deletes account → cleanup local data

#### Technical Notes
- Firebase SDK loaded in background SW only
- Use `chrome.identity` for OAuth flow (not Firebase popup which doesn't work in extensions)
- Store Firebase user in `chrome.storage.session` (ephemeral)
- Create user doc in Firestore on first registration

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-023: Auth UI — Login, Register, Account page

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-003, TICKET-022

#### Requirements
- US-020: Registration UI, login UI, account page with plan info

#### Design
- Figma ref: design-spec.md → "Login/Register", "Account" screens

#### Acceptance Criteria
- [ ] Login form: email + password + "Login" button
- [ ] Register form: email + password + "Register" button
- [ ] OAuth buttons: "Continue with Google", "Continue with GitHub"
- [ ] Note: "Free features work without an account"
- [ ] Account page: email, plan, storage usage bar, logout button
- [ ] Storage bar shows used/quota with percentage
- [ ] "Upgrade" link navigates to pricing page

#### Corner Cases
- [ ] Weak password → validation error ("Min 8 characters")
- [ ] Email already registered → error message
- [ ] Login failed → "Invalid email or password"
- [ ] Not logged in → show login form, hide account features

#### Technical Notes
- Pages: `AccountPage.tsx`
- Component: `AuthForm.tsx`, `StorageBar.tsx`
- Auth state from Zustand store, synced with background SW

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 9: Premium — Teams & Cloud Sync

### TICKET-024: Team management — create, invite, roles

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-022

#### Requirements
- FR-061, FR-062, FR-065, US-022: Create team, invite members, manage roles

#### Acceptance Criteria
- [ ] Create team with name
- [ ] Invite member by email (creates Firestore invite doc)
- [ ] Accept/decline invite (invitee sees pending invites)
- [ ] Team member list with roles (Owner, Admin, Member)
- [ ] Owner/Admin can change member roles
- [ ] Owner/Admin can remove members
- [ ] Owner can delete team

#### Corner Cases
- [ ] Invite non-registered email → invite waits, shown on registration
- [ ] Remove last admin → warn, require at least one admin
- [ ] Owner leaves team → must transfer ownership first
- [ ] Team storage quota exceeded → warn, block uploads

#### Technical Notes
- Page: `TeamPage.tsx`
- Component: `TeamMemberList.tsx`
- Firestore: create doc in `teams/`, add member subdocs, create invite doc
- Cloud Function for sending invite email (optional, can start with in-app only)

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-025: Cloud sync — push/pull collections

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-017, TICKET-024

#### Requirements
- FR-063, FR-064, US-021, US-023: Push local collections to cloud, pull team collections

#### Acceptance Criteria
- [ ] "Push to Cloud" uploads selected collections to team's Firestore
- [ ] "Pull from Cloud" downloads team collections to local storage
- [ ] Conflict detection: if local and cloud versions differ
- [ ] Conflict resolution: merge / replace local / replace cloud / skip
- [ ] Version number incremented on each push
- [ ] "Last sync" timestamp shown

#### Corner Cases
- [ ] Push while offline → queue, sync when online
- [ ] Pull with local changes → warn about overwrite
- [ ] Large collection (>1MB) → progress indicator
- [ ] Concurrent push from two members → last write wins + version conflict on next pull

#### Technical Notes
- Sync logic in background SW
- Compare local `updatedAt` vs cloud `updatedAt` for conflict detection
- On push: write to `teams/{teamId}/collections/{id}`, create version snapshot
- On pull: read from Firestore, merge with local, save to chrome.storage.local

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-026: Version history — view and restore

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-025

#### Requirements
- FR-070, FR-071, FR-072: View collection version history, restore previous versions

#### Design
- Figma ref: design-spec.md → "Version History" screen

#### Acceptance Criteria
- [ ] Version history list: version number, date, author, message
- [ ] Click version to preview its contents
- [ ] "Restore" button restores collection to selected version
- [ ] Restore creates new version (doesn't delete history)

#### Corner Cases
- [ ] 100+ versions → paginated list
- [ ] Restore while team member is editing → version conflict on their next push
- [ ] Version with deleted rules → restore brings them back

#### Technical Notes
- Page: `VersionHistoryPage.tsx`
- Component: `VersionHistoryList.tsx`
- Read from `teams/{teamId}/collections/{id}/versions/` ordered by `createdAt` desc
- Restore: copy version data to collection doc, increment version, create new version entry

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 10: Premium — Billing

### TICKET-027: Stripe integration — subscriptions via Cloud Functions

**Labels:** `frontend`, `backend`
**Agent:** @react-developer

#### Requirements
- Stripe Checkout for subscription payments
- Cloud Functions for Stripe webhooks

#### Acceptance Criteria
- [ ] "Upgrade" button creates Stripe Checkout Session (via Cloud Function)
- [ ] User redirected to Stripe Checkout page
- [ ] On successful payment: Cloud Function receives webhook, updates Firestore billing doc
- [ ] User plan updated in Firestore → extension reads new plan
- [ ] Cancel subscription: user manages via Stripe Customer Portal
- [ ] Downgrade: features restricted but data preserved

#### Corner Cases
- [ ] Payment fails → user stays on free, show error
- [ ] Webhook delayed → poll Firestore for plan change
- [ ] Subscription expired → revert to free tier features
- [ ] User has team plan but downgrades → team features disabled, data preserved

#### Technical Notes
- Cloud Function: `createCheckoutSession` — creates Stripe session, returns URL
- Cloud Function: `stripeWebhook` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Stripe Customer Portal for subscription management (no custom UI needed)
- Plans: `free`, `premium` ($5/mo), `team` ($8/user/mo)

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-028: Pricing page UI

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-027

#### Requirements
- Show pricing plans comparison, upgrade button

#### Design
- Figma ref: design-spec.md → "Pricing / Upgrade" screen

#### Acceptance Criteria
- [ ] Free vs Premium vs Team plan comparison cards
- [ ] Feature list per plan
- [ ] "Current plan" indicator
- [ ] "Upgrade" button triggers Stripe Checkout
- [ ] "Start Team Plan" button triggers team plan checkout

#### Corner Cases
- [ ] Already premium → show "Manage Subscription" instead of "Upgrade"
- [ ] Offline → show plans but disable upgrade button

#### Technical Notes
- Page: `PricingPage.tsx`
- Component: `PricingCards.tsx`
- Calls background SW → Cloud Function to create Checkout Session

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-029: Storage quota management

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-022, TICKET-025

#### Requirements
- FR-057, FR-058: Enforce cloud storage quotas per plan

#### Acceptance Criteria
- [ ] Track storage usage per user (sum of all cloud collection sizes)
- [ ] Free: 50MB, Premium: 1GB, Team: 5GB shared
- [ ] Warn when reaching 80% quota
- [ ] Block uploads when quota exceeded
- [ ] Show storage bar on account page with used/total

#### Corner Cases
- [ ] User downgrades while over quota → read-only cloud, can delete but not upload
- [ ] Team member uploads large collection → counts against team quota
- [ ] Delete cloud collection → recalculate quota

#### Technical Notes
- Cloud Function: on collection write → recalculate `storageUsedBytes` on user/team doc
- Extension reads quota from user doc, shows in UI
- Client-side pre-check before push: estimate size, warn if over quota

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Milestone 11: Premium — Advanced Features

### TICKET-030: Conditional mock rules

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-013

#### Requirements
- US-025: Match by request headers, auth tokens, cookies

#### Acceptance Criteria
- [ ] Rule editor: optional "Conditions" section
- [ ] Condition types: header match (key=value), cookie match, auth token presence
- [ ] Multiple conditions: AND logic (all must match)
- [ ] Conditions evaluated in injected script alongside URL/method matching

#### Corner Cases
- [ ] Header with multiple values → match any
- [ ] Cookie not accessible (HttpOnly) → note in UI that some cookies can't be read
- [ ] Condition on header that's not sent → condition fails, rule skipped

#### Technical Notes
- Add `conditions` array to MockRule type
- Condition: `{ type: 'header' | 'cookie' | 'auth', key: string, value: string, operator: 'equals' | 'contains' | 'exists' }`
- Evaluated in rule-matcher after URL/method match

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

### TICKET-031: Dynamic response templates

**Labels:** `frontend`
**Agent:** @react-developer
**Depends on:** TICKET-013

#### Requirements
- US-026: Dynamic placeholders in response body

#### Acceptance Criteria
- [ ] Template syntax: `{{timestamp}}`, `{{uuid}}`, `{{randomInt(1,100)}}`, `{{request.body.field}}`
- [ ] Templates evaluated at response time (each request gets unique values)
- [ ] Template errors → return template string as-is (no crash)
- [ ] Documentation/help for available template functions in UI

#### Corner Cases
- [ ] Nested template: `{{request.body.user.name}}` → deep access
- [ ] Request body not JSON → `request.body.*` templates return empty
- [ ] Template in headers → also supported
- [ ] Invalid template syntax → treated as literal text

#### Technical Notes
- Template engine in `src/injected/template-engine.ts`
- Regex scan for `{{...}}`, evaluate each match
- Available functions: `timestamp`, `isoDate`, `uuid`, `randomInt(min,max)`, `randomFloat(min,max)`, `request.url`, `request.method`, `request.body.*`, `request.header.*`

#### TDD Checklist
- [ ] Tests written (PR #__)
- [ ] Implementation written (PR #__)
- [ ] All tests passing

---

## Ticket Summary

| Milestone | Tickets | Focus |
|-----------|---------|-------|
| M0: DevOps Setup | TICKET-001 | Repo, CI/CD, scaffolding |
| M1: Core Shell | TICKET-002, 003, 004 | Types, UI components, storage |
| M2: Interception Engine | TICKET-005, 006, 007, 008, 009, 010 | Core interception logic |
| M3: Mock Rules CRUD | TICKET-011, 012, 013, 014, 015 | Rule management |
| M4: Popup | TICKET-016 | Extension popup |
| M5: Collections | TICKET-017, 018 | Collection management + import/export |
| M6: Request Log | TICKET-019, 020 | Request logging |
| M7: Recording | TICKET-021 | Response recording |
| M8: Auth | TICKET-022, 023 | Firebase Auth + UI |
| M9: Teams & Sync | TICKET-024, 025, 026 | Teams, cloud sync, versions |
| M10: Billing | TICKET-027, 028, 029 | Stripe, pricing, quotas |
| M11: Advanced | TICKET-030, 031 | Conditional rules, templates |

**Total: 31 tickets across 12 milestones**

### Dependency Graph (simplified)

```
M0 → M1 → M2 → M3 → M4
                 ↓
                M5 → M6 → M7
                          ↓
                    M8 → M9 → M10
                               ↓
                              M11
```

### Labels
| Label | Tickets |
|-------|---------|
| `devops` | 001 |
| `frontend` | 002–031 |
| `backend` | 027 (Cloud Functions) |
| `testing` | All (TDD — QA writes tests first) |
| `design` | All (Figma ref in each ticket) |
