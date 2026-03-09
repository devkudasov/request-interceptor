# Request Interceptor

A Chrome extension for intercepting HTTP, WebSocket, and GraphQL requests and returning mock responses. Built for developers and QA engineers who need to simulate API behavior during frontend development, testing, and debugging.

## Features

- **HTTP Mocking** -- Match requests by URL pattern (exact, wildcard, regex), HTTP method, and request body. Return custom status codes, headers, and JSON/raw response bodies.
- **WebSocket Mocking** -- Intercept WebSocket connections and define message-level rules with configurable delays and auto-responses on connect.
- **GraphQL Mocking** -- Filter by GraphQL operation name on top of standard URL/method matching for precise control over query and mutation responses.
- **Collections** -- Organize mock rules into named collections. Enable or disable entire collections at once. Nest collections for complex projects.
- **Request Recording** -- Record real API responses from any browser tab and convert them into mock rules with one click.
- **Request Log** -- Monitor all intercepted requests in real time. See which requests were mocked vs. passed through, with timing and status information.
- **Import / Export** -- Share collections as JSON files. Import collections from teammates or across projects.
- **Team Collaboration** -- Create a team, invite members by email, and sync collections to the cloud via Firebase. Push and pull with conflict resolution.
- **Version History** -- Every cloud push creates a version snapshot. Browse history and restore previous versions of any collection.
- **Response Delays** -- Simulate slow networks by adding configurable delays (in milliseconds) to any mock rule.
- **Dark / Light / System Theme** -- Follows system preference or can be set manually.
- **URL & Method Filtering** -- Filter the workspace view by URL substring and HTTP method to find rules quickly.
- **Authentication** -- Sign in with Email/Password, Google, or GitHub. Plan tiers (Free, Pro, Team) with storage quotas.

## Screenshots

<!-- TODO: Add screenshots of the side panel UI -->

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite 5 + CRXJS (Manifest V3) |
| State Management | Zustand |
| Styling | Tailwind CSS 3 |
| Code Editor | CodeMirror 6 (JSON response editing) |
| Drag & Drop | dnd-kit |
| Backend / Auth | Firebase (Auth, Firestore) |
| Testing | Vitest + Testing Library + jsdom |
| Linting | ESLint + Prettier |
| Git Hooks | Husky + lint-staged |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Google Chrome (or any Chromium-based browser)

### Installation

```bash
# Clone the repository
git clone https://github.com/devkudasov/request-interceptor.git
cd request-interceptor/extension

# Install dependencies
npm install
```

### Environment Setup

Copy the environment template and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

Required variables in `.env`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_GITHUB_CLIENT_ID=
VITE_GITHUB_CLIENT_SECRET=
```

Firebase credentials are required for authentication and cloud sync. The extension works offline for local-only mocking without these values.

### Build & Load

```bash
# Production build
npm run build
```

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked** and select the `extension/dist` folder
4. The extension icon appears in the toolbar. Click it, then open the **side panel** for the full UI.

## Development

```bash
# Start dev server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Lint
npm run lint

# Format code
npm run format

# Check formatting without writing
npm run format:check
```

When using `npm run dev`, load the `extension/dist` folder as an unpacked extension. Vite + CRXJS handles hot module replacement for the side panel UI.

## Project Structure

```
extension/
  public/
    manifest.json          # Chrome Manifest V3 configuration
    icons/                 # Extension icons (16, 32, 48, 128px)
  src/
    background/            # Service worker (message handling, storage, Firebase sync)
      index.ts             # Entry point, registers listeners
      message-handler.ts   # Chrome message routing
      storage.ts           # chrome.storage wrapper
      tab-manager.ts       # Active tab tracking
      recorder.ts          # Request recording logic
      logger.ts            # Request logging
      firebase-auth.ts     # Firebase authentication
      firebase-config.ts   # Firebase initialization
      firestore-sync.ts    # Cloud sync (push/pull/conflict resolution)
      firestore-teams.ts   # Team management (CRUD, invites)
      firestore-versions.ts # Version snapshots
    content/
      index.ts             # Content script, injects interceptors into pages
    injected/
      index.ts             # Entry point for page-level injection
      fetch-interceptor.ts # Overrides window.fetch
      xhr-interceptor.ts   # Overrides XMLHttpRequest
      websocket-interceptor.ts # Overrides WebSocket
      rule-matcher.ts      # URL pattern matching logic
    sidepanel/
      SidePanel.tsx        # Root component with routing
      pages/
        WorkspacePage.tsx   # Main workspace: collections, rules, filters
        RuleEditorPage.tsx  # Create/edit mock rules (HTTP, WS, GraphQL)
        RequestLogPage.tsx  # Live request log viewer
        RecordingPage.tsx   # Record & save real responses as rules
        VersionHistoryPage.tsx # Browse and restore cloud versions
      components/
        Navigation.tsx      # Top tab bar (Workspace, Log, Record)
        AccountButton.tsx   # User avatar / login popover
        CollectionGroup.tsx # Recursive collection renderer
        SyncControls.tsx    # Push/pull cloud sync UI
        RuleCard.tsx        # Individual rule display card
        workspace/          # Workspace-specific components
        rule-editor/        # Rule editor form components
    shared/
      types.ts             # TypeScript types (MockRule, Collection, Team, etc.)
      store/               # Zustand stores
      selectors/           # Derived state selectors
      import-export.ts     # JSON import/export logic
      utils/               # Utility functions
    ui/
      common/              # Reusable UI primitives (Button, Input, Select, Toggle, Modal, Badge, Spinner)
      theme/               # Theme provider and design tokens
    popup/                 # Extension popup (minimal, points to side panel)
    globals.css            # Tailwind base styles
```

## Architecture Overview

Request Interceptor is a Manifest V3 Chrome extension with three runtime contexts:

### Side Panel (UI)

The primary interface lives in Chrome's side panel. Built with React and react-router-dom, it provides three main views accessible from the top navigation:

- **Workspace** -- Manage collections and rules, filter by type/URL/method, import/export, and sync with the cloud.
- **Log** -- Real-time feed of intercepted requests with mocked/real status indicators.
- **Record** -- Capture live API responses from any tab and save them as mock rules.

State is managed with Zustand stores that communicate with the background service worker via Chrome messaging.

### Background Service Worker

The service worker (`background/index.ts`) is the central coordinator:

- Persists rules and collections to `chrome.storage.local`
- Handles Firebase authentication flows
- Syncs collections to/from Firestore for team collaboration
- Manages request recording sessions
- Routes messages between the side panel, content scripts, and injected scripts

### Injected Interceptors

When interception is active on a tab, a content script injects code into the page context that overrides:

- `window.fetch` -- Intercepts fetch calls, matches against rules, returns mock responses
- `XMLHttpRequest` -- Intercepts XHR calls with the same matching logic
- `WebSocket` -- Intercepts WebSocket connections and applies message-level rules

The `rule-matcher.ts` module handles URL pattern matching (exact, wildcard, regex) and method filtering to determine which requests should be mocked.

## Contributing

1. Fork the repository
2. Create a feature branch from `develop`
3. Write tests first (TDD approach)
4. Implement the feature
5. Ensure all tests pass (`npm test`) and linting is clean (`npm run lint`)
6. Submit a pull request to `develop`

Please follow the existing code style. The project uses ESLint with strict TypeScript rules and Prettier for formatting. Husky + lint-staged runs checks automatically on commit.

## License

<!-- TODO: Add license -->
