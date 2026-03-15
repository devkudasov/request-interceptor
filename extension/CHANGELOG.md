# Changelog

All notable changes to Request Interceptor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-15

### Added

#### Core Interception
- HTTP request interception and mocking for GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS methods.
- WebSocket connection mocking with configurable message rules.
- GraphQL operation matching and mocking by operation name and type.
- URL matching strategies: exact match, wildcard patterns, and regular expressions.
- Response configuration with custom status codes, headers, body content, and simulated delay.
- Rule priority ordering with drag-and-drop reorder support.
- Collections for organizing and grouping mock rules.
- Import and export rules as JSON for portability.

#### Recording
- Record live API responses from any browser tab.
- Convert recorded responses into reusable mock rules via Save as Rules.

#### Authentication and Billing
- Email/Password authentication via Firebase Auth.
- Google OAuth sign-in.
- GitHub OAuth sign-in.
- Free, Pro, and Team subscription plans.
- Stripe checkout integration and billing portal access.
- Storage usage tracking per account.

#### Teams and Collaboration
- Create teams and invite members by email.
- Role-based access control with owner, admin, and member roles.
- Cloud sync of rules and collections with conflict resolution.
- Version history for rules with point-in-time restore capability.

#### User Interface
- Side panel interface built on Chrome Manifest V3.
- Popup with per-tab activation toggles.
- Dark, Light, and System theme support.
- Request log viewer with method and status filtering.
- Real-time recording indicator.

#### Architecture
- Chrome Manifest V3 with service worker background script.
- React 18, TypeScript, and Tailwind CSS frontend.
- Feature-based architecture with Zustand state management.
- Firebase backend: Auth, Firestore, and Cloud Functions.
- 1010+ tests powered by Vitest.
