# Request Interceptor — Design Specification

## FigJam User Flows
- [Main User Flows Diagram](https://www.figma.com/online-whiteboard/create-diagram/ee0e535f-f750-4a7f-9769-e9c696ed7d50)

---

## Design Principles

1. **Developer-first** — UI должен быть понятен разработчику без обучения
2. **Minimal popup** — popup только для быстрых действий, основная работа в side panel
3. **Code-like aesthetics** — моноширинный шрифт для URL/body, syntax highlighting для JSON
4. **Dark/Light mode** — оба режима, dark по умолчанию (разработчики предпочитают)
5. **Non-intrusive** — расширение не должно мешать работе с сайтом

---

## Screen Inventory

### Screen 1: Popup (400x500 max)

**Purpose:** Быстрый доступ — выбор вкладок, переключение перехвата, навигация к редактору.

#### Layout
```
┌──────────────────────────────────┐
│  🔌 Request Interceptor    [⚙️] │  ← Header + settings gear
├──────────────────────────────────┤
│  Active Tabs                     │
│  ┌────────────────────────────┐  │
│  │ [✓] localhost:3000         │  │  ← Toggle per tab
│  │     http://localhost:3000  │  │
│  ├────────────────────────────┤  │
│  │ [ ] api.example.com       │  │
│  │     https://api.example.com│  │
│  ├────────────────────────────┤  │
│  │ [✓] myapp.dev             │  │
│  │     https://myapp.dev     │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Quick Stats                     │
│  Rules: 12 active │ Recorded: 3  │
├──────────────────────────────────┤
│  [📝 Open Editor]  [⏺ Record]   │  ← Action buttons
│  [📋 Request Log]  [👤 Account]  │
└──────────────────────────────────┘
```

#### States
| State | Description |
|-------|-------------|
| **Empty** | No tabs open — show "No tabs found" message |
| **Loading** | Spinner while querying tabs |
| **Populated** | List of tabs with toggles |
| **All disabled** | All toggles off — muted state, show "No interception active" |
| **Recording active** | Red dot indicator on Record button, pulsing |
| **Offline** | If backend unavailable — hide Account button, show local-only badge |
| **First install** | Welcome message + "Get started" link to editor |

#### Edge Cases
- [ ] Tab URL очень длинный — truncate with ellipsis, show full on hover
- [ ] 20+ tabs open — scrollable list with search/filter
- [ ] Tab closed while popup open — remove from list dynamically
- [ ] chrome:// or extension:// tabs — hide (can't intercept)
- [ ] Incognito tabs — show only if extension has incognito access

---

### Screen 2: Side Panel / Editor (320px wide or full tab)

**Purpose:** Основной рабочий экран — создание/редактирование mock rules, коллекции, лог.

#### Navigation
```
┌──────────────────────────────────┐
│  [Rules] [Collections] [Log]     │  ← Tab navigation
│  [Record]              [Account] │
├──────────────────────────────────┤
│                                  │
│  (Content area — see below)      │
│                                  │
└──────────────────────────────────┘
```

---

### Screen 2a: Rules List

```
┌──────────────────────────────────┐
│  Mock Rules              [+ New] │
│  ┌────────────────────────────┐  │
│  │ ≡ [✓] GET /api/users      │  │  ← Drag handle + toggle
│  │   → 200 JSON  ⏱ 500ms    │  │  ← Response info + delay
│  │   📁 My Collection        │  │  ← Collection badge
│  │              [Edit] [Del]  │  │
│  ├────────────────────────────┤  │
│  │ ≡ [ ] POST /api/login     │  │  ← Disabled rule (muted)
│  │   → 401 JSON              │  │
│  │              [Edit] [Del]  │  │
│  └────────────────────────────┘  │
│                                  │
│  Filter: [URL___] [Method ▼]     │  ← Filter controls
│  Sort: [Priority ▼]             │
└──────────────────────────────────┘
```

#### States
| State | Description |
|-------|-------------|
| **Empty** | "No mock rules yet. Create your first rule or record real responses." + CTA buttons |
| **Loading** | Skeleton cards |
| **Populated** | Scrollable list of rule cards |
| **Filtered (no results)** | "No rules match your filter" |
| **Drag mode** | Card elevated with shadow, drop zones highlighted |

---

### Screen 2b: Rule Editor (Create/Edit)

```
┌──────────────────────────────────┐
│  ← Back    Create Mock Rule      │
├──────────────────────────────────┤
│                                  │
│  REQUEST MATCHING                │
│  ┌────────────────────────────┐  │
│  │ URL Pattern:               │  │
│  │ [**/api/users**___________]│  │
│  │ Match type: (•)Wildcard    │  │
│  │             ( )Regex       │  │
│  │             ( )Exact       │  │
│  ├────────────────────────────┤  │
│  │ Method: [GET ▼]           │  │
│  ├────────────────────────────┤  │
│  │ Request Body Match:        │  │
│  │ ┌──────────────────────┐   │  │
│  │ │ { "email": "*" }     │   │  │  ← JSON editor (optional)
│  │ └──────────────────────┘   │  │
│  ├────────────────────────────┤  │
│  │ GraphQL Operation: [____] │  │  ← Only if detected
│  └────────────────────────────┘  │
│                                  │
│  RESPONSE                        │
│  ┌────────────────────────────┐  │
│  │ Status: [200 ▼]           │  │
│  ├────────────────────────────┤  │
│  │ Response Type:             │  │
│  │ (•)JSON ( )Raw ( )Multipart│  │
│  ├────────────────────────────┤  │
│  │ Body:                      │  │
│  │ ┌──────────────────────┐   │  │
│  │ │ {                    │   │  │  ← Syntax-highlighted editor
│  │ │   "users": [         │   │  │
│  │ │     { "id": 1 }      │   │  │
│  │ │   ]                  │   │  │
│  │ │ }                    │   │  │
│  │ └──────────────────────┘   │  │
│  │ Size: 🟢 0.2KB            │  │  ← Size indicator
│  ├────────────────────────────┤  │
│  │ Headers:                   │  │
│  │ [Content-Type] [applicat..]│  │  ← Key-value pairs
│  │ [X-Custom    ] [value    ] │  │
│  │              [+ Add Header]│  │
│  ├────────────────────────────┤  │
│  │ Delay: [500] ms           │  │
│  └────────────────────────────┘  │
│                                  │
│  ORGANIZATION                    │
│  ┌────────────────────────────┐  │
│  │ Collection: [My Mocks ▼]  │  │
│  │ Enabled: [✓]              │  │
│  └────────────────────────────┘  │
│                                  │
│  [Cancel]            [Save Rule] │
└──────────────────────────────────┘
```

#### States
| State | Description |
|-------|-------------|
| **Create mode** | Empty fields, "Create Mock Rule" title |
| **Edit mode** | Pre-filled fields, "Edit Mock Rule" title |
| **From recording** | Pre-filled from recorded response, "Save Recorded Response" title |
| **From log entry** | Pre-filled from log, "Create from Log Entry" title |
| **Validation error** | Red border on invalid fields, error message below |
| **Large body warning** | Orange/red size badge with tooltip |
| **JSON syntax error** | Red squiggly underline in editor, error message |

#### Edge Cases
- [ ] Огромный JSON body — editor with virtual scrolling
- [ ] Invalid regex in URL pattern — real-time validation with error message
- [ ] Duplicate rule (same URL+method) — warning "Similar rule exists", allow anyway
- [ ] Binary/multipart body — hex editor or file upload UI
- [ ] WebSocket rule — different UI: match URL, set messages to send

---

### Screen 2c: WebSocket Rule Editor

```
┌──────────────────────────────────┐
│  ← Back    WebSocket Mock Rule   │
├──────────────────────────────────┤
│  CONNECTION                      │
│  ┌────────────────────────────┐  │
│  │ WebSocket URL:             │  │
│  │ [wss://api.example.com/ws] │  │
│  └────────────────────────────┘  │
│                                  │
│  MOCK MESSAGES                   │
│  ┌────────────────────────────┐  │
│  │ On Connect:                │  │
│  │ [{"status": "connected"}]  │  │
│  ├────────────────────────────┤  │
│  │ On Message Match:          │  │
│  │ When receive: [{"type":"*"}│  │
│  │ Respond with: [{"data":[]} │  │
│  │ Delay: [100] ms           │  │
│  │              [+ Add Rule]  │  │
│  └────────────────────────────┘  │
│                                  │
│  [Cancel]            [Save Rule] │
└──────────────────────────────────┘
```

---

### Screen 2d: Collections

```
┌──────────────────────────────────┐
│  Collections     [+ New] [⬆ ⬇]  │  ← Import/Export buttons
│  ┌────────────────────────────┐  │
│  │ ▼ 📁 API Mocks        [✓] │  │  ← Expandable, toggle
│  │   ├── GET /api/users       │  │
│  │   ├── POST /api/login      │  │
│  │   └── 📁 Error Cases   [✓]│  │  ← Nested collection
│  │       ├── GET /api/500     │  │
│  │       └── POST /api/timeout│  │
│  ├────────────────────────────┤  │
│  │ ▶ 📁 WebSocket Mocks  [ ] │  │  ← Collapsed, disabled
│  ├────────────────────────────┤  │
│  │ ▶ 📁 GraphQL Mocks    [✓] │  │
│  └────────────────────────────┘  │
│                                  │
│  [Export Selected] [Import JSON] │
└──────────────────────────────────┘
```

#### States
| State | Description |
|-------|-------------|
| **Empty** | "No collections yet. Create one to organize your mocks." |
| **Import dialog** | File picker + conflict resolution modal |
| **Export dialog** | Checkboxes to select which collections to export |
| **Conflict modal** | "Collection 'X' already exists. Merge / Replace / Skip" |

---

### Screen 2e: Request Log

```
┌──────────────────────────────────┐
│  Request Log  [⏸ Pause] [🗑 Clear]│
│  Filter: [URL___] [Method ▼]     │
│  [✓] Show mocked [✓] Show real   │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 14:32:01 GET /api/users    │  │
│  │ 🟢 200 — MOCKED  ⏱ 502ms │  │  ← Green = mocked
│  │              [→ Create Mock]│  │
│  ├────────────────────────────┤  │
│  │ 14:32:00 POST /api/login   │  │
│  │ 🔵 200 — REAL     ⏱ 145ms │  │  ← Blue = real
│  │              [→ Create Mock]│  │
│  ├────────────────────────────┤  │
│  │ 14:31:58 GET /api/config   │  │
│  │ 🔴 500 — REAL     ⏱ 89ms  │  │  ← Red = error
│  │              [→ Create Mock]│  │
│  └────────────────────────────┘  │
│                                  │
│  Showing 156 requests            │
└──────────────────────────────────┘
```

#### Log Entry Detail (expandable)
```
┌──────────────────────────────────┐
│  ▼ 14:32:01 GET /api/users       │
│  Status: 200 — MOCKED           │
│  Time: 502ms (500ms delay)       │
│                                  │
│  Request Headers:                │
│  ┌──────────────────────────┐    │
│  │ Authorization: Bearer ... │    │
│  │ Content-Type: applicat... │    │
│  └──────────────────────────┘    │
│                                  │
│  Request Body:                   │
│  ┌──────────────────────────┐    │
│  │ (empty)                   │    │
│  └──────────────────────────┘    │
│                                  │
│  Response Body:                  │
│  ┌──────────────────────────┐    │
│  │ { "users": [...] }       │    │
│  └──────────────────────────┘    │
│                                  │
│  [→ Create Mock] [📋 Copy cURL]  │
└──────────────────────────────────┘
```

#### States
| State | Description |
|-------|-------------|
| **Empty** | "No requests captured. Enable interception on a tab to start logging." |
| **Streaming** | New entries appear at top with fade-in animation |
| **Paused** | "Paused" badge, no new entries, button says "Resume" |
| **Filtered (no results)** | "No requests match your filter" |
| **Large log (1000+)** | Virtual scrolling, "Showing latest 1000" notice |

---

### Screen 2f: Recording Mode

```
┌──────────────────────────────────┐
│  ⏺ Recording Mode        [Stop] │
│  Recording from: localhost:3000  │
├──────────────────────────────────┤
│  Captured Responses: 7           │
│  ┌────────────────────────────┐  │
│  │ [✓] GET /api/users → 200  │  │  ← Checkbox to select
│  │ [✓] GET /api/config → 200 │  │
│  │ [ ] GET /favicon.ico → 200│  │  ← Deselected (noise)
│  │ [✓] POST /api/login → 200 │  │
│  └────────────────────────────┘  │
│                                  │
│  Save to: [My Collection ▼]     │
│                                  │
│  [Discard] [Save Selected as Mocks]│
└──────────────────────────────────┘
```

---

### Screen 3: Account / Settings (Premium)

```
┌──────────────────────────────────┐
│  Account                         │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 👤 user@email.com          │  │
│  │ Plan: Free | [Upgrade]     │  │
│  │ Storage: 12MB / 50MB       │  │
│  │ ████████░░░░░ 24%          │  │
│  └────────────────────────────┘  │
│                                  │
│  Teams                           │
│  ┌────────────────────────────┐  │
│  │ 📁 My Team (Owner)        │  │
│  │ Members: 4                 │  │
│  │ Shared collections: 8     │  │
│  │ [Manage] [Invite]          │  │
│  └────────────────────────────┘  │
│                                  │
│  Cloud Collections               │
│  ┌────────────────────────────┐  │
│  │ [↑ Push Local → Cloud]    │  │
│  │ [↓ Pull Cloud → Local]    │  │
│  │ Last sync: 2 min ago       │  │
│  └────────────────────────────┘  │
│                                  │
│  [Version History]               │
│  [Settings] [Logout]             │
└──────────────────────────────────┘
```

#### Sub-screens

**Login/Register:**
```
┌──────────────────────────────────┐
│  Welcome to Request Interceptor  │
│                                  │
│  [🔵 Continue with Google]       │
│  [⚫ Continue with GitHub]       │
│  ─────── or ───────              │
│  Email: [________________]       │
│  Password: [_____________]       │
│  [Login]           [Register]    │
│                                  │
│  Free features work without      │
│  an account.                     │
└──────────────────────────────────┘
```

**Team Management:**
```
┌──────────────────────────────────┐
│  ← Back    My Team               │
├──────────────────────────────────┤
│  Members                         │
│  ┌────────────────────────────┐  │
│  │ 👑 owner@email.com  Owner │  │
│  │ 👤 dev1@email.com   Admin │  │  ← [Role ▼] [Remove]
│  │ 👤 dev2@email.com   Member│  │
│  └────────────────────────────┘  │
│                                  │
│  [+ Invite by Email]             │
│                                  │
│  Shared Collections              │
│  ┌────────────────────────────┐  │
│  │ 📁 API Mocks (v3)  [Sync] │  │
│  │ 📁 E2E Mocks (v1)  [Sync] │  │
│  └────────────────────────────┘  │
│                                  │
│  Team Storage: 1.2GB / 5GB       │
│  ████░░░░░░░░░ 24%               │
└──────────────────────────────────┘
```

**Version History:**
```
┌──────────────────────────────────┐
│  ← Back    Version History       │
│  Collection: API Mocks           │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ v3 — Current               │  │
│  │ Mar 7, 14:30 by dev1       │  │
│  │ "Added login error mocks"  │  │
│  ├────────────────────────────┤  │
│  │ v2 — Mar 5, 10:15 by owner │  │
│  │ "Updated user response"    │  │
│  │                 [Restore]  │  │
│  ├────────────────────────────┤  │
│  │ v1 — Mar 1, 09:00 by owner │  │
│  │ "Initial collection"       │  │
│  │                 [Restore]  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Pricing / Upgrade:**
```
┌──────────────────────────────────┐
│  Upgrade to Premium              │
├──────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐   │
│  │  FREE   │  │  PREMIUM    │   │
│  │         │  │  $5/month   │   │
│  │ ✓ Rules │  │ ✓ Everything│   │
│  │ ✓ Record│  │   in Free   │   │
│  │ ✓ Export│  │ ✓ Cloud Sync│   │
│  │ ✓ Log   │  │ ✓ Teams     │   │
│  │ 50MB    │  │ ✓ Versions  │   │
│  │ cloud   │  │ ✓ 1GB cloud │   │
│  │         │  │ ✓ Conditions│   │
│  │         │  │ ✓ Templates │   │
│  │ Current │  │ [Upgrade]   │   │
│  └─────────┘  └─────────────┘   │
│                                  │
│  Team Plan: $8/user/month        │
│  Everything in Premium +         │
│  ✓ Team workspace (5GB shared)   │
│  ✓ Role management               │
│  ✓ Team sync                     │
│  [Start Team Plan]               │
└──────────────────────────────────┘
```

---

## Dark / Light Mode

### Color Tokens (semantic)
| Token | Light | Dark |
|-------|-------|------|
| `bg-primary` | `#FFFFFF` | `#1E1E2E` |
| `bg-secondary` | `#F5F5F5` | `#2A2A3C` |
| `bg-card` | `#FFFFFF` | `#313145` |
| `text-primary` | `#1A1A2E` | `#E4E4EF` |
| `text-secondary` | `#6B7280` | `#9CA3AF` |
| `text-muted` | `#9CA3AF` | `#6B7280` |
| `border` | `#E5E7EB` | `#3F3F5C` |
| `accent` | `#6366F1` | `#818CF8` |
| `accent-hover` | `#4F46E5` | `#6366F1` |
| `success` | `#10B981` | `#34D399` |
| `warning` | `#F59E0B` | `#FBBF24` |
| `error` | `#EF4444` | `#F87171` |
| `info` | `#3B82F6` | `#60A5FA` |
| `mocked-badge` | `#10B981` | `#34D399` |
| `real-badge` | `#3B82F6` | `#60A5FA` |

### Size Indicator Colors
| Size | Color | Token |
|------|-------|-------|
| < 10KB | Green | `size-excellent` |
| < 100KB | Yellow | `size-good` |
| < 1MB | Orange | `size-acceptable` |
| >= 1MB | Red | `size-poor` |

---

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Header | Inter | 16px | 600 |
| Section title | Inter | 14px | 600 |
| Body | Inter | 13px | 400 |
| Caption | Inter | 11px | 400 |
| Code/URL | JetBrains Mono | 12px | 400 |
| JSON editor | JetBrains Mono | 13px | 400 |
| Badge | Inter | 10px | 600 |

---

## Spacing System

Base unit: 4px

| Token | Value |
|-------|-------|
| `space-xs` | 4px |
| `space-sm` | 8px |
| `space-md` | 12px |
| `space-lg` | 16px |
| `space-xl` | 24px |
| `space-2xl` | 32px |

---

## Component Inventory

| Component | Usage |
|-----------|-------|
| TabToggle | Popup tab list item with switch |
| RuleCard | Mock rule summary in list |
| RuleEditor | Full rule creation/edit form |
| CollectionTree | Nested expandable collection view |
| RequestLogEntry | Single log entry row |
| SizeIndicator | Color badge showing response size |
| JsonEditor | Syntax-highlighted JSON editor |
| KeyValueEditor | Headers / params editor |
| StatusCodePicker | Dropdown with common codes |
| MethodPicker | HTTP method dropdown |
| URLPatternInput | Input with match type selector |
| ImportExportDialog | Modal for file operations |
| ConflictResolver | Modal for merge/replace/skip |
| PricingCards | Free vs Premium comparison |
| StorageBar | Progress bar for cloud storage usage |
| VersionHistoryList | List of collection versions |
| TeamMemberList | List with role management |
| AuthForm | Login/Register with OAuth buttons |

---

## Icon Requirements

| Icon | Size | Usage |
|------|------|-------|
| Extension icon | 16, 32, 48, 128 | Chrome toolbar + store |
| Record indicator | 16 | Recording active badge |
| Toggle states | 16 | On/off interception |
| Method badges | Per method | GET=green, POST=blue, PUT=orange, DELETE=red, PATCH=purple |

---

## Accessibility

- All interactive elements must be keyboard-navigable
- Minimum contrast ratio 4.5:1 for text
- Focus indicators on all inputs and buttons
- Screen reader labels for toggle switches and icon buttons
- Size indicator must not rely on color alone — include text label
