# Workspace User Guide

The **Workspace** tab is the main screen of Request Interceptor. It is where you create, organize, and manage all your mock rules. This guide walks through every feature available in the Workspace.

## Overview

When you open the side panel, the Workspace tab is selected by default. From top to bottom, the layout is:

1. **Team Header** (visible when you belong to a team)
2. **Toolbar** -- URL filter, method filter, action buttons
3. **Sync Controls** -- Push/pull collections to the cloud
4. **Request Type Tabs** -- Filter rules by HTTP, WebSocket, or GraphQL
5. **Collections and Rules** -- Your organized mock rules
6. **Account Button** -- Bottom-left corner, profile and settings

---

## Collections

Collections are folders for grouping related mock rules. For example, you might have a "User API" collection with rules for `/api/users`, `/api/users/:id`, and `/api/auth/login`.

### Creating a Collection

1. Click **+ New Collection** in the toolbar.
2. Enter a name in the modal dialog.
3. Click **Create**. The collection appears in the workspace.

### Organizing Rules into Collections

When creating or editing a rule, use the **Collection** dropdown under the "Organization" section to assign it to a collection. Select "No Collection" to leave a rule ungrouped.

### Expanding and Collapsing

Each collection has a toggle arrow on the left side of its header:

- Click the arrow (or the collection header) to expand or collapse it.
- Collapsed collections show only the header with a rule count badge.
- The collapse state persists as you navigate between tabs.

### Enabling and Disabling Collections

Each collection header includes a toggle switch. When you disable a collection:

- All rules inside it stop matching requests.
- The collection appears dimmed (reduced opacity) in the workspace.
- Individual rule enabled states are preserved; re-enabling the collection restores them.

### Nested Collections

Collections can be nested inside other collections. Child collections are indented visually. Disabling a parent collection disables all rules within its children as well.

### Rule Count Badge

Each collection header shows a badge with the number of rules inside it, making it easy to scan the workspace at a glance.

---

## Rules

Rules define what to intercept and how to respond. Each rule specifies a URL pattern, an HTTP method, and a mock response.

### Creating a Rule

1. Click **+ New Rule** in the toolbar. This opens the Rule Editor page.
2. Choose the request type using the tabs at the top: **HTTP**, **WebSocket**, or **GraphQL**.
3. Fill in the required fields (at minimum, a URL pattern).
4. Optionally assign the rule to a collection and set the enabled state.
5. Click **Create Rule**.

### Editing a Rule

Click the edit button on any rule card in the workspace. The Rule Editor opens pre-filled with the existing values. Make changes and click **Save Changes**.

### Toggling a Rule

Each rule card has a toggle switch. Disabled rules remain in the workspace but do not intercept any requests. This is useful for temporarily disabling a mock without deleting it.

### Deleting a Rule

Click the delete button on a rule card. The rule is removed permanently.

### HTTP Rules

HTTP rules match against `fetch` and `XMLHttpRequest` calls. You can configure:

- **URL Pattern** -- The URL to match. Supports exact match, wildcard (`*`), and regex patterns.
- **Match Type** -- Choose between `exact`, `wildcard`, or `regex` matching.
- **HTTP Method** -- GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, or ANY (matches all methods).
- **Body Match** -- Optional string to match in the request body (useful for POST/PUT requests).
- **Status Code** -- The HTTP status code to return (e.g., 200, 404, 500).
- **Response Type** -- `json`, `raw`, or `multipart`.
- **Response Body** -- The mock response body. For JSON responses, use the built-in CodeMirror editor with syntax highlighting.
- **Response Headers** -- Key-value pairs for custom response headers (e.g., `Content-Type: application/json`).
- **Delay** -- Milliseconds to wait before returning the response. Useful for simulating slow networks.

### WebSocket Rules

WebSocket rules intercept `new WebSocket()` connections. You can configure:

- **URL Pattern** -- The WebSocket URL to match (e.g., `wss://api.example.com/ws`).
- **Match Type** -- `exact`, `wildcard`, or `regex`.
- **On Connect Message** -- A message to send automatically when the connection opens.
- **Message Rules** -- A list of match/respond pairs. When an incoming message matches the "match" string, the extension sends the "respond" string back, with an optional delay.

### GraphQL Rules

GraphQL rules are HTTP rules with additional GraphQL-specific filtering:

- **Operation Name** -- Match a specific GraphQL operation (e.g., `GetUser`, `CreatePost`). This filters by the `operationName` field in the GraphQL request body.
- **Body Match** -- Additional body content matching.
- All other fields (URL, method, status, response body, headers, delay) work the same as HTTP rules.

Typical usage: set the URL pattern to `/graphql` (or your API's GraphQL endpoint) and use the operation name to distinguish between different queries and mutations.

---

## Request Type Tabs

Below the toolbar, three tabs filter the rule list by type:

| Tab | Shows |
|-----|-------|
| **HTTP** | Standard HTTP mock rules (fetch/XHR) |
| **WebSocket** | WebSocket connection rules |
| **GraphQL** | HTTP rules that have a GraphQL operation name set |

Each tab shows a count of how many rules exist for that type. The active tab is highlighted with an underline. You can navigate between tabs using the left/right arrow keys when a tab is focused.

The selected tab is remembered while you navigate to other pages (Log, Record) and back.

---

## URL and Method Filters

The toolbar at the top of the workspace provides two filters:

### URL Filter

A text input labeled "Filter by URL...". Type any substring and the rule list updates instantly to show only rules whose URL pattern contains that text. The match is case-insensitive.

Example: typing `users` shows rules for `/api/users`, `/api/users/:id`, `https://example.com/users/profile`, etc.

### Method Filter

A dropdown with options: All Methods, GET, POST, PUT, PATCH, DELETE. Selecting a specific method hides all rules that do not match.

Both filters work together. If you set the URL filter to `api` and the method filter to `POST`, only POST rules with `api` in their URL pattern are shown.

Filters apply across all collections. A collection is hidden entirely if none of its rules match the current filters.

---

## Import and Export

### Exporting

Click the **Export** button in the toolbar. A JSON file named `collections-export.json` is downloaded. It contains all collections and their rules.

The Export button is disabled if you have no collections.

### Importing

Click the **Import** button in the toolbar. A file picker opens -- select a `.json` file previously exported from Request Interceptor. The imported collections and rules are merged into your workspace.

Use import/export to:

- Back up your mock rules
- Share rule sets with teammates who do not use cloud sync
- Move rules between different Chrome profiles or machines

---

## Team Collaboration

If you are signed in and belong to a team, the **Team Header** appears at the top of the workspace.

### Team Header

The header displays:

- The team name
- A member count badge
- A toggle arrow to expand the team panel

Click the header to expand or collapse the team management panel.

### Team Panel

When expanded, the team panel shows:

**Pending Invites** -- If you have been invited to a team, you see the invite here with **Accept** and **Decline** buttons.

**Members List** -- All current team members with their display name (or email) and role (owner, admin, member). Team managers can remove non-owner members using the **Remove** button.

**Invite Members** -- Enter an email address and click **Invite** to send a team invitation. The invited user will see it in their pending invites when they sign in.

### Cloud Sync

Below the toolbar, the **Sync Controls** section lets you synchronize collections with Firebase:

- **Push to Cloud** -- Uploads your local collections and rules to Firestore. Creates a new version snapshot each time.
- **Pull from Cloud** -- Downloads the latest cloud version and updates your local rules.
- **Last Sync** -- Shows the timestamp of your most recent sync operation.
- **Conflict Resolution** -- If your local version diverges from the cloud version, a conflict notice appears with two options:
  - **Keep Local** -- Overwrites the cloud with your local rules.
  - **Keep Remote** -- Overwrites your local rules with the cloud version.

Sync requires both authentication (sign in) and team membership.

If you are not signed in, the sync section displays a prompt to log in. If you are signed in but have no team, it suggests creating or joining one.

---

## Account Button

The account button sits in the bottom-left corner of the side panel, below the main content area.

### When Signed Out

The button shows a generic user icon. Clicking it opens a **Login Popover** where you can sign in with:

- Email and password
- Google
- GitHub

### When Signed In

The button shows your profile photo (or your initials if no photo is set). Clicking it opens the **Account Popover** with:

- **Profile** -- Your name, email, and avatar.
- **Plan Badge** -- Shows your current plan (Free, Pro, or Team).
- **Email Verification Warning** -- If your email is not yet verified, a warning appears prompting you to check your inbox.
- **Storage Usage** -- A progress bar showing how much of your plan's storage quota you have used.
- **Upgrade Plan** -- Visible on the Free plan, this button links to plan upgrade options.
- **Logout** -- Signs you out and clears your session.

Press **Escape** to close the popover.

---

## Tips and Best Practices

- **Start with collections.** Even for small projects, grouping rules by API domain or feature makes the workspace easier to navigate as your rule count grows.

- **Use wildcard patterns.** Instead of creating separate rules for `/api/users/1`, `/api/users/2`, etc., use a wildcard pattern like `/api/users/*` to match them all with one rule.

- **Disable rather than delete.** If you might need a rule again later, toggle it off instead of deleting it. Disabled rules do not affect performance.

- **Export before major changes.** Before importing a new set of rules or doing a cloud pull, export your current workspace as a backup.

- **Use the type tabs for focus.** If you are working exclusively on WebSocket mocking, switch to the WebSocket tab to hide HTTP and GraphQL rules and reduce visual noise.

- **Use delays to test loading states.** Set a 1000-2000ms delay on mock rules to verify that your UI handles loading states and spinners correctly.

- **Name GraphQL operations.** Always set the operation name field for GraphQL rules. Without it, the rule matches all requests to the GraphQL endpoint regardless of the query.

- **Leverage recording for quick setup.** Instead of manually creating rules, use the Record tab to capture real API responses, then fine-tune the generated rules in the Workspace.

- **Sync regularly in team settings.** Push your changes frequently and pull before starting new work to avoid conflicts with teammates.
