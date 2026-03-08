# UX Improvements Design Document -- Request Interceptor

**Document ID:** DES-UX-001
**Date:** 2026-03-08
**Author:** Designer Agent
**Requirements:** PRD-UX-001
**Status:** Ready for Architect Review

---

## Design Token Reference

All specs in this document use the project's existing Tailwind token system defined in `tailwind.config.ts`:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight inner spacing, badge padding |
| `sm` | 8px | Gap between inline elements, small padding |
| `md` | 12px | Standard padding, card padding, nav padding |
| `lg` | 16px | Section spacing, modal padding |
| `xl` | 24px | Large section gaps |
| `2xl` | 32px | Page-level vertical spacing |
| `text-xs` | 10px/14px | Badges, counters |
| `text-sm` | 11px/16px | Labels, secondary text |
| `text-base` | 13px/20px | Body text, inputs |
| `text-lg` | 14px/20px | Section headings |
| `text-xl` | 16px/24px | Page titles |

Colors use CSS custom properties via `ThemeProvider`:
- Surfaces: `surface-primary`, `surface-secondary`, `surface-card`
- Text: `content-primary`, `content-secondary`, `content-muted`
- Accents: `primary`, `primary-hover`
- Status: `status-success`, `status-warning`, `status-error`, `status-info`
- Borders: `border`
- Methods: `method-get`, `method-post`, `method-put`, `method-delete`, `method-patch`

Existing reusable components: `Button`, `Input`, `Select`, `Badge`, `Modal`, `Toggle`, `Spinner`.

---

## Current vs Proposed Navigation

### Current (6 tabs)

```
+------------------------------------------------------------+
| Rules | Collections | Log | Record | Team | Account        |
+------------------------------------------------------------+
|                                                            |
|                    Page content                            |
|                                                            |
+------------------------------------------------------------+
```

### Proposed (3 tabs + bottom avatar)

```
+--------------------------------------------+
| Workspace  |  Log  |  Record               |
+--------------------------------------------+
|                                            |
|           Page content                     |
|           (scrollable)                     |
|                                            |
+--------------------------------------------+
| (JD) John Doe                     [Pro]    |  <- bottom bar
+--------------------------------------------+
```

Rationale: Reduces cognitive load from 6 tabs to 3. Account becomes ambient (always reachable, never blocking workflow). Rules + Collections + Team are unified into one workspace view where they naturally belong together.

---

## 1. UX-001: Unified Workspace Tab

### 1.1 Full Workspace Layout

```
+--------------------------------------------+
| Workspace  |  Log  |  Record               |  <- Navigation
+--------------------------------------------+
| (HTTP 12) (WebSocket 3) (GraphQL 5)        |  <- UX-004 sub-tabs
+--------------------------------------------+
| [i] Team: Acme Corp          [3 members >] |  <- team header
+--------------------------------------------+
| [Filter by URL...________] [All Methods v] |  <- filter row
| [+ New Rule] [+ Collection] [Import] [Exp] |  <- actions row
| Sync: Auto v  Last synced: 2m ago  [Sync]  |  <- sync controls
+--------------------------------------------+
|                                            |
| v My API Mocks           (12)  [ON]  ...   |  <- collection group
| +------------------------------------------+
| |  [x] GET  /api/users*       200 JSON     |  <- RuleCard
| |       wildcard  12ms          [Edit][Del] |
| +------------------------------------------+
| |  [x] POST /api/users        201 JSON     |
| |       wildcard                [Edit][Del] |
| +------------------------------------------+
|                                            |
| > Payment Stubs           (3)  [ON]  ...   |  <- collapsed
|                                            |
|   > Stripe (nested)       (2)  [ON]  ...   |  <- child collection
|                                            |
| v Ungrouped               (2)              |  <- ungrouped rules
| +------------------------------------------+
| |  [ ] DELETE /api/old*       404 JSON     |
| |       regex                  [Edit][Del] |
| +------------------------------------------+
|                                            |
+--------------------------------------------+
| (JD) John Doe                     [Pro]    |  <- UX-002 bottom bar
+--------------------------------------------+
```

### 1.2 Team Header

Only renders when user is authenticated AND belongs to a team. Hidden entirely otherwise.

#### Populated State

```
+--------------------------------------------+
| [team-icon] Acme Corp        [3 members >] |
+--------------------------------------------+
```

- Height: 36px (`py-sm` + `text-base` line height)
- Background: `surface-secondary`
- Layout: `flex items-center gap-sm px-md py-sm`
- Left icon: 16x16 SVG team icon, `content-secondary`
- Team name: `text-base font-semibold content-primary`, truncate at max-width 200px
- Member count: `Badge` component, variant `default`, right-aligned
- Chevron: 12x12 `>` icon, `content-muted`, rotates to `v` when expanded
- Bottom border: 1px `border`
- Cursor: `pointer`
- Hover: background transitions to `surface-card`

#### Team Panel (expanded on click)

```
+--------------------------------------------+
| [team-icon] Acme Corp        [3 members v] |
+--------------------------------------------+
| Members:                                    |
|  (JD) john@acme.com           Admin         |
|  (AS) alice@acme.com  Member      [Remove]  |
|  (BT) bob@acme.com    Member      [Remove]  |
|                                             |
| Invite:                                     |
| [email@example.com________] [Send Invite]   |
|                                             |
| Pending Invites:                            |
|  new@acme.com                    [Cancel]   |
+--------------------------------------------+
```

- Panel background: `surface-card`
- Border: 1px `border`, `rounded-md` bottom corners
- Padding: `p-md`
- Member rows: `flex items-center gap-sm`, height 32px each
- Avatar circles: 24x24 `rounded-full`, `bg-primary text-white text-xs font-semibold`
- Reuse `getInitials` logic from `AccountPage.tsx`
- "Remove" button: `Button` variant="ghost" size="sm", only visible for admin users
- Invite input: `Input` component, no label
- "Send Invite" button: `Button` variant="primary" size="sm"
- Max height: 300px with `overflow-y-auto` for many members
- Animation: `max-height` transition, 150ms ease-out (see Animations section)

#### Pending Invite Banner (renders ABOVE team header when user has pending invite)

```
+--------------------------------------------+
| [info] You have a pending team invite       |
|                         [Accept] [Decline]  |
+--------------------------------------------+
```

- Background: `status-info/10`
- Border: 1px `status-info/30`, `rounded-md`
- Padding: `px-md py-sm`
- Text: `text-sm content-primary`
- Accept: `Button` variant="primary" size="sm"
- Decline: `Button` variant="ghost" size="sm"

#### Hidden State (not authenticated or no team)

No element rendered at all. No placeholder, no empty space.

### 1.3 Toolbar

Three rows: filters, actions, sync controls.

#### Filter Row

```
+--------------------------------------------+
| [Filter by URL..._____________] [Methods v] |
+--------------------------------------------+
```

- Reuse existing `Input` and `Select` components from current `RulesPage`
- `Input`: `flex-1`, placeholder "Filter by URL..."
- `Select`: method filter dropdown, same `METHOD_OPTIONS` array, min-width 120px
- Gap: `sm` (8px)
- Only rendered when `rules.length > 0`

#### Actions Row

```
+--------------------------------------------+
| [+ New Rule]  [+ Collection]  [Import] [Export] |
+--------------------------------------------+
```

- `+ New Rule`: `Button` variant="primary" size="sm" -- navigates to `/rules/new`
- `+ Collection`: `Button` variant="secondary" size="sm" -- opens `Modal` for new collection
- Import: `Button` variant="ghost" size="sm"
- Export: `Button` variant="ghost" size="sm"
- Layout: `flex flex-wrap gap-sm`
- At narrow widths (< 400px), wraps to two rows naturally

#### Sync Controls Row

```
+--------------------------------------------+
| Sync: [Auto v]  Last: 2m ago     [Sync Now] |
+--------------------------------------------+
```

- Reuse existing `SyncControls` component
- Only visible when user is authenticated
- Separator from actions: 1px `border-t`, `mt-sm pt-sm`

### 1.4 Collection Groups

#### Collapsed Collection

```
+--------------------------------------------+
| >  My API Mocks           (12) [ON]   ...  |
+--------------------------------------------+
```

- Full-width row, height: 36px
- Layout: `flex items-center gap-sm px-md py-sm`
- Chevron: `>` character or 12x12 SVG, `content-secondary`, rotates 90deg on expand
- Collection name: `text-base font-medium content-primary`, `truncate`, `flex-1`
- Rule count: `Badge` variant="default" -- shows "(12)"
- Toggle: `Toggle` component, inline -- click stops propagation (does not expand)
- Context menu trigger: `...` button, 24x24 hit area, `content-muted`
- Hover: background `surface-secondary`
- Click (on row, not toggle): toggle expand/collapse
- Bottom border: 1px `border`

#### Expanded Collection

```
+--------------------------------------------+
| v  My API Mocks           (12) [ON]   ...  |
+--------------------------------------------+
|   +----------------------------------------+
|   | [x] GET  /api/users*     200 JSON  ... |
|   |     wildcard  12ms         [Edit][Del] |
|   +----------------------------------------+
|   +----------------------------------------+
|   | [x] POST /api/users      201 JSON  ... |
|   |     wildcard               [Edit][Del] |
|   +----------------------------------------+
```

- Rules indented with `pl-lg` (16px) from the collection row
- Rules rendered using existing `RuleCard` component
- Gap between cards: `sm` (8px)
- Bottom padding below last card: `pb-sm`

#### Nested Collection (child via parentId)

```
+--------------------------------------------+
| v  Payment Stubs           (5)  [ON]  ...  |
+--------------------------------------------+
|   > Stripe                 (2)  [ON]  ...  |
|   +----------------------------------------+
|   | [x] POST /api/charge     200 JSON  ... |
|   +----------------------------------------+
```

- Child collection row indented `pl-xl` (24px)
- Rules within child indented `pl-2xl` (32px)
- Visual hierarchy through indentation only, no connector lines
- Max supported nesting: 2 levels (parent > child)

#### Empty Collection (expanded)

```
+--------------------------------------------+
| v  Empty Collection        (0)  [--]  ...  |
+--------------------------------------------+
|     No rules in this collection.            |
|     [+ Add Rule]                            |
+--------------------------------------------+
```

- Message: `text-sm content-muted`, `pl-lg`
- `+ Add Rule`: `Button` variant="ghost" size="sm"
- Toggle shows off state

#### Collection Context Menu

```
                            +------------------+
                            | Export Collection |
                            | Version History  |
                            |------------------|
                            | Delete           |
                            +------------------+
```

- Popover anchored to `...` button, opens downward
- If near bottom edge, flips upward
- Background: `surface-card`
- Border: 1px `border`, `rounded-md`
- Shadow: `shadow-lg`
- Items: `text-sm content-primary`, `px-md py-sm`
- Item hover: `surface-secondary`
- Delete item: `text-status-error`
- Separator: 1px `border-t`
- Dismiss: click outside, Escape, or selecting an item

### 1.5 Ungrouped Section

```
+--------------------------------------------+
| v  Ungrouped               (2)             |
+--------------------------------------------+
|   +----------------------------------------+
|   | [ ] DELETE /api/old*    404 JSON   ...  |
|   |     regex                [Edit][Del]   |
|   +----------------------------------------+
```

- Identical styling to collection group EXCEPT:
  - No toggle (ungrouped rules are always individually controlled)
  - No context menu
  - Name is always "Ungrouped"
  - Only rendered when there are rules with `collectionId === null`

### 1.6 Empty State (no rules, no collections)

```
+--------------------------------------------+
|                                            |
|           [clipboard-icon]                 |
|              48x48                         |
|                                            |
|          No mock rules yet.                |
|                                            |
|      Create your first rule or             |
|      organize with collections.            |
|                                            |
|    [+ Create Rule]  [+ Create Collection]  |
|                                            |
+--------------------------------------------+
```

- Centered vertically and horizontally in scrollable area
- Icon: 48x48 SVG, `content-muted`
- Heading: `text-base font-semibold content-primary`
- Subtext: `text-sm content-secondary`, max-width 240px, `text-center`
- Buttons: `flex gap-sm justify-center`
- `Create Rule`: `Button` variant="primary"
- `Create Collection`: `Button` variant="secondary"

### 1.7 Loading State

```
+--------------------------------------------+
|                                            |
|              [Spinner]                     |
|                                            |
+--------------------------------------------+
```

- Reuse existing `Spinner` component
- Centered with `flex items-center justify-center py-2xl`
- Toolbar still renders above (not skeleton)
- Same pattern as current `RulesPage` loading

### 1.8 Error State

```
+--------------------------------------------+
|                                            |
|   [!] Failed to load rules.               |
|       [Retry]                              |
|                                            |
+--------------------------------------------+
```

- Layout: centered, `py-xl`
- Error icon: `status-error`, 20x20
- Message: `text-base content-primary`
- Retry: `Button` variant="secondary" size="sm"

---

## 2. UX-002: Account as Bottom Icon

### 2.1 Side Panel Layout Change

`SidePanel.tsx` changes from two-section to three-section flex column:

```
+--------------------------------------------+
| Navigation (sticky top)                     |
+--------------------------------------------+
|                                            |
| Main content (flex-1, overflow-y-auto)     |
|                                            |
+--------------------------------------------+
| Bottom bar (sticky bottom)                  |
+--------------------------------------------+
```

CSS structure:
```
div.min-h-screen.flex.flex-col
  nav          -- sticky top
  main.flex-1.overflow-y-auto.p-md  -- scrollable
  footer       -- sticky bottom, border-t
```

### 2.2 Bottom Bar

#### Authenticated

```
+--------------------------------------------+
| (JD)  John Doe                     [Pro]   |
+--------------------------------------------+
```

- Height: 44px
- Background: `surface-primary`
- Border-top: 1px `border`
- Padding: `px-md py-sm`
- Layout: `flex items-center gap-sm`
- Cursor: `pointer` on entire bar
- Hover: background `surface-secondary`, 150ms transition

Elements:
- Avatar: 32x32 `rounded-full`
  - With photo: `object-cover`, `border-2 border-border`
  - Without photo: `bg-primary text-white text-sm font-semibold`, shows initials via `getInitials()`
- Name: `text-sm content-primary truncate flex-1`
- Plan badge: `Badge` component (variant per plan: free=default, pro=success, team=info)

#### Not Authenticated

```
+--------------------------------------------+
| [user-icon]  Sign in                        |
+--------------------------------------------+
```

- Avatar: 32x32 `rounded-full bg-surface-secondary`
- Icon: generic user outline SVG, 16x16, `content-muted`
- Text: "Sign in", `text-sm content-secondary`
- No plan badge

#### Loading (fetchUser in progress)

```
+--------------------------------------------+
| [pulse]  ...                                |
+--------------------------------------------+
```

- Avatar circle: 32x32, `bg-surface-secondary`, `animate-pulse`
- No text shown during load

### 2.3 Account Popover -- Authenticated

Opens upward from the bottom bar.

```
+--------------------------------------------+
|                                    [x]     |
|  +------+  John Doe                        |
|  | (JD) |  john@acme.com          [Pro]    |
|  +------+                                  |
|                                            |
|  [!] Email not verified.      (if needed)  |
|                                            |
|  Storage                                   |
|  [=========>-----------] 12 MB / 50 MB     |
|                                            |
|  [      Upgrade Plan      ]   (if free)    |
|  [        Logout          ]                |
+--------------------------------------------+
| (JD) John Doe                     [Pro]    |
+--------------------------------------------+
```

Popover specs:
- Position: fixed, anchored above the bottom bar
- Bottom offset: 44px (bottom bar height) + 8px gap
- Width: `min(calc(100% - 24px), 360px)` -- full panel width minus `md` padding on each side, capped at 360px
- Max-height: `calc(100vh - 100px)` with `overflow-y-auto`
- Background: `surface-card`
- Border: 1px `border`
- Border-radius: `rounded-lg` (8px)
- Shadow: `shadow-lg`
- Padding: `p-lg` (16px)

Content (reuses AccountPage elements):
- Profile section: same layout as current AccountPage header
  - Avatar: 48x48 `rounded-full` (same as current `w-12 h-12`)
  - Name: `text-lg font-semibold content-primary truncate`
  - Email: `text-sm content-secondary truncate`
  - Badge: same `Badge` component with plan-specific variant
- Email warning: same as current (conditional, `status-warning/10` background)
- Storage bar: reuse `StorageBar` component
- Buttons: reuse `Button` component, `fullWidth`
  - Upgrade: variant="secondary" (conditional on free plan)
  - Logout: variant="danger"
- Gap between sections: `lg` (16px)
- Close button: top-right, `content-muted hover:content-primary`, 24x24 hit area

### 2.4 Account Popover -- Not Authenticated

```
+--------------------------------------------+
|                                    [x]     |
|                                            |
|  Sign in to sync your rules               |
|  and collaborate with your team.           |
|                                            |
|  [  Sign in with Google  ]                 |
|                                            |
|  --------- or ---------                   |
|                                            |
|  Email                                     |
|  [email@example.com__________]             |
|  Password                                  |
|  [________________________]                |
|                                            |
|  [       Sign In         ]                 |
|                                            |
|  Don't have an account? [Sign Up]          |
+--------------------------------------------+
| [user-icon]  Sign in                        |
+--------------------------------------------+
```

- Reuse existing `AuthForm` component inside the popover
- Same popover dimensions and styling as authenticated state

### 2.5 Dismiss Behavior

- Click outside popover: closes
- Press Escape: closes
- Click bottom bar again: toggles (closes if open)
- Navigate to another page: closes
- Auth state changes (login/logout): popover closes, avatar updates reactively

---

## 3. UX-003: Postman-style URL Bar (RequestMatchInput)

### 3.1 HTTP Mode -- Composite Input

```
+--------+-------------------------------+-----------+
| GET  v | https://api.example.com/users* | wildcard v|
+--------+-------------------------------+-----------+
   80px         flex-1 (remaining)            100px
```

- Total height: 36px (consistent with existing Input: `py-sm` + `text-base`)
- Shared outer border: 1px `border`, `rounded-md`
- No gaps between segments -- internal borders only
- Background: `surface-secondary` for all three segments

### 3.2 Segment Specifications

**Method Dropdown (left):**
- Min-width: 80px
- Text: `text-base font-semibold`, color from `methodColors` token for selected method
  - GET: green (#10B981)
  - POST: blue (#3B82F6)
  - PUT: amber (#F59E0B)
  - DELETE: red (#EF4444)
  - PATCH: purple (#8B5CF6)
  - ANY/HEAD/OPTIONS: `content-secondary`
- Background: `surface-secondary`
- Padding: `px-sm py-sm`
- Right divider: 1px `border` (internal)
- Border-radius: `rounded-l-md` (left corners only)
- Dropdown arrow: 8x8 chevron, `content-muted`, right side
- Implementation: native `<select>` element or custom dropdown
- Options: ANY, GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

**URL Pattern Input (center):**
- Flex: `flex-1` (takes all remaining horizontal space)
- Font: `font-mono text-base content-primary`
- Placeholder: "Enter URL pattern..." in `content-muted`
- Background: `surface-secondary`
- Padding: `px-md py-sm`
- No border-radius (middle segment)
- Auto-focused on new rule creation (`autoFocus`)
- When not focused: `text-overflow: ellipsis; overflow: hidden; white-space: nowrap`
- When focused: full text visible, scrolls horizontally if needed

**Match Type Dropdown (right):**
- Min-width: 100px
- Text: `text-base content-secondary`
- Background: `surface-secondary`
- Padding: `px-sm py-sm`
- Left divider: 1px `border` (internal)
- Border-radius: `rounded-r-md` (right corners only)
- Options: wildcard, regex, exact

### 3.3 WebSocket Mode

Method dropdown is hidden. URL input gets left rounded corners.

```
+-------------------------------+-----------+
| wss://example.com/socket*     | wildcard v|
+-------------------------------+-----------+
       flex-1 (remaining)           100px
```

- URL input: `rounded-l-md` added
- Same height and styling otherwise

### 3.4 States

**Default/Empty (new rule):**
```
+--------+-------------------------------+-----------+
| GET  v | Enter URL pattern...          | wildcard v|
+--------+-------------------------------+-----------+
```
- Border: 1px `border` color
- Method: green (GET default color)
- Placeholder in `content-muted`

**Focused (URL input has focus):**
```
+========+===============================+===========+
| GET  v | https://api|                   | wildcard v|
+========+===============================+===========+
```
- Entire composite: `ring-2 ring-primary ring-offset-2`
- Individual segment focus rings suppressed (`focus:ring-0` on inner elements)
- Implementation: `focus-within:ring-2 focus-within:ring-primary` on wrapper div

**Filled:**
```
+--------+-------------------------------+-----------+
| POST v | **/api/users                  | regex   v |
+--------+-------------------------------+-----------+
```
- Method text colored blue (POST color)

**Error (validation failed):**
```
+--------+-------------------------------+-----------+
| GET  v |                               | wildcard v|
+--------+-------------------------------+-----------+
  ^ entire border becomes status-error
URL pattern is required
```
- Outer border: 1px `status-error`
- Error text below: `text-sm status-error`, `mt-xs`

**Saving (form submitting):**
- All segments get `opacity-50 cursor-not-allowed pointer-events-none`

### 3.5 Narrow Panel Fallback (< 350px width)

When container width drops below 350px, segments stack vertically:

```
+--------------------------------------------+
| GET  v                                      |
+--------------------------------------------+
| https://api.example.com/users*              |
+--------------------------------------------+
| wildcard  v                                 |
+--------------------------------------------+
```

- Each segment becomes full-width
- Gap: `sm` (8px) between segments
- Each gets full `rounded-md`
- Detection: CSS container query or `ResizeObserver`

### 3.6 Full Rule Editor Layout (Revised)

```
+--------------------------------------------+
| <- Back                      Create Rule   |
+--------------------------------------------+
|                                            |
| Request Matching                           |
| +--------+------------------------+------+ |
| | GET  v | **/api/users           |Wild v| |
| +--------+------------------------+------+ |
|                                            |
| Body Match (optional)                      |
| +----------------------------------------+ |
| | {"email": "*"}                         | |
| +----------------------------------------+ |
|                                            |
| GraphQL Operation (optional)               |
| +----------------------------------------+ |
| | GetUsers                               | |
| +----------------------------------------+ |
|                                            |
| Response                                   |
| +----------------------------------------+ |
| | Status  [200 OK              v]        | |
| | Type    [JSON                v]        | |
| |                                        | |
| | Body                                   | |
| | +------------------------------------+ | |
| | | {                                  | | |
| | |   "users": []                      | | |
| | | }                                  | | |
| | +------------------------------------+ | |
| |                             1.2 KB    | |
| |                                        | |
| | Headers                               | |
| | [Content-Type] [application/json]     | |
| | [+ Add Header]                        | |
| |                                        | |
| | Delay (ms)                            | |
| | [0___________]                        | |
| +----------------------------------------+ |
|                                            |
| Organization                               |
| +----------------------------------------+ |
| | Collection  [No Collection        v]   | |
| | Enabled     [ON]                       | |
| +----------------------------------------+ |
|                                            |
|                    [Cancel] [Create Rule]   |
+--------------------------------------------+
```

Key changes from current editor:
1. `RequestMatchInput` replaces three separate dropdowns (method, URL, match type)
2. Request Type selector removed from editor (determined by UX-004 active tab)
3. Body match and GraphQL operation fields remain as separate fields below the URL bar
4. Response fieldset, Organization fieldset, and actions remain unchanged in structure
5. All existing components (`Input`, `Select`, `Toggle`, `KeyValueEditor`, `SizeIndicator`) reused

### 3.7 RuleCard Update

The existing `RuleCard` already displays method badge + URL + status info. Add `urlMatchType` to the secondary info line:

```
+--------------------------------------------+
| [x]  GET  /api/users*         200 JSON     |
|      wildcard  12ms               [Edit][Del]|
+--------------------------------------------+
```

- Add match type as `text-xs content-muted` on the secondary info line
- Positioned before delay (if present)
- No other structural changes to `RuleCard`

---

## 4. UX-004: Request Type Sub-Tabs

### 4.1 Tab Bar Position and Layout

Renders below the main Navigation, above the workspace toolbar. Only visible when the Workspace tab is active.

```
+--------------------------------------------+
| Workspace  |  Log  |  Record               |  <- primary nav
+--------------------------------------------+
|  (HTTP 12)  (WebSocket 3)  (GraphQL 5)     |  <- sub-tabs
+--------------------------------------------+
| [Filter by URL...] [Methods v]              |  <- toolbar
```

### 4.2 Visual Specification

Tab bar container:
- Height: 32px
- Background: `surface-primary`
- Padding: `px-md py-xs`
- Border-bottom: 1px `border`
- Layout: `flex items-center gap-sm`

#### Active Pill

```
+-------------+
| HTTP    12  |
+-------------+
```

- Background: `primary` at 15% opacity (`bg-primary/15`)
- Text color: `primary`
- Font: `text-sm font-semibold`
- Padding: `px-md py-xs`
- Border-radius: `rounded-full` (9999px)
- Count: inline, same color, `ml-xs`

#### Inactive Pill

```
  WebSocket 3
```

- Background: transparent
- Text: `content-secondary`
- Font: `text-sm font-medium`
- Padding: `px-md py-xs`
- Border-radius: `rounded-full`
- Hover: background `surface-secondary`
- Count: `content-muted`

#### Inactive with Zero Rules

```
  GraphQL 0
```

- Same as inactive styling
- Count `0` in `content-muted`
- Still clickable, not disabled

### 4.3 Visual Differentiation from Primary Nav

| Property | Primary Nav Tabs | Sub-Tabs |
|----------|-----------------|----------|
| Style | Underline indicator (`border-b-2`) | Pill shape (`rounded-full`) |
| Font size | `text-base` (13px) | `text-sm` (11px) |
| Font weight | `font-medium` | `font-medium` (active: `font-semibold`) |
| Active indicator | 2px bottom border in `primary` | `primary/15` background fill |
| Inactive text | `content-secondary` | `content-secondary` |
| Padding | `px-md py-sm` | `px-md py-xs` |

The pill shape vs underline makes the hierarchy immediately clear.

### 4.4 Filtering Behavior

- **HTTP tab:** Rules where `requestType === 'http'` AND (`graphqlOperation` is undefined, null, or empty string)
- **WebSocket tab:** Rules where `requestType === 'websocket'`
- **GraphQL tab:** Rules where `requestType === 'http'` AND `graphqlOperation` is a non-empty string
- Toolbar URL/method filters apply ON TOP of the type filter
- Method filter dropdown is hidden when WebSocket tab is active (WebSocket has no HTTP method)
- Collections with zero rules of the active type are hidden entirely (not shown as empty groups)
- "Ungrouped" section follows the same filtering

### 4.5 Tab-Specific Empty States

#### HTTP -- Empty

```
+--------------------------------------------+
|                                            |
|   No HTTP mock rules yet.                 |
|   [+ Create HTTP Rule]                    |
|                                            |
+--------------------------------------------+
```

#### WebSocket -- Empty

```
+--------------------------------------------+
|                                            |
|   No WebSocket mock rules yet.            |
|   Intercept WebSocket connections          |
|   and send custom messages.               |
|   [+ Create WebSocket Rule]               |
|                                            |
+--------------------------------------------+
```

#### GraphQL -- Empty

```
+--------------------------------------------+
|                                            |
|   No GraphQL mock rules yet.              |
|   Mock specific GraphQL operations         |
|   by operation name.                       |
|   [+ Create GraphQL Rule]                 |
|                                            |
+--------------------------------------------+
```

- All centered, `py-xl`
- Message: `text-base content-secondary`
- Subtext (if present): `text-sm content-muted`
- Button: `Button` variant="primary" size="sm"
- Button click navigates to `/rules/new` with requestType preset via route state

### 4.6 Interaction with Rule Editor

When creating a new rule from a specific type tab:
- **HTTP tab:** Editor opens with `requestType='http'`, method dropdown visible
- **WebSocket tab:** Editor opens with `requestType='websocket'`, method dropdown hidden, WebSocket response fields shown
- **GraphQL tab:** Editor opens with `requestType='http'`, GraphQL operation field pre-visible and focused

WebSocket request line in editor:
```
+-------------------------------+-----------+
| wss://api.example.com/socket* | wildcard v|
+-------------------------------+-----------+
```
- Method segment hidden entirely

### 4.7 Tab Persistence

- Active tab stored in React state lifted to `WorkspacePage` (or `SidePanel`)
- Persists when navigating to rule editor and back (state stays in parent component)
- Optional: encode in URL query param `?type=http|websocket|graphql` for deep-linkable state (Architect decision)
- Default tab on initial load: HTTP

---

## 5. Complete Page Composition

### 5.1 Vertical Space Budget

At a typical 600px visible panel height:

| Section | Height | Position |
|---------|--------|----------|
| Primary nav | 32px | Sticky top |
| Sub-tabs | 32px | Sticky, below nav |
| Toolbar (filter + actions + sync) | ~96px | Scrolls with content |
| Content (rules list) | Flexible | Scrollable |
| Bottom bar | 44px | Sticky bottom |
| **Total fixed chrome** | **108px** | |
| **Available for scrollable content** | **~492px** | |

Each `RuleCard` is approximately 56px tall (`p-md` = 12px*2 + ~32px content). Approximately 7-8 rules visible without scrolling at 600px panel height.

### 5.2 Scrolling Behavior

- Primary nav and sub-tabs: `sticky top-0 z-10`
- Bottom bar: `sticky bottom-0 z-10` (or fixed positioning outside scroll container)
- Toolbar and content: scroll together in the `main` container
- Scroll shadow: subtle 4px `box-shadow` appears on bottom edge of sub-tabs when content is scrolled, providing depth cue

---

## 6. Interaction Specifications

### 6.1 Keyboard Navigation

| Element | Key | Action |
|---------|-----|--------|
| Primary nav tabs | Tab/Shift+Tab | Move between tab buttons |
| Primary nav tabs | Enter/Space | Activate tab, navigate to route |
| Sub-tab pills | Tab/Shift+Tab | Move between pills |
| Sub-tab pills | Enter/Space | Activate pill, filter rules |
| Sub-tab pills | Arrow Left/Right | Move to adjacent pill |
| Collection row | Enter/Space | Toggle expand/collapse |
| Collection toggle | Enter/Space | Toggle enable/disable (stops propagation) |
| Collection `...` | Enter/Space | Open context menu |
| Context menu | Arrow Up/Down | Navigate items |
| Context menu | Enter | Activate focused item |
| Context menu | Escape | Close, return focus to trigger |
| Team header | Enter/Space | Toggle team panel expand/collapse |
| Account bottom bar | Enter/Space | Toggle popover open/close |
| Account popover | Escape | Close popover, return focus to bottom bar |
| Account popover | Tab | Cycle through interactive elements |
| RequestMatchInput | Tab | Move: method -> URL -> match type |
| RequestMatchInput | Shift+Tab | Move backward: match type -> URL -> method |
| Filter input | Escape | Clear filter text |
| URL input in editor | Enter | Does NOT submit form (prevents accidental save) |

### 6.2 Click Interactions

| Element | Click Target | Result |
|---------|-------------|--------|
| Collection chevron/name | Row (not toggle) | Toggle expand/collapse |
| Collection toggle | Toggle only | Enable/disable collection, no expand/collapse |
| Collection `...` | Button | Open context menu popover |
| Context menu item | Item row | Execute action, close menu |
| Rule card body | Card (not toggle/buttons) | Navigate to `/rules/:id/edit` |
| `+ New Rule` | Button | Navigate to `/rules/new` |
| `+ New Collection` | Button | Open create collection `Modal` |
| Sub-tab pill | Pill | Switch active type filter |
| Team header | Row | Expand/collapse team panel |
| Bottom bar | Entire bar | Toggle account popover |
| Popover backdrop | Outside popover | Close popover |

### 6.3 Hover States

| Element | Hover Effect | Transition |
|---------|-------------|------------|
| Primary nav tab (inactive) | `content-primary` text | 150ms |
| Sub-tab pill (inactive) | `surface-secondary` background | 150ms |
| Collection row | `surface-secondary` background | 150ms |
| Rule card | `primary/10` border color | 150ms |
| Bottom bar | `surface-secondary` background | 150ms |
| Context menu item | `surface-secondary` background | 100ms |
| `...` button | `content-primary` from `content-muted` | 150ms |

---

## 7. Animation and Transition Specifications

All timings comply with NFR-003 (expand/collapse within 150ms).

| Element | Trigger | Properties | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Collection expand | Click row | `max-height: 0 -> auto`, `opacity: 0 -> 1` | 150ms | ease-out |
| Collection collapse | Click row | `max-height: auto -> 0`, `opacity: 1 -> 0` | 150ms | ease-in |
| Chevron rotation | Expand/collapse | `transform: rotate(0) -> rotate(90deg)` | 150ms | ease-out |
| Team panel expand | Click header | Same as collection expand | 150ms | ease-out |
| Team panel collapse | Click header | Same as collection collapse | 150ms | ease-in |
| Account popover open | Click avatar | `opacity: 0->1`, `translateY(8px)->0` | 150ms | ease-out |
| Account popover close | Dismiss | `opacity: 1->0`, `translateY(0)->8px` | 100ms | ease-in |
| Context menu open | Click `...` | `opacity: 0->1`, `scale(0.95)->1` | 100ms | ease-out |
| Context menu close | Dismiss | `opacity: 1->0` | 75ms | ease-in |
| Sub-tab switch | Click pill | `background-color` transition | 150ms | ease |
| Method color change | Select method | `background-color`, `color` | 150ms | ease |
| Avatar loading | fetchUser | `animate-pulse` (Tailwind built-in) | 2s loop | -- |
| Scroll shadow | Scroll position | `opacity: 0->1` on shadow element | 150ms | ease |

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:
- All transitions: `duration: 0ms` (instant)
- `animate-pulse` disabled
- Expand/collapse: instant show/hide, no height animation
- Implementation: Tailwind `motion-reduce:transition-none` utility on all animated elements

---

## 8. Responsive Behavior (Side Panel Constraints)

Minimum supported width: 360px. Maximum varies by browser (typically ~500px for Chrome side panels).

### At 360px (Minimum)

| Component | Behavior |
|-----------|----------|
| Primary nav | 3 tabs fit comfortably ("Workspace" + "Log" + "Record") |
| Sub-tabs | All 3 pills fit (~70 + 100 + 90 + gaps = ~280px) |
| Toolbar filter row | Input and Select on same row, Select shrinks to ~100px |
| Toolbar actions row | Wraps to two rows: `[+ Rule] [+ Collection]` / `[Import] [Export]` |
| RequestMatchInput | Fits at 360px (80 + ~180 + 100 = 360). Below 350px, stacks vertically |
| Collection rows | Name truncates with ellipsis. Badge/toggle always visible |
| Account popover | Width = 360 - 24 = 336px (full width minus margins) |
| Team header | Team name truncates. Badge always visible |

### At 500px (Typical Wide)

| Component | Behavior |
|-----------|----------|
| All rows | Single line, no wrapping |
| RequestMatchInput | URL input gets generous space |
| Collection names | More text visible before truncation |
| Account popover | Width stays at max 360px, does not grow further |

---

## 9. Accessibility Considerations

### 9.1 ARIA Attributes

| Component | ARIA |
|-----------|------|
| Collection row | `role="button"`, `aria-expanded="true/false"`, `aria-label="[name], [count] rules"` |
| Collection toggle | `role="switch"`, `aria-checked`, `aria-label="Enable [collection name]"` |
| Sub-tab bar | `role="tablist"`, `aria-label="Filter by request type"` |
| Sub-tab pill | `role="tab"`, `aria-selected`, `aria-controls="tabpanel-[type]"`, `aria-label="[type], [count] rules"` |
| Sub-tab content | `role="tabpanel"`, `id="tabpanel-[type]"`, `aria-labelledby="tab-[type]"` |
| Account bottom bar | `role="button"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-label="Account: [name or Sign in]"` |
| Account popover | `role="dialog"`, `aria-modal="true"`, `aria-label="Account settings"` |
| Context menu | `role="menu"` |
| Context menu items | `role="menuitem"` |
| RequestMatchInput wrapper | `role="group"`, `aria-label="Request matching"` |
| Method select | `aria-label="HTTP method"` |
| URL input | `aria-label="URL pattern"` |
| Match type select | `aria-label="URL match type"` |
| Rule count after filter | `aria-live="polite"` region: "Showing X of Y rules" |

### 9.2 Focus Management

- **Popover open:** Focus moves to first interactive element. On close, focus returns to trigger.
- **Context menu open:** Focus moves to first menu item. On close, focus returns to `...` button.
- **Collection expand:** Focus remains on the collection row. `aria-expanded` change is announced.
- **Tab trapping:** Account popover and context menu trap Tab focus within while open.
- **Skip link:** Consider adding a skip link from nav to main content for keyboard users.

### 9.3 Color Contrast

All token combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text):
- `content-primary` on `surface-primary`: ~10.7:1 (light), ~11.2:1 (dark)
- `content-secondary` on `surface-primary`: ~5.1:1 (light), ~5.8:1 (dark)
- `primary` on `surface-primary`: ~4.6:1 (light), ~7.2:1 (dark)
- `content-muted` on `surface-primary`: ~3.5:1 -- use only for decorative/supplementary text, not essential info
- Method color badges with 20% opacity background + full-color text: all pass AA

### 9.4 Screen Reader Announcements

- Sub-tab switch: announced via `aria-selected` change on tab role
- Rule filtering results: `aria-live="polite"` region shows updated count
- Collection enable/disable: `aria-checked` change on switch role
- Error messages: form validation errors use `aria-live="assertive"`
- Status messages (sync complete, rule saved): `aria-live="polite"`

---

## 10. Dark/Light Theme Notes

All new components use existing CSS custom properties via `ThemeProvider` and automatically adapt to theme changes. No new color tokens needed.

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Team header background | `#F5F5F5` (bgSecondary) | `#2A2A3C` (bgSecondary) |
| Collection row hover | `#F5F5F5` (bgSecondary) | `#2A2A3C` (bgSecondary) |
| Sub-tab active pill bg | `#6366F1` at 15% opacity | `#818CF8` at 15% opacity |
| Context menu background | `#FFFFFF` (bgCard) | `#313145` (bgCard) |
| Context menu shadow | Gray shadow | Near-black shadow |
| Account popover bg | `#FFFFFF` (bgCard) | `#313145` (bgCard) |
| RequestMatchInput segments | `#F5F5F5` (bgSecondary) | `#2A2A3C` (bgSecondary) |
| RequestMatchInput focus ring | `#6366F1` (accent) | `#818CF8` (accent) |
| Internal dividers (URL bar) | `#E5E7EB` (border) | `#3F3F5C` (border) |
| Bottom bar border-top | `#E5E7EB` (border) | `#3F3F5C` (border) |

All method colors (GET green, POST blue, etc.) are fixed across themes as they serve as categorical identifiers.

---

## 11. Component Inventory

### New Components to Create

| Component | File Location | Reuses |
|-----------|--------------|--------|
| `WorkspacePage` | `sidepanel/pages/WorkspacePage.tsx` | `RuleCard`, `Input`, `Select`, `Button`, `Badge`, `Toggle`, `Spinner`, `Modal`, `SyncControls` |
| `CollectionGroup` | `sidepanel/components/CollectionGroup.tsx` | `RuleCard`, `Toggle`, `Badge` |
| `CollectionContextMenu` | `sidepanel/components/CollectionContextMenu.tsx` | (standalone popover) |
| `TeamHeader` | `sidepanel/components/TeamHeader.tsx` | `Badge`, `Input`, `Button` |
| `RequestTypeTabs` | `sidepanel/components/RequestTypeTabs.tsx` | `Badge` |
| `RequestMatchInput` | `sidepanel/components/RequestMatchInput.tsx` | (composite, custom) |
| `AccountBottomBar` | `sidepanel/components/AccountBottomBar.tsx` | `Badge` |
| `AccountPopover` | `sidepanel/components/AccountPopover.tsx` | `AuthForm`, `StorageBar`, `Badge`, `Button` |

### Components to Modify

| Component | Changes |
|-----------|---------|
| `Navigation.tsx` | Remove Rules, Collections, Team, Account tab entries. Add single Workspace tab. Tabs become: Workspace, Log, Record. |
| `SidePanel.tsx` | Remove `/collections`, `/team`, `/account` routes. Replace `RulesPage` at `/` with `WorkspacePage`. Add `AccountBottomBar` as fixed footer outside scroll container. Adjust flex layout to three sections. |
| `RuleEditorPage.tsx` | Replace request matching fieldset (Request Type dropdown, URL Input, Match Type dropdown, Method dropdown) with single `RequestMatchInput` component. Remove Request Type `Select` (driven by tab context via route state). |
| `RuleCard.tsx` | Add `urlMatchType` display (`text-xs content-muted`) on secondary info line. |

### Components Removed as Standalone Pages

| Component | Replacement |
|-----------|------------|
| `CollectionsPage.tsx` | Content merged into `WorkspacePage` via `CollectionGroup` components |
| `TeamPage.tsx` | Content merged into `TeamHeader` expandable panel |
| `AccountPage.tsx` | Content merged into `AccountPopover` |

### Route Changes Summary

| Current Route | Proposed |
|---------------|----------|
| `/` (RulesPage) | `/` (WorkspacePage) |
| `/rules/new` | `/rules/new` (unchanged, updated editor UI) |
| `/rules/:id/edit` | `/rules/:id/edit` (unchanged, updated editor UI) |
| `/collections` | **Removed** (merged into Workspace) |
| `/collections/:id/versions` | `/collections/:id/versions` (unchanged, accessed via context menu) |
| `/log` | `/log` (unchanged) |
| `/recording` | `/recording` (unchanged) |
| `/account` | **Removed** (popover from bottom bar) |
| `/team` | **Removed** (merged into Workspace team header) |

---

## 12. Implementation Notes for Architect

1. **Virtualized list (NFR-004):** For 100+ rules, consider `react-window` or `@tanstack/virtual`. Collection group headers should be sticky within their scroll region. Performance target: instant filtering for up to 500 rules.

2. **Collapse state persistence:** Store `Record<collectionId, boolean>` in `chrome.storage.session`. Read on mount, write on toggle. Session storage clears when browser closes (appropriate for UI state).

3. **RequestMatchInput focus management:** Use a wrapper `div` with `focus-within:ring-2 focus-within:ring-primary`. Each inner `<select>` and `<input>` applies `focus:ring-0 focus:border-transparent` to suppress individual rings.

4. **Context menu positioning:** Use manual positioning with boundary detection. Check if menu would overflow the side panel bottom edge; if so, flip to open upward. Consider a lightweight positioning utility rather than a full popover library.

5. **Account popover positioning:** Always opens upward. Use `position: fixed; bottom: 52px` (44px bar + 8px gap). Width: `calc(100% - 24px)` capped at 360px.

6. **Sub-tab filtering performance:** Implement as `useMemo` with dependencies `[rules, activeType, urlFilter, methodFilter]`. For 500 rules this is O(n) per filter change -- well within the "instant" NFR.

7. **Reduced motion support:** Apply `motion-reduce:transition-none motion-reduce:animate-none` globally or per-component. Test with `prefers-reduced-motion: reduce` in Chrome DevTools.

8. **Container queries vs media queries:** Side panel width is not correlated with viewport width. Use `ResizeObserver` on the panel root or CSS container queries (`@container`) for responsive breakpoints. Verify `@container` support in Chrome extension side panel context.
