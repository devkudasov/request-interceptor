# Request Interceptor -- MVP2 Research & Proposal

> Research date: 2026-03-08
> Sources: X (Twitter), Reddit (r/webdev, r/javascript, r/reactjs, r/chrome_extensions, r/Frontend), Chrome Web Store reviews, G2, dev.to, GitHub issues, product comparison sites

---

## 1. Research Summary

### Key Findings from Community Research

**Pain Point #1: Bloated tools with steep learning curves**
Requestly is the market leader (~600K users, 4.8 stars) but users consistently describe it as "doing too much." Developers who only need response mocking are overwhelmed by features like URL redirect, script injection, header modification, and session recording bundled into one UI. Sentiment: "I just want to mock one API response, why do I need to learn a whole platform?"

**Pain Point #2: Ads and monetization hostility**
Mokku (popular DevTools-panel mocker) drew significant backlash for injecting ads into the extension. Multiple 1-star reviews cite data loss after updates and intrusive advertising. Users actively search for "ad-free" alternatives. ModHeader also includes ads that disrupt the developer experience. Sentiment: developers expect dev tools to be clean and non-intrusive.

**Pain Point #3: Extensions break pages**
Tweak, OhMyMock, and similar tools that patch `window.fetch` / `XMLHttpRequest` report breaking sites (Google Calendar, internal admin panels). Content script injection timing is fragile -- requests fired before DOM load are missed entirely. CSP-strict pages block injected scripts.

**Pain Point #4: No WebSocket or GraphQL subscription mocking**
Nearly all Chrome extension mockers handle REST and basic GraphQL (queries/mutations over HTTP) but none reliably mock WebSocket connections or GraphQL subscriptions. This is a gap cited across GitHub issues and dev.to threads.

**Pain Point #5: Team sharing is either missing or expensive**
Most free tools (Mokku, MockMan, tweak) only support JSON file export/import for sharing. Requestly offers cloud workspaces but gates them behind $15-23/member/month plans. Teams want a middle ground -- easy sharing without enterprise pricing.

**Pain Point #6: No environment/profile switching**
Developers working across local/staging/production need to maintain separate mock sets. Only Mockiato (a niche tool) offers profiles. Most tools force manual enable/disable of individual rules when switching contexts.

**Pain Point #7: Missing request body matching**
Most extensions match only by URL + HTTP method. Matching by request body (essential for POST-heavy APIs, GraphQL operation names, and form submissions) is either absent or poorly implemented.

**Pain Point #8: No import from industry-standard formats**
Developers want to import mocks from OpenAPI/Swagger specs, Postman collections, and HAR files. Only Requestly supports some of these at the paid tier. Mockoon (desktop app) does this well but has no Chrome extension.

**Pain Point #9: No CI/CD or automation story**
Frontend teams want to use the same mock definitions in headless Chrome during CI testing. Current extensions are purely manual browser tools with no programmatic API or CLI export.

**Pain Point #10: Dynamic/template responses are rare in extensions**
Mockoon and WireMock offer Handlebars + Faker.js templating for dynamic responses (random IDs, timestamps, conditional logic). No Chrome extension offers this -- they all return static JSON only.

---

## 2. Competitor Analysis

### Top 5 Competitors

| Tool | Type | Users | Rating | Strengths | Weaknesses |
|------|------|-------|--------|-----------|------------|
| **Requestly** | Chrome ext + desktop | 600K+ | 4.8 | Full-featured (redirect, mock, headers, scripts), GraphQL support, team workspaces, OpenAPI/Postman/HAR import, open-source | Bloated UI, expensive team plans ($15-23/user/mo), steep learning curve, overkill for simple mocking |
| **Mokku** | Chrome DevTools panel | 50K+ | 3.8 | DevTools integration, auto-record responses, simple UI | Ads (historically), data loss bugs, abandoned feel (slow updates), no request body matching, no team features |
| **Tweak** | Chrome ext | 30K+ | 4.2 | Clean UI, quick mock setup, export/import | XHR-only limitations, breaks some sites, no service worker support, no incognito, no GraphQL-specific features |
| **ModResponse** | Chrome ext | 40K+ | 4.1 | Part of ModHeader ecosystem, response replay, simple | Ads, limited to response modification, no collections/organization, no body matching |
| **Mockoon** | Desktop app + CLI | N/A (desktop) | 4.7 (G2) | OpenAPI import, Faker.js templating, dynamic responses, CLI for CI, proxy mode | **No Chrome extension** -- requires running a local server, adds complexity, not inline with browser workflow |

### Notable Smaller Players
- **MockMan**: Simple XHR mocker, requested features include HTML responses, header editing, URL regex, custom mock names
- **MockForMe**: Targets non-developers (PMs, designers) for scenario simulation
- **Mockiato**: Environment profiles feature, DevTools integration, but small user base
- **OhMyMock**: Auto-caches real responses and replays them -- clever "record and replay" UX

### MSW (Mock Service Worker) -- The Code-Based Alternative
MSW is the dominant code-level solution (npm). It uses Service Workers to intercept requests at the network level (requests appear in DevTools Network tab). Key advantage: same mock definitions work in browser, Node.js, and tests. Key limitation: requires code changes and build pipeline integration -- not suitable for ad-hoc QA testing or non-developers.

---

## 3. Feature Ideas for MVP2

Ranked by user demand (based on frequency of mentions across sources):

| # | Feature | User Demand | Effort | Notes |
|---|---------|-------------|--------|-------|
| 1 | **Environment profiles** (dev/staging/prod) | High | M | Switch entire mock sets with one click. Only Mockiato does this. Huge differentiator. |
| 2 | **OpenAPI/Swagger import** | High | L | Auto-generate mock rules from an OpenAPI spec. Mockoon does this for desktop; no extension does it well. |
| 3 | **Dynamic response templates** (Faker.js + Handlebars) | High | L | Random IDs, timestamps, incrementing counters, conditional logic. Desktop tools have this; no extension does. |
| 4 | **HAR file import** | Medium | M | Import recorded traffic as mock rules. Natural workflow for developers already using DevTools. |
| 5 | **Postman collection import** | Medium | M | Large existing user base with Postman collections they want to reuse. |
| 6 | **Request body matching** (JSON path, partial match) | High | M | Critical for POST-heavy APIs and GraphQL. Most competitors lack this. Already in MVP1 scope but worth emphasizing. |
| 7 | **Proxy/passthrough mode** | Medium | M | Forward unmatched requests to a real server, only mock specific endpoints. Mockoon has this; few extensions do. |
| 8 | **CLI export for CI/CD** | Medium | L | Export mock definitions as a config file usable with Playwright/Puppeteer in CI. Bridges the gap between manual and automated testing. |
| 9 | **GraphQL subscription mocking** (WebSocket) | Medium | L | No competitor does this in a Chrome extension. Niche but high-value for GraphQL-heavy teams. |
| 10 | **Response scenarios / sequences** | Medium | M | Return different responses for successive calls to the same endpoint (1st call: success, 2nd: error, 3rd: timeout). Useful for testing retry logic. |
| 11 | **Diff view for recorded vs mocked responses** | Low | S | Side-by-side comparison of real response and mock response. Helpful for debugging. |
| 12 | **Mock response validation** (JSON Schema) | Low | M | Validate mock responses against a JSON Schema to ensure they match the API contract. |
| 13 | **Keyboard shortcuts & command palette** | Medium | S | Power users want fast access. No competitor has a command palette. |
| 14 | **Bulk operations** (enable/disable/delete multiple rules) | Medium | S | Quality-of-life improvement for managing large rule sets. |
| 15 | **Network error simulation** (DNS failure, connection refused, CORS error) | Medium | S | Beyond status codes -- simulate actual network-level failures. Few tools do this well. |

**Effort key:** S = Small (1-2 days), M = Medium (3-5 days), L = Large (1-2 weeks)

---

## 4. Recommended MVP2 Scope

Top 7 features to build, selected for maximum differentiation and user value:

### 4.1 Environment Profiles (Effort: M)
**Why:** The single most-requested organizational feature. Developers maintain separate mock configurations for local dev, staging, and production. Currently they manually toggle individual rules.
**What:** Named profiles (e.g., "Local Dev", "Staging QA", "Demo"). Each profile activates a specific set of collections/rules. One-click switching. Per-tab profile assignment.
**Differentiator:** Only Mockiato (tiny user base) offers this. Requestly does not.

### 4.2 Dynamic Response Templates with Faker.js (Effort: L)
**Why:** Static JSON mocks are unrealistic. Developers need random names, IDs, timestamps, and conditional responses to properly test UI.
**What:** Handlebars-style template syntax in response bodies. Built-in Faker.js helpers (e.g., `{{faker.person.firstName}}`, `{{faker.string.uuid}}`). Request echo helpers (e.g., `{{request.params.id}}`, `{{request.headers.Authorization}}`). Conditional blocks (`{{#if request.body.type === "admin"}}`).
**Differentiator:** No Chrome extension offers this. Only desktop tools (Mockoon, WireMock) do.

### 4.3 OpenAPI/Swagger Import (Effort: L)
**Why:** Teams already have API specifications. Auto-generating mocks from them saves hours of manual rule creation and ensures mocks stay in sync with the API contract.
**What:** Import OpenAPI 3.x / Swagger 2.0 JSON/YAML. Auto-create mock rules for each endpoint with example responses. Option to generate Faker.js-powered dynamic responses from schema definitions.
**Differentiator:** Requestly has limited import. No free extension does full OpenAPI-to-mock generation.

### 4.4 Response Scenarios & Sequences (Effort: M)
**Why:** Real APIs behave differently on repeated calls (pagination, optimistic locking, rate limiting). Developers need to test retry logic, polling, and state transitions.
**What:** Define an ordered sequence of responses for a rule. Each successive matching request returns the next response in the sequence. Loop or stop at the end. Useful for: pagination, auth flows (401 then 200 after refresh), error-then-success retry testing.
**Differentiator:** No Chrome extension offers this. WireMock has "scenarios" but it is a server-side tool.

### 4.5 Network Error Simulation (Effort: S)
**Why:** Testing how UIs handle network failures (not just HTTP errors) is critical. Current tools only let you set status codes.
**What:** Simulate: connection timeout, connection refused, DNS resolution failure, CORS error, aborted request. Configurable per rule alongside existing delay and status code options.
**Differentiator:** Most tools stop at HTTP status codes. True network error simulation is rare.

### 4.6 Proxy/Passthrough Mode (Effort: M)
**Why:** Developers often want to mock only 2-3 endpoints while the rest hit the real API. Current workflow requires creating "passthrough" rules for every unmocked endpoint.
**What:** Default behavior: all requests pass through to real server. Only explicitly mocked endpoints get intercepted. Toggle between "mock all" and "passthrough" modes per collection.
**Differentiator:** Mockoon has proxy mode (desktop). No Chrome extension implements this cleanly.

### 4.7 Keyboard Shortcuts & Command Palette (Effort: S)
**Why:** Power users (the core audience) want speed. Every competitor relies on mouse-driven UI only.
**What:** `Cmd/Ctrl+K` command palette for quick actions: search rules, toggle rules, switch profiles, create new mock. Configurable keyboard shortcuts for common actions (toggle interception, open side panel, start recording).
**Differentiator:** No competitor has this. Signals a developer-first product.

### Total estimated effort: ~5-6 weeks of development

---

## 5. Growth Opportunities

### 5.1 Monetization

**Freemium upgrade path (already planned in MVP1):**
- MVP2 free features (profiles, templates, import, scenarios) make the free tier even more compelling -- this drives adoption
- Premium upsell: team-shared profiles, shared template libraries, cloud-synced OpenAPI specs, unlimited scenario steps
- Potential pricing adjustment: $8-10/user/month (undercut Requestly's $15-23) while offering comparable team features

**New premium features for MVP2:**
- **AI-powered mock generation**: Paste an API endpoint URL, extension auto-generates mock rules by analyzing the response schema. Premium-only.
- **Mock analytics**: Track which mocks are most used across the team, which endpoints lack mocks. Premium team feature.

### 5.2 Community & Growth

**Open-source mock library:**
- Create a public repository of community-contributed mock templates (common APIs: Stripe, Twilio, GitHub, AWS)
- Users can install community mocks with one click
- Drives organic discovery and SEO

**Developer content strategy:**
- "How to mock [specific API] in Chrome" tutorial series (targets long-tail search queries)
- Comparison pages: "Request Interceptor vs Requestly", "Request Interceptor vs Mokku"
- Dev.to and Hacker News launches for each major feature release

**Chrome Web Store optimization:**
- Target keywords: "mock api", "api mocking", "request interceptor", "response override", "api testing"
- Collect reviews early -- Requestly has 4.2K reviews which gives it massive store visibility

### 5.3 Integrations

| Integration | Value | Effort |
|-------------|-------|--------|
| **Postman collection import** | Tap into massive Postman user base migrating away from their pricing changes | M |
| **HAR file import** | Natural DevTools workflow, no competitor does this in-extension | M |
| **VS Code extension** | Manage mocks from IDE, sync with browser extension | L |
| **Playwright/Puppeteer config export** | Bridge manual and automated testing, DevOps teams would love this | L |
| **Figma plugin** | Designers can attach mock data to prototypes -- unique positioning for design-dev handoff | L |

### 5.4 Platform Expansion (Post-MVP2)

- **Firefox add-on**: Expand addressable market by ~15%
- **Safari extension**: Capture iOS/macOS developer segment
- **Desktop app (Electron)**: For users who want to mock across all browsers, similar to Mockoon but with our superior UX
- **npm package**: Share mock definitions between browser extension and code-level tests (compete with MSW)

---

## Appendix: Sources

- [Requestly Chrome Web Store](https://chromewebstore.google.com/detail/requestly-supercharge-you/mdnleldcmiljblolnjhpnblkcekpdkpa)
- [Requestly Alternatives - AlternativeTo](https://alternativeto.net/software/requestly/)
- [Best Chrome Extensions for API Development - dev.to](https://dev.to/anmolbaranwal/best-chrome-extensions-for-api-development-testing-in-2025-4f27)
- [Mokku GitHub - Issues and Feature Requests](https://github.com/mukuljainx/Mokku)
- [Tweak Chrome Extension - Known Limitations](https://tweak-extension.com/docs/known-limitations)
- [MSW Comparison](https://mswjs.io/docs/comparison/)
- [Mockoon - Dynamic Response Templates](https://mockoon.com/docs/latest/templating/overview/)
- [OpenAPI DevTools - GitHub](https://github.com/AndrewWalsh/openapi-devtools)
- [Top Chrome Extensions for Overriding API Responses - dev.to](https://dev.to/requestly/top-chrome-extensions-for-overriding-api-responses-2d4a)
- [Requestly Alternatives - G2](https://www.g2.com/products/requestly/competitors/alternatives)
- [MockForge - Dynamic Data Docs](https://docs.mockforge.dev/user-guide/http-mocking/dynamic-data.html)
- [Mockfly - Faker.js Integration](https://mockfly.dev/docs/random-data-generation-with-faker-js)
- [Requestly G2 Reviews](https://www.g2.com/products/requestly/reviews)
- [Requestly Pricing - G2](https://www.g2.com/products/requestly/pricing)
- [Chrome DevTools API Mocking - LogRocket](https://blog.logrocket.com/chrome-devtools-api-mocking/)
- [Mockiato GitHub](https://github.com/avivasyuta/mockiato)
