# Request Interceptor — Tech Stack

## Extension Frontend

| Technology | Version | Rationale |
|-----------|---------|-----------|
| React | 18+ | Component-based UI, ecosystem |
| TypeScript | 5.x | Type safety, better DX |
| Vite | 5.x | Fast builds, HMR |
| CRXJS Vite Plugin | 2.x | Chrome extension Vite integration (MV3 support, HMR in extension) |
| Tailwind CSS | 3.x | Utility-first styling, design tokens via config |
| React Router | 6.x | Side panel navigation |
| Zustand | 4.x | Lightweight state management (simpler than Redux for extension) |
| CodeMirror 6 | 6.x | JSON editor with syntax highlighting, validation |
| dnd-kit | 6.x | Drag-and-drop for rules reordering |
| uuid | 9.x | Generate unique IDs for rules/collections |

## Firebase

| Service | Usage |
|---------|-------|
| Firebase Auth | Email/password + Google + GitHub OAuth |
| Cloud Firestore | Team collections, user profiles, versions |
| Cloud Storage | Large response bodies backup |
| Cloud Functions (Node.js) | Stripe webhooks, invite emails, quota checks |

## Payments

| Technology | Rationale |
|-----------|-----------|
| Stripe | Payment processing, subscription management, works in Belarus |
| Stripe Checkout | Hosted payment page (PCI compliance, no card data handling) |

## Testing

| Technology | Usage |
|-----------|-------|
| Vitest | Unit tests for rule matching, URL patterns, utilities |
| React Testing Library | Component testing |
| Playwright | E2E testing of extension (Chrome extension support) |
| MSW (Mock Service Worker) | Mocking Firebase calls in tests |

## Build & Tooling

| Technology | Usage |
|-----------|-------|
| ESLint | Linting with strict TypeScript rules |
| Prettier | Code formatting |
| Husky + lint-staged | Pre-commit hooks |
| npm | Package manager |

## Key Architecture Decisions

### ADR-001: Zustand over Redux
**Context:** Need state management for extension popup and side panel.
**Decision:** Use Zustand — it's lighter (~1KB), has simpler API, and works well with chrome.storage sync patterns.
**Consequence:** Less boilerplate, but team must learn Zustand patterns.

### ADR-002: CodeMirror 6 over Monaco
**Context:** Need a JSON editor with syntax highlighting.
**Decision:** CodeMirror 6 — much smaller bundle size (~100KB vs ~2MB for Monaco), sufficient for JSON editing.
**Consequence:** Less feature-rich than Monaco but appropriate for extension size constraints.

### ADR-003: Side Panel over Options Page for main editor
**Context:** Need a persistent editor UI.
**Decision:** Use Chrome Side Panel API — stays open while user browses, no context switching.
**Consequence:** Fixed 320px width constraint. For complex editing, also offer "Open in tab" option (full-width page).

### ADR-004: MAIN world injection for interception
**Context:** Content scripts can't override page's fetch/XHR.
**Decision:** Inject script into MAIN world using `chrome.scripting.executeScript({ world: "MAIN" })`.
**Consequence:** Script shares page context — must be careful about naming conflicts and security.

### ADR-005: Firebase over custom NestJS backend
**Context:** Need auth, database, cloud storage for team features.
**Decision:** Use Firebase — no server to manage, built-in auth with OAuth, real-time sync capability, auto-scaling.
**Consequence:** Vendor lock-in to Google, but significant reduction in backend development/maintenance effort. No NestJS developer needed.

### ADR-006: Stripe Checkout over custom payment form
**Context:** Need subscription payments.
**Decision:** Use Stripe Checkout (hosted) — handles PCI compliance, card validation, 3D Secure.
**Consequence:** Users redirected to Stripe page for payment, but zero liability for card data.
