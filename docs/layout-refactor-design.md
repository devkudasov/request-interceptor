# Layout Refactor — Design Specification

**Author:** Designer
**Date:** 2026-03-09
**Status:** Draft

---

## 1. Before / After Overview

### BEFORE — Current Layout
```
┌──────────────────────────────┐
│  [Workspace] [Log] [Record]  │  ← Top navigation tabs
├──────────────────────────────┤
│                              │
│                              │
│     Active page content      │
│     (one of three pages)     │
│                              │
│                              │
│                              │
├──────────────────────────────┤
│  (●) Account                 │  ← Bottom area (Account only)
└──────────────────────────────┘
```

### AFTER — New Layout
```
┌──────────────────────────────┐
│                              │
│                              │
│        Workspace View        │
│    (toolbar, collections,    │
│     rules, empty state)      │
│                              │
│                              │
├──────────────────────────────┤  ← Resize handle (when log open)
│  Log   ══════════════════ ✕  │  ← Log panel header
│  10:31:02 GET /api/users 200 │
│  10:31:03 POST /api/data 201 │
│  10:31:05 GET /api/list  304 │
├──────────────────────────────┤
│  📋 Log (3)          (●) Acc │  ← Bottom bar
└──────────────────────────────┘
```

## 2. Bottom Bar Design

### Layout
```
┌──────────────────────────────────┐
│  📋 Log (3)              (●)    │
│  ↑                        ↑     │
│  Log toggle button    Account   │
│  with unread badge    avatar    │
└──────────────────────────────────┘
   Height: 40px
   Border-top: 1px solid border-primary
   Background: surface-primary
   Padding: 0 12px (px-md)
```

### Log Toggle Button (Left)
- **Idle state:** Terminal/console icon + "Log" label, muted text color.
- **With new entries (panel closed):** Badge with count of entries since panel was last open. Badge uses `bg-primary` with white text, pill shape, max display "99+".
- **Panel open:** Icon and label use `text-primary` color to indicate active state. No badge.
- **Hover:** `bg-surface-secondary` background.
- **Active/pressed:** `bg-surface-tertiary`.

### Account Button (Right)
- Identical to current `AccountButton` component behavior and styling.
- **Popover direction change:** Since the button is now at the very bottom, the `AccountPopover` / `LoginPopover` must open **upward** (already does — `bottom-full` positioning). No change needed.

## 3. Log Console Panel

### Structure
```
┌──────────────────────────────────┐
│ ═══════════════════════════════  │  ← Resize handle (6px, cursor: row-resize)
├──────────────────────────────────┤
│  Log          [⏸ Pause] [Clear] [✕] │  ← Panel header (32px)
├──────────────────────────────────┤
│                                  │
│  10:31:02  GET   /api/users  200 │  ← Scrollable log entries
│            MOCKED     12ms       │
│                                  │
│  10:31:03  POST  /api/data   201 │
│            REAL       45ms       │
│                                  │
│  (auto-scrolls to bottom)        │
│                                  │
└──────────────────────────────────┘
```

### Dimensions
- **Default height:** 40% of the side panel viewport height.
- **Minimum height:** 150px.
- **Maximum height:** 70% of the side panel viewport height.
- **Width:** 100% of the side panel.

### Resize Handle
- **Visual:** A centered horizontal line (3px wide, 40px long) in `border-secondary` color, centered in a 6px tall strip.
- **Cursor:** `row-resize` on hover.
- **Behavior:** Click and drag to resize the panel. The workspace content above shrinks/grows accordingly.
- **Keyboard:** When focused, Up/Down arrow keys adjust height by 20px increments.
- **Accessibility:** `role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow` set to current height percentage.

### Panel Header
- **Left:** "Log" label in `text-base font-semibold`.
- **Right actions (flex row, gap-xs):**
  - Pause/Resume button — `variant="ghost" size="sm"`. Icon toggles between pause (⏸) and play (▶). Label toggles "Pause" / "Resume".
  - Clear button — `variant="ghost" size="sm"`, "Clear" label. Shows confirm dialog before clearing.
  - Close button — `variant="ghost" size="sm"`, "✕" icon only. Closes the panel.

### Log Entry Cards
- Keep current design from `RequestLogPage` — no changes to individual entry styling.
- Entries are rendered in a scrollable container with `overflow-y: auto`.

### Empty State (No Log Entries)
```
┌──────────────────────────────────┐
│  Log          [⏸ Pause] [Clear] [✕] │
├──────────────────────────────────┤
│                                  │
│    No requests captured.         │
│    Enable interception on a      │
│    tab to start logging.         │
│                                  │
└──────────────────────────────────┘
```

### Slide-Up Animation
- **Open:** Panel slides up from behind the bottom bar. Duration: 150ms, easing: `ease-out`. Workspace content smoothly shrinks.
- **Close:** Panel slides down. Duration: 150ms, easing: `ease-in`. Workspace content smoothly expands.
- **CSS:** Use `transition: height 150ms ease` on the panel container. No transform-based animation — the panel height animates from 0 to target height.

## 4. Record Button Integration

### Toolbar Placement
```
BEFORE toolbar:
┌────────────────────────────────────┐
│  [Filter by URL...]  [All Methods] │
│  [+ New Rule] [+ New Collection]  [Import] [Export] │
└────────────────────────────────────┘

AFTER toolbar:
┌────────────────────────────────────┐
│  [Filter by URL...]  [All Methods] │
│  [+ New Rule] [● Record] [+ Collection]  [···] │
└────────────────────────────────────┘
```

### Record Button States

#### Idle
- Label: "Record"
- Icon: Circle (●) in `text-content-secondary`.
- Variant: `secondary`.
- Size: `sm`.

#### Click → Recording Popover
When clicked in idle state, a popover appears below the button:
```
┌────────────────────────────┐
│  Record API Responses      │
│                            │
│  Tab: [  Select a tab  ▾]  │
│                            │
│  [Start Recording]         │
└────────────────────────────┘
```
- Tab selector shows available browser tabs (same as current RecordingPage).
- "Start Recording" is primary button, disabled until a tab is selected.

#### Recording Active
- The Record button transforms in the toolbar:
  - Label: "Recording..."
  - Icon: Pulsing red circle (●) with `animate-pulse`.
  - Background: `bg-status-error/10` (subtle red tint).
  - Text: `text-status-error`.
- A "Stop" button appears next to it (variant: `danger`, size: `sm`).
- Toolbar layout during recording:
```
┌────────────────────────────────────┐
│  [Filter by URL...]  [All Methods] │
│  [● Recording...]  [Stop]    [···] │
└────────────────────────────────────┘
```
- Other toolbar actions (New Rule, New Collection) are hidden during recording to reduce noise.

#### After Recording Stops
- The save modal appears (reused from current `RecordingPage`):
  - Collection name input.
  - Checkbox list of captured responses.
  - Save / Cancel buttons.
- After saving or canceling, the toolbar returns to idle state.

### Overflow Menu (···)
Groups secondary actions:
```
┌──────────────────┐
│  + New Collection │
│  Import           │
│  Export           │
└──────────────────┘
```

### Empty State CTA
```
┌──────────────────────────────────┐
│                                  │
│      No mock rules yet.          │
│                                  │
│  Create your first rule or       │
│  record real API responses.      │
│                                  │
│  [Create Rule]  [Record]         │
│  [Create Collection]             │
│                                  │
└──────────────────────────────────┘
```

## 5. Interaction Specifications

### Log Panel Toggle
| Action | Result |
|--------|--------|
| Click "Log" button (panel closed) | Panel slides up to last-known height (or default 40%) |
| Click "Log" button (panel open) | Panel slides down and closes |
| Click "✕" in panel header | Panel slides down and closes |
| Press Escape while panel is focused | Panel closes |
| Resize via drag handle | Panel height adjusts, persisted to storage |

### Recording Flow
| Action | Result |
|--------|--------|
| Click "Record" (idle) | Popover opens with tab selector |
| Select tab + click "Start Recording" | Recording begins, popover closes, button changes to recording state |
| Click "Stop" | Recording stops, save modal opens if entries captured |
| Save in modal | Rules created in collection, modal closes, toolbar returns to idle |
| Cancel in modal | Modal closes, recorded entries discarded, toolbar returns to idle |

### Keyboard Navigation
- **Tab order:** Workspace content → Bottom bar (Log button → Account button).
- **Log panel (when open):** Tab order inserts between workspace and bottom bar: Workspace → Log panel header actions → Log entries → Bottom bar.
- **Record popover:** Standard popover trap — Tab cycles within popover, Escape closes.

## 6. Accessibility

### ARIA Roles and Attributes
| Element | Role/Attribute |
|---------|---------------|
| Bottom bar | `role="toolbar"`, `aria-label="Status bar"` |
| Log toggle button | `aria-expanded="true/false"`, `aria-controls="log-panel"` |
| Log panel | `role="log"`, `aria-live="polite"`, `id="log-panel"`, `aria-label="Request log"` |
| Resize handle | `role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Record popover | `role="dialog"`, `aria-label="Record API responses"` |

### Screen Reader Announcements
- When log panel opens: "Request log panel opened."
- When log panel closes: "Request log panel closed."
- New log entry (panel open): Entry content announced via `aria-live`.
- Recording starts: "Recording started on [tab name]."
- Recording stops: "Recording stopped. [N] responses captured."

## 7. Side Panel Viewport Considerations

The side panel is 320px wide and full browser height. All designs are optimized for this:

- **Bottom bar:** Fixed 40px, never scrolls.
- **Log panel:** Percentage-based height, respects min/max bounds.
- **Workspace:** Takes remaining space, scrolls independently.
- **Full layout formula:** `workspace height = 100vh - bottom bar (40px) - log panel (0 or variable)`.
- **Narrow content:** All content adapts to 320px. Log entries use `truncate` on URLs. The overflow menu (···) consolidates toolbar actions to prevent wrapping.
