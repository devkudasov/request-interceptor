# Request Interceptor — Requirements Document (PRD)

## 1. Overview

**Request Interceptor** — Chrome-расширение для разработчиков и QA-инженеров, позволяющее перехватывать HTTP-запросы и подменять ответы на лету. Используется для тестирования фронтенда без зависимости от реального бэкенда.

**Target Audience:** Frontend-разработчики, QA-инженеры, fullstack-разработчики.

**Problem:** При тестировании UI часто нужно симулировать различные ответы API (ошибки, задержки, edge-case данные). Существующие решения либо слишком сложные, либо не поддерживают все типы запросов, либо не позволяют работать в команде.

**Monetization:** Freemium-модель — максимально бесплатное ядро, платные фичи для команд и продвинутых сценариев.

---

## 2. User Stories

### Бесплатные (Core)

| ID | User Story | Priority |
|----|-----------|----------|
| US-001 | ~~As a developer, I want to see all open tabs in the popup so that I can choose which sites to intercept~~ **[Removed — single-tab migration]** Replaced by: As a developer, I want to select an active tab from a dropdown in the SidePanel so that I can choose which site to intercept | Must |
| US-002 | As a developer, I want to create a mock rule matching by URL pattern, HTTP method, and request body so that I can substitute specific API responses | Must |
| US-003 | As a developer, I want to set a custom response body (JSON, raw text, multipart) so that I can simulate any API response | Must |
| US-004 | As a developer, I want to set custom status code and headers for the mock response so that I can test error handling | Must |
| US-005 | As a developer, I want to add a delay (ms) to mock responses so that I can test loading states and timeouts | Must |
| US-006 | As a developer, I want to enable/disable individual mock rules with a toggle so that I can quickly switch between real and mocked responses | Must |
| US-007 | ~~As a developer, I want to record real API responses and save them as mock templates so that I can edit and reuse them later~~ **[Removed — recording feature removed, superseded by Logs (FR-050–FR-052)]** | Must |
| US-008 | As a developer, I want to organize mocks into custom groups/collections so that I can manage large sets of rules | Must |
| US-009 | As a developer, I want to export my mock collections to a JSON file so that I can share them or back them up | Must |
| US-010 | As a developer, I want to import mock collections from a JSON file so that I can reuse shared configurations | Must |
| US-011 | As a developer, I want to intercept fetch, XMLHttpRequest, WebSocket, and GraphQL requests so that I can mock any type of network communication | Must |
| US-012 | As a developer, I want to match GraphQL requests by operation name so that I can mock specific queries/mutations | Should |
| US-013 | As a developer, I want to see a log of intercepted/mocked requests in real time so that I can debug what's happening | Should |
| US-014 | As a developer, I want to use URL pattern matching (wildcards, regex) so that I can create flexible rules | Must |

### Платные (Premium)

| ID | User Story | Priority |
|----|-----------|----------|
| US-020 | As a team lead, I want to register an account so that I can access team features | Must |
| US-021 | As a team member, I want to share mock collections with my team in the cloud so that everyone uses the same test data | Must |
| US-022 | As a team lead, I want to create a team workspace and invite members so that we can collaborate on mocks | Must |
| US-023 | As a team member, I want to sync my local mocks with the team cloud so that changes are shared automatically | Should |
| US-024 | As a user, I want to save unlimited mock collections to the cloud so that I don't lose my configurations | Should |
| US-025 | As a developer, I want to create conditional mock rules (e.g., return different responses based on request headers or auth tokens) so that I can test complex scenarios | Could |
| US-026 | As a developer, I want to use dynamic response templates (e.g., insert timestamp, random ID, echo request params) so that I can create realistic mocks | Could |

---

## 3. Functional Requirements

### Перехват запросов

| ID | Requirement |
|----|------------|
| FR-001 | Extension MUST intercept fetch API calls on selected tabs |
| FR-002 | Extension MUST intercept XMLHttpRequest calls on selected tabs |
| FR-003 | Extension MUST intercept WebSocket connections on selected tabs |
| FR-004 | Extension MUST intercept GraphQL requests (over fetch/XHR) and allow matching by operation name |
| FR-005 | ~~Interception MUST be per-tab — user selects which tabs to intercept from the popup~~ **[Removed — single-tab migration]** Replaced by: Extension MUST intercept requests on a single active tab selected via a TabSelector dropdown in the SidePanel |
| FR-006 | ~~Popup MUST display a list of all currently open tabs with their URLs when opened~~ **[Removed — single-tab migration]** Replaced by: SidePanel MUST display a TabSelector dropdown listing all open tabs (excluding chrome:// and extension pages) |
| FR-007 | ~~User MUST be able to enable/disable interception per tab independently~~ **[Removed — single-tab migration]** Replaced by: User MUST be able to switch the active intercepted tab via the TabSelector; only one tab is active at a time |

### Mock Rules

| ID | Requirement |
|----|------------|
| FR-010 | Mock rule MUST support matching by: URL pattern (exact, wildcard, regex), HTTP method (GET, POST, PUT, PATCH, DELETE, etc.), request body (partial JSON match) |
| FR-011 | Mock rule MUST allow setting: response body (JSON editor, raw text, multipart), HTTP status code, response headers (key-value pairs), response delay (milliseconds) |
| FR-012 | Each mock rule MUST have an enable/disable toggle |
| FR-013 | Mock rules MUST be evaluated in priority order (user can reorder) |
| FR-014 | When multiple rules match a request, the first matching enabled rule wins |

### Recording — **[Removed]**

*The Recording feature (FR-020 through FR-022) has been removed as part of the single-tab migration. Its functionality is superseded by the Logs feature (FR-050 through FR-052), which allows creating mock rules from captured log entries.*

| ID | Requirement |
|----|------------|
| ~~FR-020~~ | ~~Extension MUST provide a "Record" mode that captures real API responses~~ **[Removed — superseded by FR-050/FR-052]** |
| ~~FR-021~~ | ~~Recorded responses MUST be saveable as new mock rules with pre-filled URL, method, status, headers, and body~~ **[Removed — superseded by FR-052]** |
| ~~FR-022~~ | ~~User MUST be able to edit recorded responses before saving as a mock~~ **[Removed — superseded by FR-052]** |

### Collections & Organization

| ID | Requirement |
|----|------------|
| FR-030 | User MUST be able to create named groups (collections) for mock rules |
| FR-031 | User MUST be able to nest groups (at least 2 levels) |
| FR-032 | User MUST be able to enable/disable an entire collection at once |
| FR-033 | User MUST be able to drag-and-drop to reorder rules and move between groups |

### Import/Export

| ID | Requirement |
|----|------------|
| FR-040 | User MUST be able to export selected collections or all mocks to a JSON file |
| FR-041 | User MUST be able to import mock collections from a JSON file |
| FR-042 | Import MUST handle conflicts (duplicate rules) — offer merge or replace |

### Request Log

| ID | Requirement |
|----|------------|
| FR-050 | Extension MUST show a real-time log of all requests from intercepted tabs |
| FR-051 | Log entries MUST show: timestamp, method, URL, status (real or mocked), whether it was intercepted |
| FR-052 | User MUST be able to click a log entry and create a mock rule from it |

### Response Size Analysis

| ID | Requirement |
|----|------------|
| FR-055 | Extension MUST show a size indicator for each mock response body |
| FR-056 | Size indicator MUST use color-coded badges: green (< 10KB, "Excellent"), yellow (< 100KB, "Good"), orange (< 1MB, "Acceptable"), red (>= 1MB, "Poor") |
| FR-057 | Cloud storage MUST enforce per-user storage quotas based on subscription tier |
| FR-058 | Extension MUST warn user when a mock response body is large before cloud upload |

### Auth & Teams (Premium)

| ID | Requirement |
|----|------------|
| FR-060 | User MUST be able to register/login via Firebase Auth (email + password, OAuth: Google, GitHub) |
| FR-061 | Authenticated user MUST be able to create a team workspace |
| FR-062 | Team owner MUST be able to invite members by email |
| FR-063 | Team members MUST be able to push/pull mock collections to/from the team cloud |
| FR-064 | Cloud sync MUST handle conflict resolution (last-write-wins or manual merge) |
| FR-065 | Team MUST have roles: Owner, Admin, Member |

### Version History (Premium)

| ID | Requirement |
|----|------------|
| FR-070 | Cloud-synced collections MUST maintain version history |
| FR-071 | User MUST be able to view previous versions of a collection |
| FR-072 | User MUST be able to restore a collection to a previous version |

---

## 4. Non-Functional Requirements

| ID | Requirement |
|----|------------|
| NFR-001 | ~~Extension popup MUST open in < 300ms~~ **[Updated]** Extension SidePanel MUST open in < 300ms |
| NFR-002 | Request interception MUST add < 5ms overhead per request |
| NFR-003 | Extension MUST work with Chrome 120+ |
| NFR-004 | All user data stored locally MUST use chrome.storage.local (no size limit concern vs sync) |
| NFR-005 | Extension MUST not break page functionality when interception is disabled |
| NFR-006 | Extension MUST handle pages with CSP restrictions |
| NFR-007 | Firebase operations MUST complete in < 500ms for CRUD operations |
| NFR-008 | Architecture MUST scale automatically via Firebase infrastructure |
| NFR-009 | All team data MUST be encrypted in transit (HTTPS) and at rest (Firebase default) |
| NFR-010 | Extension MUST gracefully degrade if backend is unavailable (local-only mode) |

---

## 5. Chrome Extension Specifics

### Required Permissions
- `tabs` — list open tabs and their URLs
- `activeTab` — access current tab
- `scripting` — inject content scripts for request interception
- `storage` — store mock rules and settings locally
- `webRequest` — observe network requests for the log
- `host_permissions: <all_urls>` — intercept requests on any site

### Architecture Components
- **Side Panel** — primary UI surface; includes TabSelector dropdown for active tab selection, full mock rule editor, collections, request log, settings. Opens when the extension toolbar icon is clicked (no popup).
- **Content Script** — injected into the single active tab, overrides fetch/XHR/WebSocket
- **Background Service Worker** — coordination, manages the single active tab, webRequest listener for logging
- **Options Page** — account settings, team management

### Storage
- `chrome.storage.local` — mock rules, collections, settings, recorded responses
- Firebase Firestore — team collections, user accounts, subscriptions

---

## 6. Backend Requirements (Firebase)

No custom backend server. All server-side functionality is provided by **Firebase**:

### Firebase Services
- **Firebase Auth** — email/password + OAuth (Google, GitHub)
- **Cloud Firestore** — team collections, user profiles, subscription data, collection version history
- **Cloud Storage** — large mock response bodies (if exceeding Firestore document limits)
- **Cloud Functions** — Stripe webhook handlers, team invite emails, storage quota enforcement
- **Firebase Security Rules** — access control for team data

### Data Model (high-level, Architect will detail)
- `users/{uid}` — profile, subscription tier, storage usage
- `teams/{teamId}` — name, owner, settings
- `teams/{teamId}/members/{uid}` — role (Owner, Admin, Member)
- `teams/{teamId}/collections/{collectionId}` — shared mock collections
- `teams/{teamId}/collections/{collectionId}/versions/{versionId}` — version history
- `billing/{uid}` — Stripe customer ID, subscription status

### Billing
- **Stripe** — payment processing, subscription management
- Stripe webhooks handled via Cloud Functions

---

## 7. Monetization Model

### Free Tier
- Unlimited local mock rules and collections
- All request types (fetch, XHR, WebSocket, GraphQL)
- ~~Recording real responses~~ Create mock rules from log entries
- Import/export to JSON file
- Full request log
- URL matching (wildcard, regex)
- Response delay configuration
- Custom status codes, headers, body types

### Premium Tier (ориентир $5–8/month per user)
- Account registration and cloud storage
- Team workspaces (create, invite, roles)
- Cloud sync of mock collections with version history
- Shared team collections
- Conditional mock rules (match by headers, auth tokens)
- Dynamic response templates (timestamps, random IDs, echo params)
- Extended cloud storage quota (free tier limited, premium — generous)
- Priority support

### Cloud Storage Quotas
- **Free (registered):** 50MB cloud storage
- **Premium:** 1GB cloud storage
- **Team Premium:** 5GB shared team storage
- Overage: warn user, block uploads until cleaned up or upgraded

### Principle
Расширение должно быть **полностью функциональным** для индивидуального разработчика бесплатно. Платить имеет смысл только за командную работу и продвинутую автоматизацию моков.

---

## 8. Out of Scope

- Mobile browser support
- Firefox/Safari/Edge support (Chrome only for MVP)
- Proxy-based interception (no external proxy server)
- API performance testing / load testing
- Mock server (extension works client-side only, no standalone server)
- HAR file import (can be added later)
- CI/CD integration (running mocks in headless Chrome)

---

## 9. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| OQ-1 | Какой OAuth-провайдер(ы) поддерживать? | Resolved | Google + GitHub (оба) |
| OQ-2 | Нужна ли free trial для Premium, или сразу freemium? | Resolved | Freemium (без trial, без ограничений по времени) |
| OQ-3 | Максимальный размер одного mock response body? | Resolved | Без жёсткого лимита, но с size analysis (green/yellow/orange/red) + storage quotas per tier |
| OQ-4 | Нужна ли версионность mock collections? | Resolved | Да, version history для cloud collections (Premium) |
| OQ-5 | Платёжная система? | Resolved | Stripe (работает в РБ) |
| OQ-6 | Нужна ли поддержка dark/light mode? | Resolved | Да, делаем оба режима |
