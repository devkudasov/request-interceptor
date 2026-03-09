# Layout Refactor — Requirements Document

**Author:** Business Analyst
**Date:** 2026-03-09
**Status:** Draft

---

## 1. Problem Statement

The current Request Interceptor side panel uses a **three-tab navigation** (Workspace / Log / Record) at the top of the panel. This creates several issues:

- **Cognitive overhead** — Users must switch tabs to access functionality that should be contextually available. Recording is part of the rule-creation workflow, yet it lives in a separate tab. Logs are useful during rule development, but require navigating away from the workspace.
- **Lost context** — Switching from Workspace to Log loses the user's scroll position and selection state in the workspace. Users constantly flip back and forth.
- **Wasted space** — The top navigation bar consumes vertical space in a side panel that is already constrained (320px wide, full browser height). The Account button currently sits in a bottom bar that is used only for that single button.
- **Recording is disconnected** — The Record tab is a standalone page, but its entire purpose is to generate mock rules that end up in the Workspace. It should be part of the rule-creation flow, not a separate destination.

## 2. Goals

1. **Simplify to a single-view layout** — The Workspace is the app. No top navigation tabs.
2. **Logs as an IDE-style console** — Always accessible from a bottom bar button. Opens as a slide-up panel without leaving the workspace.
3. **Record integrated into workspace workflow** — Recording is a method of creating rules, so it belongs in the rule-creation context.
4. **Bottom bar for utilities** — Logs (left) and Account (right) in a persistent bottom bar.

## 3. User Stories

### US-01: Single Workspace View
**As a** developer using the extension,
**I want** the app to show the workspace by default with no navigation tabs,
**so that** I always see my rules and collections without switching views.

### US-02: IDE-Style Log Console
**As a** developer debugging mock rules,
**I want** to open a log panel from the bottom bar that slides up from the bottom,
**so that** I can see intercepted requests while still viewing my workspace above.

### US-03: Record from Workspace
**As a** developer creating mock rules,
**I want** to start recording directly from the workspace toolbar,
**so that** I don't have to leave my workspace to capture real API responses.

### US-04: Bottom Bar Utilities
**As a** user,
**I want** the Account button in the bottom-right and Log toggle in the bottom-left,
**so that** utility controls are always accessible but unobtrusive.

## 4. Functional Requirements

### FR-001: Remove Top Navigation
- The top navigation bar (Workspace / Log / Record tabs) shall be completely removed.
- The `/log` and `/recording` routes shall be removed from the router.
- The workspace view shall be the sole main content area.

### FR-002: Bottom Bar
- A persistent bottom bar shall be rendered at the bottom of the side panel.
- The bottom bar shall contain:
  - **Left side:** Log toggle button with icon and optional unread count badge.
  - **Right side:** Account avatar button (existing `AccountButton` component, relocated).
- The bottom bar shall have a subtle top border for visual separation.
- Height: compact, approximately 40px.

### FR-003: Log Console Panel
- Clicking the Log button in the bottom bar shall toggle a log console panel.
- The panel shall slide up from the bottom bar (above it), pushing or overlaying the workspace content.
- **Panel height:** Fixed at approximately 40% of the side panel height, with a drag handle for resizing.
- **Min height:** 150px. **Max height:** 70% of side panel.
- The panel shall display the same content as the current `RequestLogPage` — timestamped request entries with method, URL, status, mocked/real badge, and duration.
- The panel header shall include:
  - Title "Log" (left)
  - Pause/Resume button
  - Clear button
  - Close (X) button (right)
- When the panel is open, the workspace content area shall shrink to accommodate it.
- The log panel shall auto-scroll to the latest entry unless the user has scrolled up.
- Log listening shall be active whenever a tab has interception enabled, regardless of whether the panel is open.

### FR-004: Record Button in Workspace Toolbar
- A "Record" button shall be added to the `WorkspaceToolbar`, next to the existing "+ New Rule" button.
- Clicking "Record" shall open a dropdown/popover with:
  - Tab selector (choose which tab to record from)
  - "Start Recording" action button
- While recording is active:
  - The Record button shall show a pulsing red indicator and "Recording..." label.
  - A "Stop" button shall be available in the toolbar.
- When recording stops and entries are captured:
  - The existing save modal (from `RecordingPage`) shall appear, allowing the user to select entries and save as rules into a collection.
- The full RecordingPage component shall be deleted after this integration.

### FR-005: Record in Empty State
- The `WorkspaceEmptyState` shall include a secondary CTA: "Record API responses" alongside the existing "Create Rule" and "Create Collection" buttons.
- This CTA shall trigger the same recording flow as FR-004.

## 5. Non-Functional Requirements

### NFR-001: Performance
- The log panel rendering must handle 500+ entries without jank. Consider virtualized scrolling.
- Log panel open/close animation should be < 200ms.

### NFR-002: Accessibility
- Log panel toggle must be keyboard accessible (focusable, Enter/Space to toggle).
- Log panel must have `role="log"` and `aria-live="polite"` for screen readers.
- The resize handle must be operable via keyboard (arrow keys).
- Account popover anchor point must update to open upward from the new bottom-right position.

### NFR-003: State Persistence
- Log panel open/closed state and height should persist across side panel reopens (use `chrome.storage.session`).
- Log entries already persist via the existing log store.

## 6. Record Button Placement — Options Analysis

### Option A: Workspace Toolbar Button (RECOMMENDED)
**Placement:** Next to "+ New Rule" button in the toolbar.
**Pros:**
- Recording is a method of creating rules — toolbar is where rule-creation actions live.
- Always visible when the workspace has content.
- Consistent with the mental model: "I'm working in my workspace and want to record."
- Minimal UI disruption; the toolbar already has action buttons.

**Cons:**
- Toolbar is getting crowded (New Rule, New Collection, Import, Export, and now Record).
- Could group secondary actions (Import/Export/Record) into an overflow menu.

### Option B: Empty State CTA
**Placement:** Button in the empty workspace state.
**Pros:** Great for onboarding — "No rules yet? Record some!"
**Cons:** Only visible when workspace is empty. Not useful once you have rules.
**Verdict:** Good as a secondary placement, not a replacement.

### Option C: Floating Action Button (FAB)
**Placement:** Floating button in the bottom-right of the workspace area.
**Pros:** Always visible, prominent.
**Cons:** Conflicts with bottom bar, takes up content space, feels mobile-centric.
**Verdict:** Not recommended for a side panel.

### Option D: Context Menu on Collection
**Placement:** Right-click or "..." menu on a collection → "Record into this collection."
**Pros:** Very contextual — record directly into a specific collection.
**Cons:** Hidden; users won't discover it. Doesn't work for first-time users with no collections.
**Verdict:** Nice addition later, but not the primary placement.

### Final Recommendation
**Primary:** Option A — Toolbar button, with Import/Export grouped into an overflow "..." menu to prevent crowding.
**Secondary:** Option B — Empty state CTA for discoverability.
**Future:** Option D — Context menu on collections, as a follow-up enhancement.

## 7. Out of Scope

- Restyling the log entry cards (keep current design).
- Adding log filtering/search (future enhancement).
- Changing the recording logic or background service worker behavior.
- Keyboard shortcuts for log panel toggle (future enhancement, but we define the foundation).

## 8. Open Questions

- None at this time. All questions resolved in this document.
