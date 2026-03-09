# Layout Refactor — Technical Architecture

**Author:** System Architect
**Date:** 2026-03-09
**Status:** Draft

---

## 1. Component Breakdown

### New Components

| Component | Path | Description |
|-----------|------|-------------|
| `BottomBar` | `sidepanel/components/BottomBar.tsx` | Persistent bottom bar with Log toggle (left) and Account button (right) |
| `LogPanel` | `sidepanel/components/log/LogPanel.tsx` | Slide-up log console panel with header, resize handle, and scrollable entries |
| `LogPanelHeader` | `sidepanel/components/log/LogPanelHeader.tsx` | Panel header with title, Pause/Resume, Clear, Close buttons |
| `ResizeHandle` | `sidepanel/components/log/ResizeHandle.tsx` | Draggable + keyboard-accessible resize handle for log panel |
| `LogEntryList` | `sidepanel/components/log/LogEntryList.tsx` | Scrollable list of log entries (extracted from RequestLogPage) |
| `RecordButton` | `sidepanel/components/workspace/RecordButton.tsx` | Toolbar record button with popover for tab selection, recording state |
| `RecordPopover` | `sidepanel/components/workspace/RecordPopover.tsx` | Popover for choosing tab and starting recording |
| `ToolbarOverflowMenu` | `sidepanel/components/workspace/ToolbarOverflowMenu.tsx` | "..." menu grouping New Collection, Import, Export |
| `useLogPanel` | `sidepanel/hooks/useLogPanel.ts` | Hook managing log panel open/closed state, height, and persistence |
| `useResizable` | `sidepanel/hooks/useResizable.ts` | Generic hook for drag-to-resize behavior |

### Modified Components

| Component | Changes |
|-----------|---------|
| `SidePanel.tsx` | Remove `<Navigation />`, remove `/log` and `/recording` routes, add `<BottomBar />` and `<LogPanel />`, restructure layout to flex column with workspace + log panel + bottom bar |
| `WorkspaceToolbar.tsx` | Add `RecordButton`, replace New Collection / Import / Export buttons with `ToolbarOverflowMenu` |
| `WorkspaceEmptyState.tsx` | Add "Record" CTA button |
| `WorkspacePage.tsx` | Pass recording-related handlers to toolbar and empty state |
| `AccountButton.tsx` | No structural changes — relocated into `BottomBar` via composition |

### Deleted Components

| Component | Reason |
|-----------|--------|
| `Navigation.tsx` | Top tabs removed entirely |
| `RecordingPage.tsx` | Recording flow integrated into workspace toolbar |
| `RequestLogPage.tsx` | Log content moved into `LogPanel` / `LogEntryList` |

### Deleted Routes

| Route | Replacement |
|-------|-------------|
| `/log` | `LogPanel` (bottom panel, toggled from `BottomBar`) |
| `/recording` | `RecordButton` popover in `WorkspaceToolbar` |

## 2. State Management

### New Store: `useLogPanelStore`

```typescript
// In shared/store.ts or sidepanel/hooks/useLogPanel.ts
interface LogPanelState {
  isOpen: boolean;
  panelHeight: number;       // in pixels
  unseenCount: number;       // entries added while panel is closed
  toggle: () => void;
  open: () => void;
  close: () => void;
  setPanelHeight: (h: number) => void;
  resetUnseenCount: () => void;
  incrementUnseenCount: () => void;
}
```

**Persistence:** `isOpen` and `panelHeight` persisted to `chrome.storage.session` so they survive side panel close/reopen within the same browser session, but reset between browser restarts.

### Modified Store: `useLogStore`

Add integration with `useLogPanelStore`:
- When a new log entry arrives and the panel is closed, call `logPanelStore.incrementUnseenCount()`.
- When the panel opens, call `logPanelStore.resetUnseenCount()`.

### Modified Store: `useRecordingStore`

No structural changes. The store already manages `isRecording`, `recordedEntries`, `startRecording`, `stopRecording`. The `RecordButton` component will consume this store directly, same as `RecordingPage` did.

### Removed State

- Navigation active tab state (implicit via route — no longer needed).

## 3. Routing Changes

### Before
```
/           → WorkspacePage
/rules/new  → RuleEditorPage
/rules/:id/edit → RuleEditorPage
/collections/:id/versions → VersionHistoryPage
/log        → RequestLogPage
/recording  → RecordingPage
```

### After
```
/           → WorkspacePage
/rules/new  → RuleEditorPage
/rules/:id/edit → RuleEditorPage
/collections/:id/versions → VersionHistoryPage
```

Routes `/log` and `/recording` are removed. Their functionality is now available as:
- Log → `LogPanel` component (always mounted, visibility toggled).
- Recording → `RecordButton` popover in toolbar.

## 4. Layout Architecture

### SidePanel Component Tree

```
<SidePanel>
  <ThemeProvider>
    <MemoryRouter>
      <div className="h-screen flex flex-col">

        {/* Main content — takes remaining space */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <Routes>
            <Route path="/" element={<WorkspacePage />} />
            <Route path="/rules/new" element={<RuleEditorPage />} />
            <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
            <Route path="/collections/:id/versions" element={<VersionHistoryPage />} />
          </Routes>
        </main>

        {/* Log panel — conditionally rendered, variable height */}
        <LogPanel />

        {/* Bottom bar — always visible, fixed 40px */}
        <BottomBar />

      </div>
    </MemoryRouter>
  </ThemeProvider>
</SidePanel>
```

### Layout Behavior

```
┌────────────────────┐
│                    │ ← flex-1, overflow-y-auto, min-h-0
│   <main> Routes    │    Shrinks when LogPanel opens
│                    │
├────────────────────┤ ← LogPanel: height from store, transition on height
│   <LogPanel>       │    0px when closed, variable when open
│                    │
├────────────────────┤
│   <BottomBar>      │ ← h-10 (40px), flex-shrink-0
└────────────────────┘
```

The key CSS technique: the outer container is `h-screen flex flex-col`. The `<main>` has `flex-1` and `min-h-0` (critical for flex shrinking). `LogPanel` has an explicit pixel height that transitions. `BottomBar` has `flex-shrink-0`.

## 5. Data Flow Diagrams

### Log Panel Data Flow
```
Background Service Worker
        │
        │ chrome.runtime.sendMessage({ type: LOG_ENTRY, payload })
        ▼
useLogStore.startListening()
        │
        │ addEntry(payload)
        ▼
useLogStore.entries[]  ──────►  LogEntryList (renders entries)
        │
        │ if panel closed
        ▼
useLogPanelStore.incrementUnseenCount()
        │
        ▼
BottomBar → Log button badge shows count
```

### Recording Data Flow
```
User clicks "Record" in WorkspaceToolbar
        │
        ▼
RecordPopover opens (tab selector)
        │
        │ User selects tab, clicks "Start Recording"
        ▼
useRecordingStore.startRecording(tabId)
        │
        │ sends message to background worker
        ▼
Background intercepts requests, sends recorded entries back
        │
        ▼
User clicks "Stop" in toolbar
        │
        ▼
useRecordingStore.stopRecording()
        │
        │ returns recordedEntries[]
        ▼
Save Modal opens (RecordPopover manages this)
        │
        ▼
User selects entries, names collection
        │
        ▼
useCollectionsStore.createCollection() + useRulesStore.createRule() (per entry)
        │
        ▼
Workspace shows new collection + rules
```

## 6. Implementation Notes

### LogPanel Resize
- Use `onPointerDown` on the resize handle to capture pointer.
- Track `pointermove` events to calculate delta and update `panelHeight` in store.
- On `pointerup`, persist height to `chrome.storage.session`.
- Clamp between 150px and `window.innerHeight * 0.7`.

### Log Panel Performance
- For 500+ entries, use `overflow-y: auto` with CSS `contain: content` on the scroll container to optimize paint.
- Virtualization (e.g., `react-window`) is a future enhancement — not required for MVP since most sessions won't exceed a few hundred entries.

### Animation
- Use CSS `transition: height 150ms ease` on the `LogPanel` wrapper.
- On open: set height from 0 to stored value.
- On close: set height from current to 0.
- Use `overflow: hidden` during animation to prevent content flash.

### AccountPopover Position
- Already opens upward (`bottom-full` class). No changes needed since `AccountButton` remains in the bottom bar area.

## 7. File Changes Summary

### New Files
```
sidepanel/components/BottomBar.tsx
sidepanel/components/log/LogPanel.tsx
sidepanel/components/log/LogPanelHeader.tsx
sidepanel/components/log/LogEntryList.tsx
sidepanel/components/log/ResizeHandle.tsx
sidepanel/components/workspace/RecordButton.tsx
sidepanel/components/workspace/RecordPopover.tsx
sidepanel/components/workspace/ToolbarOverflowMenu.tsx
sidepanel/hooks/useLogPanel.ts
sidepanel/hooks/useResizable.ts
```

### Modified Files
```
sidepanel/SidePanel.tsx              — Layout restructure
sidepanel/components/workspace/WorkspaceToolbar.tsx  — Add RecordButton, overflow menu
sidepanel/components/workspace/WorkspaceEmptyState.tsx — Add Record CTA
sidepanel/pages/WorkspacePage.tsx     — Wire up recording handlers
shared/store.ts                       — Add useLogPanelStore
```

### Deleted Files
```
sidepanel/components/Navigation.tsx
sidepanel/pages/RequestLogPage.tsx
sidepanel/pages/RecordingPage.tsx
```

## 8. Task Breakdown

Tasks are ordered by dependency. Each pair follows TDD: QA writes tests first, then developer implements.

| # | Task | Agent | Depends On |
|---|------|-------|------------|
| 1 | BottomBar + LogPanel components (QA tests) | @qa-engineer | — |
| 2 | BottomBar + LogPanel components (implementation) | @react-developer | 1 |
| 3 | RecordButton + RecordPopover + ToolbarOverflowMenu (QA tests) | @qa-engineer | — |
| 4 | RecordButton + RecordPopover + ToolbarOverflowMenu (implementation) | @react-developer | 3 |
| 5 | SidePanel layout restructure + remove Navigation + update routes (QA tests) | @qa-engineer | 2, 4 |
| 6 | SidePanel layout restructure + remove Navigation + update routes (implementation) | @react-developer | 5 |
| 7 | Delete RequestLogPage, RecordingPage, Navigation; cleanup dead code (QA tests) | @qa-engineer | 6 |
| 8 | Delete RequestLogPage, RecordingPage, Navigation; cleanup dead code (implementation) | @react-developer | 7 |

Tasks 1-2 and 3-4 can be developed in parallel since they are independent component groups.
