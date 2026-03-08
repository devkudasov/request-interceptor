# UX Improvements Requirements -- Request Interceptor

**Document ID:** PRD-UX-001
**Date:** 2026-03-08
**Author:** Business Analyst Agent
**Status:** Draft

---

## Overview

This document defines requirements for four UX improvements to the Request Interceptor Chrome extension's side panel interface. The changes reduce navigation friction, improve information density, and align the UI with established patterns from tools developers already use (Postman, VS Code, Slack).

**Target audience:** Web developers who intercept and mock HTTP/WebSocket requests during development.

**Problem statement:** The current six-tab navigation spreads related functionality across too many views. Rule creation requires too many separate form fields. These issues slow down the core workflow of creating and managing mock rules.

---

## UX-001: Unified Workspace Tab

### Priority: P1 (implement first -- prerequisite for UX-002)

### Current Behavior

Three separate top-level tabs exist:

- **Rules** (`/`) -- flat list of all rules with URL/method filters. Rules display their `collectionName` via lookup but have no grouping.
- **Collections** (`/collections`) -- list of collections with rule counts, enable/disable toggles, import/export, sync controls, and version history links. Supports parent/child hierarchy (`parentId`).
- **Team** (`/team`) -- team creation, member list, invite form, pending invite management. Requires auth.

Users must switch tabs to see how rules relate to collections, or to manage team-shared collections.

### Desired Behavior

A single **Workspace** tab replaces Rules, Collections, and Team. The view is organized as:

1. **Team header** (conditional) -- if authenticated and in a team, show team name and a small member count badge at the top. Clicking opens an inline panel or modal with full team management (invite, remove, pending invites). If not in a team or not authenticated, this section is hidden.

2. **Collection tree** -- collections displayed as expandable/collapsible groups. Each collection node shows:
   - Collection name
   - Enable/disable toggle
   - Rule count badge
   - Expand/collapse chevron
   - Context menu (delete, export, version history)

3. **Rules within collections** -- expanding a collection reveals its rules as `RuleCard` items. Uncollected rules appear under an "Ungrouped" section at the bottom.

4. **Toolbar** -- single toolbar with: search/filter input, method filter dropdown, "+ New Rule" button, "+ New Collection" button, Import/Export actions, Sync controls.

### User Stories

- **US-001:** As a developer, I want to see my rules organized by collection in one view so that I don't have to switch tabs to understand my mock setup.
- **US-002:** As a team member, I want team context visible alongside my rules so that I know which collections are shared.
- **US-003:** As a developer, I want to expand/collapse collections so that I can focus on the rules I'm currently working with.
- **US-004:** As a developer, I want to drag rules between collections so that I can reorganize without editing each rule.

### Acceptance Criteria

- [ ] AC-001: Top navigation shows "Workspace" instead of "Rules", "Collections", and "Team" tabs.
- [ ] AC-002: Collections render as collapsible groups with rules nested inside.
- [ ] AC-003: Ungrouped rules (where `collectionId === null`) appear under an "Ungrouped" heading.
- [ ] AC-004: Collection toggle (enable/disable) works inline without navigating away.
- [ ] AC-005: URL filter and method filter apply across all visible rules regardless of collection.
- [ ] AC-006: "+ New Rule" button still navigates to `/rules/new`.
- [ ] AC-007: "+ New Collection" opens the same modal as the current Collections page.
- [ ] AC-008: Import/Export buttons function identically to current behavior.
- [ ] AC-009: Sync controls render below the toolbar (same as current Collections page).
- [ ] AC-010: When the user is authenticated and in a team, a team header shows team name and member count.
- [ ] AC-011: Clicking the team header expands an inline panel with member list, invite form, and pending invites.
- [ ] AC-012: When not authenticated or not in a team, no team header appears.
- [ ] AC-013: Collection version history remains accessible via context menu or button on each collection.
- [ ] AC-014: Nested collections (parent/child via `parentId`) render with visual indentation inside the parent.
- [ ] AC-015: Empty state (no rules, no collections) shows a single onboarding prompt with "Create Rule" and "Create Collection" actions.

### Edge Cases

- **No collections, some rules:** All rules appear under "Ungrouped". No empty collection list shown.
- **Collections with zero rules:** Collection group shows as collapsed with "0 rules" badge. Still expandable (shows empty message).
- **User not authenticated:** Team section hidden entirely. Collections and rules still render locally.
- **Team with pending invites:** Pending invite banner appears at the top of the workspace, above the team header.
- **Large number of rules (100+):** Consider virtualized list rendering. Document as a non-functional requirement for the architect.
- **Collapsed state persistence:** Expand/collapse state should persist across navigation using `chrome.storage.session` or React state.

### Impact on Existing Features

- **Routes removed:** `/collections`, `/team` routes are removed from `SidePanel.tsx`.
- **Routes added:** None -- workspace replaces `/` route.
- **Components affected:** `Navigation.tsx` (remove 3 tabs, add 1), `RulesPage.tsx` (major rewrite to add collection grouping), `CollectionsPage.tsx` (merged into workspace), `TeamPage.tsx` (merged into workspace).
- **Stores unaffected:** `useRulesStore`, `useCollectionsStore`, `useTeamsStore` remain the same.
- **Import/export:** No functional change, just relocated UI controls.
- **Deep links:** `/collections/:id/versions` route should remain for version history navigation.

---

## UX-002: Account as Bottom Icon

### Priority: P1 (implement alongside UX-001)

### Current Behavior

"Account" is a top-level tab in the horizontal navigation bar alongside Rules, Collections, Log, Record, Team. It renders a full page with: auth form (when logged out), user profile header with avatar/initials, plan badge, storage bar, upgrade button, and logout button.

### Desired Behavior

Remove "Account" from the top navigation. Instead, render a **small circular avatar/icon** fixed to the **bottom-left corner** of the side panel. This follows the pattern used by VS Code (settings gear + account icon at bottom of activity bar) and Slack (workspace icon at bottom).

**Logged-in state:** Show user avatar photo or initials circle (reuse existing `getInitials` logic from `AccountPage.tsx`). Clicking opens a **popover or slide-up panel** with the existing account content (profile, plan, storage, logout).

**Logged-out state:** Show a generic user icon. Clicking opens the auth form (login/signup).

### User Stories

- **US-005:** As a developer, I want account settings out of my main workflow tabs so that navigation focuses on my primary tasks (rules, logs, recording).
- **US-006:** As a developer, I want to quickly see my login status via the avatar so that I know if I'm authenticated without switching tabs.
- **US-007:** As a developer, I want to access account settings with one click from anywhere so that I don't lose my place.

### Acceptance Criteria

- [ ] AC-016: "Account" tab is removed from top navigation.
- [ ] AC-017: A circular avatar (32x32px) renders in the bottom-left corner of the side panel, outside the main scrollable content area.
- [ ] AC-018: When authenticated, the avatar shows the user's `photoURL` or initials (same logic as current `AccountPage`).
- [ ] AC-019: When not authenticated, a generic user outline icon is displayed.
- [ ] AC-020: Clicking the avatar opens a popover/panel containing all current `AccountPage` content.
- [ ] AC-021: The popover can be dismissed by clicking outside or pressing Escape.
- [ ] AC-022: Plan badge is visible on the avatar or in the popover header.
- [ ] AC-023: The `/account` route is removed from `SidePanel.tsx`.

### Edge Cases

- **Side panel at minimum width:** Avatar must not overlap with main content. Use fixed positioning outside the scroll container.
- **Popover overflow:** If the side panel is short, the popover should open upward (toward available space) rather than being clipped.
- **Auth state change:** When user logs in/out, the avatar should reactively update without requiring navigation.
- **Loading state:** While `fetchUser` is in progress, show a subtle loading indicator on the avatar (e.g., pulsing ring).

### Impact on Existing Features

- **Components removed:** `AccountPage.tsx` as a standalone page (content moves into an `AccountPopover` component).
- **Components added:** `AccountAvatar` (bottom icon), `AccountPopover` (popover content).
- **Layout change:** `SidePanel.tsx` layout changes from `flex flex-col` with Navigation + scrollable main to Navigation + scrollable main + fixed bottom bar.
- **Navigation.tsx:** Remove Account tab entry.
- **Routes:** Remove `/account` route.

---

## UX-003: Simplified Rule Creation (Postman-style Input)

### Priority: P2

### Current Behavior

The rule editor (`RuleEditorPage.tsx`) uses separate, vertically stacked form fields inside a "Request Matching" fieldset:

1. **Request Type** -- standalone `Select` dropdown at the top (HTTP / WebSocket)
2. **URL Pattern** -- full-width `Input` field
3. **Match Type** -- standalone `Select` dropdown (Wildcard / Regex / Exact)
4. **Method** -- standalone `Select` dropdown (GET / POST / PUT / etc.) -- only shown for HTTP type

This layout takes significant vertical space and requires scanning four separate fields to understand what a rule matches.

### Desired Behavior

Replace the four separate fields with a **single horizontal input line** for the most common case (HTTP rules):

```
[GET v] [https://api.example.com/users___________] [wildcard v]
```

- **Left segment:** Method dropdown (compact, no label). Shows "GET", "POST", etc. Default: "GET".
- **Center segment:** URL pattern text input. Takes all remaining horizontal space. Placeholder: "Enter URL pattern...".
- **Right segment:** Match type dropdown (compact, no label). Shows "wildcard", "regex", "exact". Default: "wildcard".

The three segments are visually connected (shared border, like Postman's URL bar) to read as a single input.

For **WebSocket rules**, the method dropdown is hidden (WebSocket has no HTTP method). The line becomes:

```
[wss://api.example.com/socket___________] [wildcard v]
```

The **Request Type** selector (HTTP / WebSocket) moves to a toggle or segmented control above the URL bar, or becomes the second-level tabs (see UX-004).

### User Stories

- **US-008:** As a developer, I want to define a rule's request matching in a single line so that I can quickly scan and create rules.
- **US-009:** As a developer, I want the rule input to look like Postman's URL bar so that it feels familiar.
- **US-010:** As a developer, I want the method dropdown integrated into the URL input so that I can see at a glance what method + URL a rule matches.

### Acceptance Criteria

- [ ] AC-024: The rule editor shows method, URL pattern, and match type in a single horizontal row.
- [ ] AC-025: The three segments share a connected visual border (no gaps between them).
- [ ] AC-026: The method dropdown is the leftmost segment with a minimum width of 80px.
- [ ] AC-027: The URL pattern input fills remaining space and is focused by default on new rule creation.
- [ ] AC-028: The match type dropdown is the rightmost segment with a minimum width of 90px.
- [ ] AC-029: When request type is WebSocket, the method dropdown is hidden.
- [ ] AC-030: The combined input supports keyboard navigation: Tab moves between segments.
- [ ] AC-031: All existing form validation still applies (URL pattern required, etc.).
- [ ] AC-032: The `RuleCard` component in the rules list also displays method + URL + match type in a compact inline format.

### Edge Cases

- **Very long URLs:** The URL input should truncate with ellipsis when not focused, and show full text when focused/editing.
- **"ANY" method:** Should render as "ANY" in the dropdown, same as current behavior.
- **Narrow side panel:** If the side panel is very narrow (< 350px), the three segments should stack vertically as a graceful fallback (responsive layout).
- **Copy-paste:** Users should be able to paste a full URL into the center input. If a pasted value includes a method prefix (e.g., "GET https://..."), consider parsing it into method + URL automatically (stretch goal, not required for MVP).

### Impact on Existing Features

- **Components modified:** `RuleEditorPage.tsx` -- request matching fieldset rewritten.
- **Components added:** `UrlBar` or `RequestMatchInput` -- new composite input component.
- **Data model:** No change. The same fields (`method`, `urlPattern`, `urlMatchType`) are stored.
- **Existing rules:** No migration needed. Display adapts to existing data.
- **Body match and GraphQL operation fields:** Remain as separate fields below the URL bar (they are less frequently used).

---

## UX-004: Request Type as Second-Level Tabs

### Priority: P2 (implement alongside or after UX-003)

### Current Behavior

Request type is a `Select` dropdown in the rule editor with options: "HTTP (fetch/XHR)" and "WebSocket". The `RequestType` type is `'http' | 'websocket'`. The rules list (`RulesPage.tsx`) shows all rule types mixed together with no way to filter by request type.

Note: The type system defines `'http' | 'websocket'` but the editor options reference "GraphQL" is not yet a separate request type -- it's handled as an HTTP rule with an optional `graphqlOperation` field.

### Desired Behavior

Add **second-level tabs** within the Workspace view (below the main navigation, above the rules list):

```
[ HTTP ] [ WebSocket ] [ GraphQL ]
```

- **HTTP tab:** Shows only rules where `requestType === 'http'` and `graphqlOperation` is empty/undefined.
- **WebSocket tab:** Shows only rules where `requestType === 'websocket'`.
- **GraphQL tab:** Shows only rules where `requestType === 'http'` and `graphqlOperation` is defined and non-empty.

The active tab filters the rules displayed in the workspace. Collection groups still apply within each tab.

When creating a new rule, the **currently active tab determines the default request type**. If the user is on the GraphQL tab and clicks "+ New Rule", the editor opens with request type set to HTTP and the GraphQL operation field pre-expanded.

### User Stories

- **US-011:** As a developer, I want to see HTTP, WebSocket, and GraphQL rules separately so that I can focus on one protocol at a time.
- **US-012:** As a developer, I want the active tab to set defaults for new rules so that creating rules is faster.
- **US-013:** As a developer, I want to quickly see how many rules I have per type so that I can understand my mock setup.

### Acceptance Criteria

- [ ] AC-033: Second-level tabs render below the main navigation bar with labels: "HTTP", "WebSocket", "GraphQL".
- [ ] AC-034: Each tab shows a count badge with the number of rules of that type.
- [ ] AC-035: Selecting a tab filters the workspace to show only rules of that type.
- [ ] AC-036: Collections that have zero rules of the selected type are hidden (not shown as empty groups).
- [ ] AC-037: The "Ungrouped" section follows the same filtering.
- [ ] AC-038: URL and method filters (from the toolbar) apply within the active type tab.
- [ ] AC-039: When creating a new rule from the HTTP tab, `requestType` defaults to `'http'`.
- [ ] AC-040: When creating a new rule from the WebSocket tab, `requestType` defaults to `'websocket'`.
- [ ] AC-041: When creating a new rule from the GraphQL tab, `requestType` defaults to `'http'` and the GraphQL operation field is visible.
- [ ] AC-042: The request type dropdown is removed from `RuleEditorPage.tsx` (replaced by tab context).
- [ ] AC-043: The active tab persists across navigation (e.g., editing a rule and returning keeps the same tab active).
- [ ] AC-044: Second-level tabs are visually distinct from the main navigation (smaller, different style -- e.g., pill-shaped or underline variant).

### Edge Cases

- **No rules of a type:** The tab is still visible but shows "(0)". Selecting it shows an empty state: "No [HTTP/WebSocket/GraphQL] rules yet. Create one."
- **Rule type changes during edit:** If a user changes request type in the editor (e.g., from HTTP to WebSocket), the rule moves to the other tab upon save. The user should be returned to the new tab.
- **GraphQL categorization:** A rule with `requestType === 'http'` and `graphqlOperation === ''` (empty string) is treated as HTTP, not GraphQL. Only non-empty `graphqlOperation` qualifies.
- **Future request types:** The tab system should be extensible. If a `grpc` type is added later, adding a tab should be straightforward (data-driven tab list).
- **Type added to data model:** Consider whether `'graphql'` should become a first-class `RequestType` value. **Decision needed from System Architect** -- this would require a data migration for existing rules. Short-term, filtering by `graphqlOperation` presence works without schema change.

### Impact on Existing Features

- **Components modified:** Workspace view (new, from UX-001) -- add sub-tabs. `RuleEditorPage.tsx` -- remove request type dropdown, accept default from navigation context.
- **Components added:** `RequestTypeTabs` -- sub-tab bar component.
- **Routing:** Consider encoding active type tab in state or URL query param (e.g., `/?type=websocket`) for persistence.
- **Data model consideration:** No immediate change. Long-term, Architect should evaluate promoting GraphQL to a `RequestType` enum value.
- **Rules store:** Add a selector or filter utility for rules by request type.

---

## Implementation Order

| Order | Item | Rationale |
|-------|------|-----------|
| 1 | UX-001: Unified Workspace | Foundation for all other changes. Must land first. |
| 2 | UX-002: Account Bottom Icon | Completes the navigation redesign. Can be done in parallel with UX-001. |
| 3 | UX-003: Postman-style Input | Standalone editor improvement. No dependency on UX-001/002. |
| 4 | UX-004: Request Type Tabs | Depends on UX-001 (workspace view) being in place. |

UX-001 and UX-002 should ship together as a single navigation overhaul. UX-003 and UX-004 can follow as separate PRs.

---

## Non-Functional Requirements

- **NFR-001:** All changes must maintain existing keyboard accessibility (tab navigation, enter to activate).
- **NFR-002:** All changes must work within the Chrome side panel's constrained width (minimum 360px).
- **NFR-003:** Collection expand/collapse animations should complete within 150ms.
- **NFR-004:** Rule filtering (by type, URL, method) should feel instant for up to 500 rules.
- **NFR-005:** No changes to the Chrome extension's required permissions.
- **NFR-006:** All new components must support light and dark themes (via existing `ThemeProvider`).

---

## Open Questions

| # | Question | Owner |
|---|----------|-------|
| OQ-001 | Should `'graphql'` become a first-class `RequestType` enum value, requiring data migration? Or keep the current approach of filtering by `graphqlOperation` field presence? | System Architect |
| OQ-002 | Should drag-and-drop rule reordering between collections be included in UX-001 MVP or deferred? | Product Owner |
| OQ-003 | Should the account popover (UX-002) include team-switching if multi-team support is added later? | Product Owner |
| OQ-004 | For the Postman-style input (UX-003), should pasting "GET https://..." auto-parse into method + URL? | Product Owner |
| OQ-005 | Should the workspace view support rule multi-select for bulk operations (move to collection, delete, enable/disable)? | Product Owner |

---

## Out of Scope

- Backend API changes -- all improvements are frontend-only.
- New interception capabilities (gRPC, Server-Sent Events).
- Changes to the Recording or Log tabs.
- Mobile/responsive layouts beyond side panel width constraints.
- Onboarding tutorials or tooltips (separate initiative).
