# UX Improvements -- Technical Architecture

**Document ID:** ARCH-UX-001
**Date:** 2026-03-08
**Author:** System Architect Agent
**Status:** Draft
**Requirements:** PRD-UX-001

---

## 1. Technical Decisions

### OQ-001: GraphQL as RequestType

**Decision: Keep `graphqlOperation` field filtering. No schema migration.**

Rationale:
- GraphQL requests are HTTP requests with an extra filter dimension. They use the same `statusCode`, `responseHeaders`, `responseBody`, and `method` fields as HTTP rules.
- Adding `'graphql'` to `RequestType` would require a data migration for all existing rules where `graphqlOperation` is set, a backend migration for cloud-synced collections, and version snapshot rewriting.
- The filtering approach (`requestType === 'http'` and `graphqlOperation` is truthy) is already how the UI categorizes rules. Making this explicit in a selector function is sufficient.
- If a future protocol truly differs (gRPC, SSE), it gets its own `RequestType` value because it needs different fields. GraphQL does not.

### OQ-002: Drag-and-Drop

**Decision: Deferred to a later iteration.** The workspace will support moving rules between collections via context menu or rule editor only. No drag-and-drop in the initial implementation.

### Routing Strategy

The current app uses `MemoryRouter`. We keep `MemoryRouter` and encode the active request type tab as a query parameter (`?type=http|websocket|graphql`) when navigating to the rule editor, so the editor knows the default type context. The workspace replaces `/` and absorbs `/collections` and `/team`. The `/account` route is removed entirely.

### Collapse State Persistence

Collection expand/collapse state will use `chrome.storage.session` keyed by collection ID. This survives side panel close/reopen within a browser session but resets on browser restart, which is the expected behavior.

---

## 2. Component Breakdown

### 2.1 UX-001: Unified Workspace

#### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `WorkspacePage` | `pages/WorkspacePage.tsx` | Replaces `RulesPage`. Orchestrates team header, toolbar, collection tree, and ungrouped rules. |
| `CollectionGroup` | `components/CollectionGroup.tsx` | Expandable/collapsible collection node. Renders collection header (name, toggle, badge, chevron) and nested `RuleCard` items. Supports visual indentation for child collections via `depth` prop. |
| `CollectionContextMenu` | `components/CollectionContextMenu.tsx` | "..." button menu on collections: Delete, Export, Version History. |
| `WorkspaceToolbar` | `components/WorkspaceToolbar.tsx` | Search input, method filter dropdown, "+ New Rule", "+ New Collection", Import/Export buttons. |
| `TeamHeader` | `components/TeamHeader.tsx` | Conditional banner showing team name + member count badge. Click to expand inline `TeamPanel`. |
| `TeamPanel` | `components/TeamPanel.tsx` | Inline expandable panel with member list, invite form, pending invites. Extracts logic from current `TeamPage`. |
| `WorkspaceEmptyState` | `components/WorkspaceEmptyState.tsx` | Empty state with "Create Rule" and "Create Collection" CTAs. |

#### Modified Components

| Component | Changes |
|-----------|---------|
| `Navigation.tsx` | Remove "Rules", "Collections", "Team", "Account" tabs. Add "Workspace" tab. Remaining tabs: Workspace, Log, Record. |
| `SidePanel.tsx` | Remove routes for `/collections`, `/team`, `/account`. Replace `/` route element with `WorkspacePage`. Add bottom bar for account avatar. |
| `RuleCard.tsx` | Remove `collectionName` display (rules are now nested inside collection groups, so the collection name is implicit from context). Keep all other functionality. |
| `SyncControls.tsx` | No logic changes. Relocated into `WorkspacePage` below the toolbar. |

#### Deleted Pages

| Component | Reason |
|-----------|--------|
| `CollectionsPage.tsx` | Merged into `WorkspacePage`. Import/export logic moves to `WorkspaceToolbar`. Create collection modal stays as-is but is triggered from `WorkspaceToolbar`. |
| `TeamPage.tsx` | Merged into `TeamHeader` + `TeamPanel`. |

#### Data Flow

```
WorkspacePage
  |
  |-- useRulesStore().rules ---------> filter by urlFilter, methodFilter, activeTypeTab
  |-- useCollectionsStore().collections --> build tree (rootCollections + children)
  |-- useAuthStore().user -----------> conditional rendering of TeamHeader
  |-- useTeamsStore().team -----------> TeamHeader data
  |
  +-- WorkspaceToolbar
  |     |-- urlFilter (local state, lifted to WorkspacePage)
  |     |-- methodFilter (local state, lifted to WorkspacePage)
  |     |-- "+ New Rule" --> navigate('/rules/new?type=<activeTab>')
  |     |-- "+ New Collection" --> open modal (local state)
  |     |-- Import/Export --> reuse logic from CollectionsPage
  |
  +-- TeamHeader (conditional: user && team)
  |     |-- click --> toggle TeamPanel visibility (local state)
  |     +-- TeamPanel
  |           |-- useTeamsStore() for invite/remove/accept/decline
  |
  +-- SyncControls
  |
  +-- CollectionGroup[] (for each root collection)
  |     |-- expanded state <--> chrome.storage.session
  |     |-- rules = filteredRules.filter(r => r.collectionId === collection.id)
  |     |-- CollectionGroup[] (nested children, depth+1)
  |     |-- RuleCard[] (when expanded)
  |     +-- CollectionContextMenu
  |
  +-- "Ungrouped" section
        |-- rules = filteredRules.filter(r => r.collectionId === null)
        +-- RuleCard[]
```

### 2.2 UX-002: Account as Bottom Icon

#### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `AccountAvatar` | `components/AccountAvatar.tsx` | 32x32 circular avatar fixed to bottom-left. Shows user photo, initials, or generic icon. Handles click to toggle popover. Shows loading pulse ring during `fetchUser`. |
| `AccountPopover` | `components/AccountPopover.tsx` | Popover containing all current `AccountPage` content: profile header, plan badge, storage bar, upgrade button, logout. When logged out, shows `AuthForm`. Dismissible via outside click or Escape. |

#### Modified Components

| Component | Changes |
|-----------|---------|
| `SidePanel.tsx` | Layout changes from `[Navigation][main]` to `[Navigation][main][BottomBar]`. The bottom bar is a fixed-height strip containing `AccountAvatar`. The `main` area adjusts to `flex-1 overflow-y-auto` between nav and bottom bar. |
| `Navigation.tsx` | Remove "Account" tab entry from the tabs array. |

#### Deleted Pages

| Component | Reason |
|-----------|--------|
| `AccountPage.tsx` | Content moves to `AccountPopover`. The `getInitials` helper, `PLAN_QUOTAS`, and `PLAN_BADGE_VARIANT` constants move to a shared utility file `shared/utils/account.ts` so both `AccountAvatar` and `AccountPopover` can use them. |

#### Layout Diagram

```
+------------------------------------------+
| Navigation: [Workspace] [Log] [Record]   |
+------------------------------------------+
|                                          |
|  main (flex-1, overflow-y-auto, p-md)    |
|    <Routes>                              |
|      WorkspacePage / RuleEditorPage /    |
|      RequestLogPage / RecordingPage /    |
|      VersionHistoryPage                  |
|    </Routes>                             |
|                                          |
+------------------------------------------+
| [Avatar]              bottom bar (40px)  |
+------------------------------------------+
        |
        v (click)
  +-------------------+
  | AccountPopover    |
  | - Profile header  |
  | - Plan badge      |
  | - Storage bar     |
  | - Upgrade / Logout|
  +-------------------+
```

### 2.3 UX-003: Postman-style URL Input

#### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `RequestMatchInput` | `components/RequestMatchInput.tsx` | Composite input with three visually connected segments: method dropdown (left, min 80px), URL pattern input (center, flex-1), match type dropdown (right, min 90px). Shared border styling. Props: `method`, `onMethodChange`, `urlPattern`, `onUrlPatternChange`, `matchType`, `onMatchTypeChange`, `requestType` (hides method segment when `'websocket'`). |

#### Modified Components

| Component | Changes |
|-----------|---------|
| `RuleEditorPage.tsx` | Replace the "Request Matching" fieldset's three separate inputs (URL Pattern, Match Type, Method) with a single `<RequestMatchInput>` component. Body match and GraphQL operation fields remain below as separate fields. |
| `RuleCard.tsx` | Add a small match type badge after the URL pattern for non-wildcard rules: shows `[regex]` or `[exact]`. Omitted for `wildcard` since it is the default. |

#### Responsive Behavior

`RequestMatchInput` uses a container query or a `min-width` media query. Below 350px, segments stack vertically. Above 350px, they render inline with connected borders (`rounded-l-md` on first, `rounded-none` on middle, `rounded-r-md` on last).

### 2.4 UX-004: Request Type Tabs

#### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `RequestTypeTabs` | `components/RequestTypeTabs.tsx` | Pill-style sub-tabs: HTTP, WebSocket, GraphQL. Each tab shows a count badge. Receives `activeTab`, `onTabChange`, and `counts: Record<string, number>`. Data-driven tab list for extensibility. |

#### Modified Components

| Component | Changes |
|-----------|---------|
| `WorkspacePage.tsx` | Adds `RequestTypeTabs` between navigation and toolbar. Computes counts from unfiltered rules using `countRulesByType`. Filters displayed rules by active type tab using `filterRulesByType` before applying URL/method filters. Hides collections with zero matching rules. |
| `RuleEditorPage.tsx` | Removes the "Request Type" `<Select>` dropdown. Reads default request type from URL search params (`?type=http|websocket|graphql`). When `type=graphql`, sets `requestType` to `'http'` and shows GraphQL operation field expanded. When editing an existing rule, the type is read from rule data (ignoring query param). |
| `WorkspaceToolbar.tsx` | The "+ New Rule" button passes the current active type tab as a query param: `navigate('/rules/new?type=' + activeTab)`. |

---

## 3. State Management Changes

### 3.1 New Store: Workspace UI Store

A new lightweight Zustand store for workspace-specific UI state that persists across in-session navigation:

```typescript
// Added to store.ts
interface WorkspaceUIState {
  activeTypeTab: 'http' | 'websocket' | 'graphql';
  setActiveTypeTab: (tab: 'http' | 'websocket' | 'graphql') => void;
  collapsedCollections: Set<string>;
  toggleCollectionCollapsed: (id: string) => void;
  loadCollapsedState: () => Promise<void>;
}
```

- `activeTypeTab` persists in Zustand state (resets on side panel close -- acceptable behavior).
- `collapsedCollections` loaded from and synced to `chrome.storage.session` on each toggle.

### 3.2 New Selectors

Pure utility functions in a new file `shared/selectors.ts`:

```typescript
type RuleTypeTab = 'http' | 'websocket' | 'graphql';

/** Categorize a rule into its type tab */
function getRuleTypeTab(rule: MockRule): RuleTypeTab {
  if (rule.requestType === 'websocket') return 'websocket';
  if (rule.graphqlOperation) return 'graphql';
  return 'http';
}

/** Filter rules by type tab */
function filterRulesByType(rules: MockRule[], tab: RuleTypeTab): MockRule[];

/** Count rules per type tab */
function countRulesByType(rules: MockRule[]): Record<RuleTypeTab, number>;

/** Group rules by collection ID */
function groupRulesByCollection(rules: MockRule[]): Map<string | null, MockRule[]>;

/** Get root collections (no parentId) */
function buildCollectionTree(collections: Collection[]): Collection[];

/** Get child collections for a given parent */
function getChildCollections(collections: Collection[], parentId: string): Collection[];
```

### 3.3 No Changes to Existing Stores

`useRulesStore`, `useCollectionsStore`, `useTeamsStore`, `useAuthStore`, `useSyncStore` remain unchanged. All new filtering and grouping is done via selectors consuming existing store state.

---

## 4. Routing Changes

### Routes Removed

| Route | Replacement |
|-------|-------------|
| `/collections` | Merged into `/` (WorkspacePage) |
| `/team` | Merged into `/` (TeamHeader + TeamPanel) |
| `/account` | Replaced by AccountAvatar + AccountPopover (no route) |

### Routes Unchanged

| Route | Component |
|-------|-----------|
| `/rules/new` | `RuleEditorPage` (now accepts `?type=` query param) |
| `/rules/:id/edit` | `RuleEditorPage` |
| `/collections/:id/versions` | `VersionHistoryPage` |
| `/log` | `RequestLogPage` |
| `/recording` | `RecordingPage` |

### Updated SidePanel Routes

```tsx
<Routes>
  <Route path="/" element={<WorkspacePage />} />
  <Route path="/rules/new" element={<RuleEditorPage />} />
  <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
  <Route path="/collections/:id/versions" element={<VersionHistoryPage />} />
  <Route path="/log" element={<RequestLogPage />} />
  <Route path="/recording" element={<RecordingPage />} />
</Routes>
```

---

## 5. Non-Functional Considerations

### Virtualized Lists (NFR-004)

For the initial implementation, standard DOM rendering with `useMemo` for filtered/grouped rule lists is sufficient up to ~500 rules. If performance profiling shows jank, add `@tanstack/react-virtual` to the `CollectionGroup` rule list as a follow-up.

### Animation (NFR-003)

Collection expand/collapse uses CSS `max-height` transition with `overflow: hidden` and 150ms duration. No JS animation library needed.

### Keyboard Accessibility (NFR-001)

- `CollectionGroup` header is a `<button>` for expand/collapse, activated with Enter/Space.
- `RequestMatchInput` segments support Tab navigation natively (three focusable elements in DOM order).
- `AccountPopover` traps focus when open, returns focus to avatar on close.
- `CollectionContextMenu` supports arrow key navigation.

### Theme Support (NFR-006)

All new components use existing design tokens (`bg-surface-card`, `text-content-primary`, `border-border`, etc.) from `ThemeProvider`. No new tokens needed.

---

## 6. Ticket Breakdown

Each ticket is one branch, one PR, independently testable via TDD.

### Phase 1: Foundation (no UI-visible changes)

#### TICKET-001: Create selector utilities and workspace UI store

**Scope:** Add `shared/selectors.ts` with `getRuleTypeTab`, `filterRulesByType`, `countRulesByType`, `groupRulesByCollection`, `buildCollectionTree`, `getChildCollections`. Add `useWorkspaceUIStore` to `store.ts` with `activeTypeTab`, `collapsedCollections`, `toggleCollectionCollapsed`, `loadCollapsedState`.

**Files:**
- NEW: `extension/src/shared/selectors.ts`
- MODIFY: `extension/src/shared/store.ts`

**Dependencies:** None

**Tests:** Unit tests for all selector functions (edge cases: empty arrays, rules with/without graphqlOperation, nested collections). Unit tests for workspace UI store actions (toggle collapsed, set active tab, load from chrome.storage.session).

---

### Phase 2: Workspace Components (build bottom-up)

#### TICKET-002: Create CollectionGroup component

**Scope:** Build `CollectionGroup` that renders a collection header (name, enable/disable toggle, rule count badge, expand/collapse chevron) and its child `RuleCard` items when expanded. Support `depth` prop for nested indentation (16px per level via `ml-` utility). Read/write collapsed state via `useWorkspaceUIStore`. Include 150ms CSS transition for expand/collapse.

**Files:**
- NEW: `extension/src/sidepanel/components/CollectionGroup.tsx`

**Dependencies:** TICKET-001

**Tests:** Renders collection name and rule count. Toggle calls `toggleCollection`. Chevron rotates on expand/collapse. Shows RuleCards when expanded. Applies indentation for depth > 0. Empty collection shows "No rules" message.

---

#### TICKET-003: Create CollectionContextMenu component

**Scope:** "..." button on each `CollectionGroup` header that opens a dropdown with: Delete, Export (single collection), Version History (navigates to `/collections/:id/versions`). Version History only visible when user is authenticated and in a team.

**Files:**
- NEW: `extension/src/sidepanel/components/CollectionContextMenu.tsx`

**Dependencies:** TICKET-002

**Tests:** Renders menu items on click. Delete calls `deleteCollection` with confirmation. Export triggers JSON download. Version History navigates to correct route. Version History hidden when no auth/team.

---

#### TICKET-004: Create WorkspaceToolbar component

**Scope:** Toolbar with: URL filter input (flex-1), method filter dropdown, "+ New Rule" button, "+ New Collection" button (opens create collection modal), Import button, Export button. Extract import file handling and export logic from `CollectionsPage` into this component. The "New Collection" modal uses the same UI as the current `CollectionsPage` modal.

**Files:**
- NEW: `extension/src/sidepanel/components/WorkspaceToolbar.tsx`

**Dependencies:** None

**Tests:** Filter inputs call onChange callbacks. "+ New Rule" navigates to `/rules/new`. "+ New Collection" opens modal. Import/export flow works end-to-end. Export disabled when no collections.

---

#### TICKET-005: Create TeamHeader and TeamPanel components

**Scope:** `TeamHeader`: shows team name + member count badge. Click toggles `TeamPanel` visibility. `TeamPanel`: member list with roles, invite form (email input + invite button), pending invites with accept/decline. Both conditional on `useAuthStore().user` and `useTeamsStore().team` being present. Extracts all logic from current `TeamPage.tsx`.

**Files:**
- NEW: `extension/src/sidepanel/components/TeamHeader.tsx`
- NEW: `extension/src/sidepanel/components/TeamPanel.tsx`

**Dependencies:** None

**Tests:** TeamHeader shows team name and member count. Click toggles panel. Panel renders member list. Invite form calls `inviteMember`. Pending invites render with accept/decline. Both hidden when not authenticated or no team.

---

#### TICKET-006: Create WorkspacePage and wire up routing

**Scope:** Build `WorkspacePage` composing: `TeamHeader` (conditional), `WorkspaceToolbar`, `SyncControls`, `CollectionGroup[]` for root collections with nested children, "Ungrouped" section for rules where `collectionId === null`, `WorkspaceEmptyState` when no rules and no collections. Update `SidePanel.tsx`: replace `/` route with `WorkspacePage`, remove `/collections` and `/team` routes. Update `Navigation.tsx`: tabs become `[Workspace, Log, Record]`.

**Files:**
- NEW: `extension/src/sidepanel/pages/WorkspacePage.tsx`
- NEW: `extension/src/sidepanel/components/WorkspaceEmptyState.tsx`
- MODIFY: `extension/src/sidepanel/SidePanel.tsx`
- MODIFY: `extension/src/sidepanel/components/Navigation.tsx`
- DELETE: `extension/src/sidepanel/pages/CollectionsPage.tsx`
- DELETE: `extension/src/sidepanel/pages/TeamPage.tsx`

**Dependencies:** TICKET-001, TICKET-002, TICKET-003, TICKET-004, TICKET-005

**Tests:** Collections render as expandable groups with nested rules. Ungrouped rules section works. URL and method filters apply across all collections. Empty state renders when no rules/collections. Navigation shows 3 tabs. Removed routes (`/collections`, `/team`) no longer render old pages.

---

#### TICKET-007: Create AccountAvatar and AccountPopover

**Scope:** `AccountAvatar`: 32x32 circle in bottom bar. Shows user `photoURL`, or initials via `getInitials()`, or generic user icon when logged out. Shows loading pulse ring during `fetchUser`. `AccountPopover`: opens upward from avatar. Contains all `AccountPage` content (profile header, plan badge, `StorageBar`, upgrade button, logout). When logged out, shows `AuthForm`. Dismissible via outside click or Escape. Focus trap when open. Extract `getInitials`, `PLAN_QUOTAS`, `PLAN_BADGE_VARIANT` to `shared/utils/account.ts`. Update `SidePanel.tsx` layout to add bottom bar. Remove `/account` route.

**Files:**
- NEW: `extension/src/sidepanel/components/AccountAvatar.tsx`
- NEW: `extension/src/sidepanel/components/AccountPopover.tsx`
- NEW: `extension/src/shared/utils/account.ts`
- MODIFY: `extension/src/sidepanel/SidePanel.tsx`
- MODIFY: `extension/src/sidepanel/components/Navigation.tsx`
- DELETE: `extension/src/sidepanel/pages/AccountPage.tsx`

**Dependencies:** TICKET-006 (SidePanel layout must have bottom bar slot; Navigation must already exclude Account tab)

**Tests:** Avatar shows photo when available, initials otherwise, generic icon when logged out. Click opens popover. Escape closes popover. Outside click closes popover. Auth form shown when logged out. Logout works from popover. Loading state shows pulse ring.

---

#### TICKET-008: Update RuleCard -- remove collectionName display, add match type badge

**Scope:** Since rules are now shown inside collection groups, stop passing `collectionName` from `WorkspacePage`. Add a small badge showing match type when it is not `wildcard`: `[regex]` or `[exact]` rendered after the URL pattern. The `collectionName` prop remains optional for backward compatibility but is no longer used in the workspace.

**Files:**
- MODIFY: `extension/src/sidepanel/components/RuleCard.tsx`
- MODIFY: `extension/src/sidepanel/pages/WorkspacePage.tsx`

**Dependencies:** TICKET-006

**Tests:** Match type badge appears for regex/exact rules. Badge hidden for wildcard. RuleCard renders without collection name in workspace context.

---

### Phase 3: Rule Editor Improvements

#### TICKET-009: Create RequestMatchInput component

**Scope:** Composite input with three connected segments: method dropdown (left, 80px min-width), URL pattern input (center, flex-1, auto-focused on new rule), match type dropdown (right, 90px min-width). Connected border: outer container has `border border-border rounded-md`, internal segments separated by `border-r`. Method dropdown hidden when `requestType === 'websocket'`. Responsive: stacks vertically below 350px.

**Files:**
- NEW: `extension/src/sidepanel/components/RequestMatchInput.tsx`

**Dependencies:** None

**Tests:** Renders three segments for HTTP. Hides method for WebSocket. Tab navigates between segments. Values update via onChange. Connected border styling applied correctly. Stacks vertically at narrow width.

---

#### TICKET-010: Integrate RequestMatchInput into RuleEditorPage

**Scope:** Replace the three separate inputs (URL Pattern, Match Type, Method) in the "Request Matching" fieldset with `<RequestMatchInput>`. Remove the individual `<Select>` and `<Input>` for those fields. Body match and GraphQL operation fields remain below as separate inputs. All existing validation unchanged.

**Files:**
- MODIFY: `extension/src/sidepanel/pages/RuleEditorPage.tsx`

**Dependencies:** TICKET-009

**Tests:** Rule creation with all method/URL/matchType combinations works. Validation prevents empty URL. WebSocket mode hides method. Editing existing rules populates fields correctly.

---

#### TICKET-011: Create RequestTypeTabs component

**Scope:** Pill-style sub-tab bar. Three tabs: HTTP, WebSocket, GraphQL. Each shows a count badge. Active tab gets filled pill style, inactive gets outline/ghost. Props: `activeTab`, `onTabChange`, `counts: Record<string, number>`. Tab list is data-driven (array of `{ key, label }`) for extensibility.

**Files:**
- NEW: `extension/src/sidepanel/components/RequestTypeTabs.tsx`

**Dependencies:** None

**Tests:** Renders three tabs with labels and counts. Click calls `onTabChange`. Active tab has distinct styling. Zero-count tabs still render.

---

#### TICKET-012: Integrate RequestTypeTabs into WorkspacePage

**Scope:** Add `RequestTypeTabs` between navigation bar and `WorkspaceToolbar` in `WorkspacePage`. Compute counts using `countRulesByType` selector from all rules (before URL/method filter). Filter displayed rules by active tab using `filterRulesByType`, then apply URL/method filters. Collections with zero rules of the active type are hidden. Active tab stored in `useWorkspaceUIStore`.

**Files:**
- MODIFY: `extension/src/sidepanel/pages/WorkspacePage.tsx`

**Dependencies:** TICKET-001, TICKET-006, TICKET-011

**Tests:** Switching tabs filters rules by type. Collections with zero matching rules are hidden. Counts update when rules change. Tab persists when navigating to editor and back. "Ungrouped" section also filtered.

---

#### TICKET-013: Remove request type dropdown from RuleEditorPage, use tab context

**Scope:** Remove the "Request Type" `<Select>` from `RuleEditorPage`. Read default from `useSearchParams` (`?type=http|websocket|graphql`). When `type=graphql`: set `requestType='http'`, show GraphQL operation field visible by default (not collapsed). When `type=websocket`: set `requestType='websocket'`. When editing an existing rule: ignore query param, use rule's data. Update `WorkspaceToolbar` "+ New Rule" to pass `?type=<activeTab>`.

**Files:**
- MODIFY: `extension/src/sidepanel/pages/RuleEditorPage.tsx`
- MODIFY: `extension/src/sidepanel/components/WorkspaceToolbar.tsx`

**Dependencies:** TICKET-010, TICKET-012

**Tests:** New rule from HTTP tab defaults to HTTP. New rule from GraphQL tab shows GraphQL field expanded. New rule from WebSocket tab defaults to WebSocket. Editing existing rule uses rule's type regardless of query param. Request type dropdown no longer rendered.

---

### Dependency Graph

```
TICKET-001 (selectors + UI store)
    |
    +---> TICKET-002 (CollectionGroup)
    |         |
    |         +---> TICKET-003 (CollectionContextMenu)
    |         |         |
    |         +---------+---> TICKET-006 (WorkspacePage + routing)
    |                             ^            |
    |                             |            +---> TICKET-007 (AccountAvatar + Popover)
    TICKET-004 (Toolbar) ---------+            |
    TICKET-005 (TeamHeader/Panel) +            +---> TICKET-008 (RuleCard updates)
                                               |
                                               +---> TICKET-012 (Type tabs integration)
                                                         ^
                                                         |
    TICKET-011 (RequestTypeTabs component) ---------------+
                                                         |
                                                         +---> TICKET-013 (Editor type from tabs)
                                                                   ^
                                                                   |
    TICKET-009 (RequestMatchInput) --> TICKET-010 (Editor integration) --+
```

### Implementation Order

| Order | Ticket | Can Parallelize With |
|-------|--------|---------------------|
| 1 | TICKET-001 | TICKET-004, TICKET-005, TICKET-009, TICKET-011 |
| 2 | TICKET-002 | TICKET-004, TICKET-005, TICKET-009, TICKET-011 |
| 3 | TICKET-003 | TICKET-004, TICKET-005, TICKET-009, TICKET-011 |
| 4 | TICKET-004 | TICKET-005 |
| 5 | TICKET-005 | TICKET-004 |
| 6 | TICKET-006 | -- (blocks on 001-005) |
| 7 | TICKET-007 | TICKET-008, TICKET-009 |
| 8 | TICKET-008 | TICKET-007 |
| 9 | TICKET-009 | any Phase 2 ticket |
| 10 | TICKET-010 | TICKET-011 |
| 11 | TICKET-011 | TICKET-010 |
| 12 | TICKET-012 | -- (blocks on 006, 011) |
| 13 | TICKET-013 | -- (blocks on 010, 012) |

---

## 7. Files Summary

### New Files (13)

- `extension/src/shared/selectors.ts`
- `extension/src/shared/utils/account.ts`
- `extension/src/sidepanel/pages/WorkspacePage.tsx`
- `extension/src/sidepanel/components/CollectionGroup.tsx`
- `extension/src/sidepanel/components/CollectionContextMenu.tsx`
- `extension/src/sidepanel/components/WorkspaceToolbar.tsx`
- `extension/src/sidepanel/components/WorkspaceEmptyState.tsx`
- `extension/src/sidepanel/components/TeamHeader.tsx`
- `extension/src/sidepanel/components/TeamPanel.tsx`
- `extension/src/sidepanel/components/AccountAvatar.tsx`
- `extension/src/sidepanel/components/AccountPopover.tsx`
- `extension/src/sidepanel/components/RequestMatchInput.tsx`
- `extension/src/sidepanel/components/RequestTypeTabs.tsx`

### Modified Files (5)

- `extension/src/shared/store.ts` -- add `useWorkspaceUIStore`
- `extension/src/sidepanel/SidePanel.tsx` -- routing + layout (bottom bar)
- `extension/src/sidepanel/components/Navigation.tsx` -- reduce to 3 tabs
- `extension/src/sidepanel/components/RuleCard.tsx` -- add match type badge
- `extension/src/sidepanel/pages/RuleEditorPage.tsx` -- `RequestMatchInput`, remove type dropdown

### Deleted Files (3)

- `extension/src/sidepanel/pages/CollectionsPage.tsx`
- `extension/src/sidepanel/pages/TeamPage.tsx`
- `extension/src/sidepanel/pages/AccountPage.tsx`

### Summary

- **New stores:** 1 (`useWorkspaceUIStore`)
- **Type changes:** None (`RequestType` stays as `'http' | 'websocket'`)
- **Data migration:** None
- **Total tickets:** 13
