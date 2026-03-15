# Manual Test Cases — Request Interceptor Chrome Extension

**Total: 62 test cases** — 25 P0 (must pass), 22 P1 (should pass), 15 P2 (nice to verify)

> Run all P0 before every release. Run P1 before major versions. P2 at discretion.

---

## TC-01: Installation & Setup

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-01.1 | Extension installs correctly | Install from Chrome Web Store or `chrome://extensions` (dev mode) | Icon in toolbar, popup opens, side panel accessible | P0 |
| TC-01.2 | Popup shows on icon click | Click extension icon | Popup with "Request Interceptor" header, tab list, "Open Editor" button | P0 |
| TC-01.3 | Side panel opens | Click "Open Editor" in popup | Side panel opens with workspace view | P0 |

---

## TC-02: Tab Activation

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-02.1 | Activate interception on tab | Open popup → toggle switch ON for a tab | Switch turns on, interceptor injected | P0 |
| TC-02.2 | Deactivate interception | Toggle switch OFF | Interceptor removed, requests pass through | P0 |
| TC-02.3 | Multiple tabs | Activate on 2+ tabs simultaneously | Each tab independently intercepted | P1 |
| TC-02.4 | Tab close cleanup | Activate tab → close tab → reopen popup | Closed tab removed from list | P1 |
| TC-02.5 | Chrome internal pages filtered | Have chrome:// tabs open | Not shown in popup tab list | P2 |

---

## TC-03: HTTP Rule CRUD

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-03.1 | Create rule | Side panel → "+" → fill URL pattern, method, status, body → save | Rule appears in workspace list | P0 |
| TC-03.2 | Edit rule | Click rule card → edit fields → save | Changes persisted, rule card updated | P0 |
| TC-03.3 | Delete rule | Click rule card → delete | Rule removed from list | P0 |
| TC-03.4 | Toggle rule on/off | Click toggle on rule card | Disabled rules don't intercept requests | P0 |
| TC-03.5 | Rule with JSON body | Create rule with `{"ok":true}` body, Content-Type: application/json | Intercepted response returns valid JSON | P0 |
| TC-03.6 | Rule with delay | Set 2000ms delay | Response delayed by ~2 seconds | P1 |
| TC-03.7 | Rule priority order | Create 2 rules matching same URL, drag to reorder | Higher priority rule wins | P1 |

---

## TC-04: URL Matching

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-04.1 | Exact match | Rule: `https://api.example.com/users` | Matches only that exact URL | P0 |
| TC-04.2 | Wildcard match | Rule: `https://api.example.com/*` | Matches all paths under domain | P0 |
| TC-04.3 | Regex match | Rule: `https://api\\.example\\.com/users/\\d+` | Matches `/users/123` but not `/users/abc` | P1 |
| TC-04.4 | Method filtering | Rule: GET only | POST to same URL passes through | P0 |
| TC-04.5 | No match passthrough | No rule for URL | Original response returned | P0 |

---

## TC-05: WebSocket Rules

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-05.1 | Mock WS connection | Create WS rule with onConnect message | Client receives message on connection | P1 |
| TC-05.2 | Mock WS message response | Create WS rule with message match pattern | Matching messages get mock responses | P1 |
| TC-05.3 | WS delay | Set delay on WS message rule | Response delayed | P2 |

---

## TC-06: GraphQL Rules

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-06.1 | Match by operation name | Rule with `graphqlOperation: "GetUser"` | Only GetUser queries intercepted | P1 |
| TC-06.2 | Body match | Rule with body match on query string | Partial body match works | P2 |

---

## TC-07: Collections

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-07.1 | Create collection | Click "New Collection" → enter name | Collection appears as group | P0 |
| TC-07.2 | Assign rule to collection | Create rule with collectionId | Rule appears under collection group | P0 |
| TC-07.3 | Toggle collection | Toggle collection off | All rules in collection disabled | P1 |
| TC-07.4 | Delete collection | Delete collection with rules | Rules become ungrouped (collectionId → null) | P1 |
| TC-07.5 | Collapse/expand | Click collection header | Rules shown/hidden | P2 |

---

## TC-08: Recording

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-08.1 | Start recording | Click Record → select tab → Start | Recording indicator shown, requests captured | P0 |
| TC-08.2 | Stop recording | Click Stop while recording | Recording stops, entries shown in SaveRecordedPanel | P0 |
| TC-08.3 | Save as rules | Stop recording → click "Save as Rules" | Rules created from recorded responses | P0 |
| TC-08.4 | Discard recording | Stop recording → click "Discard" | Entries cleared, no rules created | P1 |
| TC-08.5 | Verify saved rules work | Save recorded rules → activate tab → refresh page | Requests intercepted with recorded responses | P0 |

---

## TC-09: Import / Export

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-09.1 | Export collections | Click export → download JSON | Valid JSON file with all rules/collections | P1 |
| TC-09.2 | Import collections | Click import → select JSON file | Rules and collections restored | P1 |
| TC-09.3 | Import invalid file | Import non-JSON or malformed file | Error message, no data corrupted | P2 |

---

## TC-10: Request Log

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-10.1 | Log shows requests | Activate tab → make requests | Log entries appear in bottom panel | P0 |
| TC-10.2 | Mocked badge | Intercepted request in log | "Mocked" badge shown | P1 |
| TC-10.3 | Pause log | Click pause | New entries not added while paused | P2 |
| TC-10.4 | Clear log | Click clear | All log entries removed | P2 |

---

## TC-11: Auth

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-11.1 | Email registration | Account → Register with email/password | Account created, user logged in | P0 |
| TC-11.2 | Email login | Account → Login with email/password | User logged in, plan shown | P0 |
| TC-11.3 | Google login | Account → Sign in with Google | OAuth flow completes, user logged in | P0 |
| TC-11.4 | GitHub login | Account → Sign in with GitHub | OAuth flow completes, user logged in | P0 |
| TC-11.5 | Logout | Account → Logout | User logged out, login form shown | P0 |
| TC-11.6 | Auth persistence | Login → close/reopen extension | User still logged in | P1 |
| TC-11.7 | Storage bar | Login → check account popover | Storage usage shown (not 0%) | P1 |

---

## TC-12: Billing

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-12.1 | Free plan shown | Login as free user → Billing page | Free plan highlighted, upgrade options visible | P0 |
| TC-12.2 | Upgrade to Pro | Click Upgrade → Stripe checkout → complete | Plan changes to Pro | P0 |
| TC-12.3 | Manage subscription | Pro user → Billing → Manage Plan | Stripe portal opens | P1 |
| TC-12.4 | Quota enforcement | Free user → exceed storage limit | Upgrade prompt shown | P1 |

---

## TC-13: Teams & Sync

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-13.1 | Create team | Team panel → create team | Team created, user is owner | P1 |
| TC-13.2 | Invite member | Team → invite by email | Invite sent, pending status shown | P1 |
| TC-13.3 | Push to cloud | Sync → Push | Rules uploaded to Firestore | P1 |
| TC-13.4 | Pull from cloud | Sync → Pull | Rules downloaded from Firestore | P1 |
| TC-13.5 | Version history | Versions page → see history | List of snapshots with dates | P2 |
| TC-13.6 | Restore version | Click restore on a version | Rules reverted to that snapshot | P2 |

---

## TC-14: Theme & Settings

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-14.1 | Dark theme (default) | Open extension | Dark theme applied | P2 |
| TC-14.2 | Switch to light | Settings → Light theme | UI switches to light colors | P2 |
| TC-14.3 | System theme | Settings → System → toggle OS dark mode | Theme follows OS preference | P2 |

---

## TC-15: Edge Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TC-15.1 | Large response body | Rule with 1MB response body | Response served correctly, size indicator shown | P1 |
| TC-15.2 | Special chars in URL | Rule with `?query=hello&foo=bar` | Pattern matches correctly | P1 |
| TC-15.3 | Many rules (100+) | Create 100+ rules | UI performant, scroll works | P2 |
| TC-15.4 | Extension update | Update extension version | Rules and settings preserved | P1 |
| TC-15.5 | Incognito mode | Enable in incognito → test | Works if user granted permission | P2 |
| TC-15.6 | Multiple windows | Activate in 2 browser windows | Independent per-tab activation | P2 |
| TC-15.7 | CSP strict page | Test on page with strict CSP | Interceptor works via web_accessible_resources | P1 |
