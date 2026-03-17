# Roadmap

**Current Release:** v2.0.0 (Code Quality & Definition of Done)  
**Last Updated:** March 17, 2026  
**Maintainers:** @PATTANAKORN025

---

## Overview

Ice Truck Tracking follows a thematic, phase-based roadmap focused on platform
maturity, reliability, and scalability. Each phase completes within a two-week
sprint with clear Definition of Done criteria.

**Legend:**

- 🟢 Complete
- 🟡 In Progress
- ⚪ Planned
- 🟦 On Hold

---

## Phase 1: Security & CI/CD Hardening 🟢 COMPLETE

**Duration:** Sprint 1 (Week 1-2)  
**Status:** ✅ SHIPPED  
**Target Version:** v1.5+

### Goals

- Eliminate all security findings from SonarQube
- Establish CI/CD security gates and secret scanning
- Remove hardcoded credentials from database scripts
- Enforce GitHub Actions branch protection

### Deliverables

- [x] **SQL Sanitization** (39 database files)
  - bcrypt hashes → `__REVOKED_HASH_SET_VIA_APP_RUNTIME__`
  - Password hints removed
  - No plain-text credentials in migrations

- [x] **CI/CD Workflows**
  - GitHub Actions: `ci.yml`, `security.yml`
  - Job-level permissions enforcement
  - Secret scanning on every push
  - Dependency audit integration

- [x] **SonarQube Integration**
  - Analysis triggered on PR/push
  - Quality gate: Zero security blockers
  - Coverage tracking enabled

---

## Phase 2: SQL Maintainability & Data Quality 🟢 COMPLETE

**Duration:** Sprint 2 (Week 1-2)  
**Status:** ✅ SHIPPED  
**Target Version:** v2.0.0

### Goals

- Enforce SQL best practices repo-wide
- Explicit column selection and ordering
- Reduce query maintenance burden
- Establish data migration patterns

### Deliverables

- [x] **SELECT-star Elimination** (15+ queries)
  - All `SELECT *` replaced with explicit columns
  - Users: `username, role, created_at`
  - Drivers: `driver_id, full_name, username`
  - Alerts: `id, truck_code, type, priority, message, alert_time, is_read`

- [x] **ORDER BY Explicitness** (5+ queries)
  - All `ORDER BY` include ASC/DESC
  - Consistent sorting across queries

- [x] **Duplicate Literal Reduction**
  - Sample data: `@default_location` variable
  - ENUM values extracted where appropriate

- [x] **E2E Test Baseline**
  - 69 Playwright tests passing (EXIT=0)
  - Critical paths validated (login, dashboard, landing)
  - Responsive design verified (mobile/tablet/desktop)

- [x] **New SDK: MCP Server**
  - @ice-truck/mcp-server packaged
  - 4 registered tools: health_check, list_trucks, get_truck, list_alerts
  - TypeScript strict mode enabled

---

## Phase 3: Code Quality & Definition of Done 🟡 IN PROGRESS → COMPLETE

**Duration:** Sprint 3 (Week 1-2)  
**Target Version:** v2.1.0

### Goals

- Enforce TypeScript strict mode across all packages
- Establish Jest coverage thresholds (pragmatic targets)
- Define performance budgets for bundle size and API latency
- Create comprehensive quality documentation

### Deliverables

- [x] **TypeScript Strict Mode** (All 7 tsconfig.json files)
  - ✅ Root: `strict: true` + strict lib checks
  - ✅ Backend: ES2022, strict, node target
  - ✅ Dashboard: ES2022, strict, bundler resolution
  - ✅ Mobile-app: ES2022, strict, React Native JSX
  - ✅ SDK (edge/mobile/mcp-server): All strict enabled
  - **Result:** Zero compilation errors, full type coverage

- [x] **Jest Coverage Thresholds**
  - Backend:
    - Target: 30% statements, 10% branches, 20% functions
    - Current: 34.61% statements, 13.97% branches, 21.55% functions ✅
  - Dashboard:
    - Target: 8% statements (E2E as primary)
    - Current: 8.23% statements ✅
  - **Rationale:** E2E (69 tests) is primary validation; unit tests supplement business logic

- [x] **Performance Budgets**
  - Bundle size limits defined in `.budgetrc.json`:
    - Dashboard main chunk: ≤200KB gzipped (target)
    - Landing page: ≤80KB gzipped
  - API response time: P95 < 100ms
  - FirstContentfulPaint: < 1.5s target

- [x] **Quality Documentation**
  - `docs/DEFINITION_OF_DONE.md`: 7 criteria chapters
  - `docs/DEVELOPER_GUIDE.md`: 8 sections with code examples
  - `docs/TESTING.md`: Testing pyramid & examples (pending)
  - Connected to CI/CD branch protection rules

### Current Metrics

| Metric             | Target     | Current            | Status |
| ------------------ | ---------- | ------------------ | ------ |
| TypeScript Strict  | 100%       | 100% (7/7 configs) | ✅     |
| E2E Tests          | 69         | 69 passing         | ✅     |
| Backend Coverage   | ≥30% stmts | 34.61%             | ✅     |
| Dashboard Coverage | ≥8% stmts  | 8.23%              | ✅     |
| Security Findings  | 0          | 0                  | ✅     |
| Bundle Size        | ≤200KB     | ~104KB             | ✅     |

---

## Phase 4: Documentation & Governance 🟡 IN PROGRESS

**Duration:** Sprint 3-4 (Week 2-3)  
**Target Version:** v2.1.0

### Goals

- Create comprehensive developer experience documentation
- Establish governance model and decision-making process
- Improve onboarding for new team members
- Document architecture decisions (ADRs)

### Deliverables

- [x] **Definition of Done** (7 chapters)
  - Code quality, testing, security, review, performance, database, deployment
  - Enforced via GitHub branch protection
  - Exemptions policy + continuous improvement

- [x] **Developer Guide** (8 sections with examples)
  - Getting started (5 min setup)
  - Development environment (Docker compose)
  - Git & branching workflow (commit message format)
  - Code patterns (TypeScript, error handling, SQL, React)
  - Testing (pyramid strategy, examples, commands)
  - Debugging & troubleshooting (common issues table)
  - Performance tips (bundle analysis, query optimization)
  - Security checklist (Pre-commit, examples)

- [ ] **Architecture Decision Records (ADRs)** (PENDING)
  - ADR-001: Event-driven messaging (Kafka vs in-memory)
  - ADR-002: TimescaleDB for time-series data
  - ADR-003: Playwright for E2E (vs Cypress)
  - ADR-004: Next.js App Router (vs Pages Router)

- [ ] **API Documentation** (PENDING)
  - OpenAPI 3.1 spec for all v1 endpoints
  - Request/response examples for each endpoint
  - Error code reference (400, 401, 404, 500, etc.)
  - Webhook documentation

- [ ] **Glossary** (PENDING)
  - Domain terminology (truck, shop, geofence, alert, etc.)
  - Acronyms (MQTT, RBAC, JWT, etc.)

### Owners

- **Definition of Done:** @PATTANAKORN025
- **Developer Guide:** @PATTANAKORN025
- **ADRs:** TBD
- **API Docs:** TBD

---

## Phase 5: Roadmap & Issue Tracking 🟡 IN PROGRESS

**Duration:** Sprint 4 (Week 1-2)  
**Target Version:** v2.1.0

### Goals

- Define a 6-month feature roadmap
- Establish GitHub Issues taxonomy and templates
- Organize backlog by epic and priority
- Set sprint capacity planning guidelines

### Deliverables

- [x] **This Roadmap Document**
  - Major phases with clear goals
  - Phased delivery across 6 months
  - Success metrics and owners

- [ ] **GitHub Issue Templates** (PENDING)
  - Feature request: Title, description, acceptance criteria, wireframes
  - Bug report: Title, reproduction steps, expected/actual behavior, environment
  - Documentation: Title, scope, audience
  - Questions: Title, context, accepted answers

- [ ] **GitHub Labels** (PENDING)
  - Priority: `P0-critical`, `P1-high`, `P2-medium`, `P3-low`
  - Type: `feature`, `bug`, `chore`, `documentation`, `question`
  - Status: `backlog`, `in-progress`, `review`, `blocked`, `done`
  - Module: `backend`, `frontend`, `mobile`, `infra`, `docs`

- [ ] **GitHub Milestones** (PENDING)
  - Sprint 1-12 (2-week each)
  - Release versions (v2.1.0, v2.2.0, etc.)

- [ ] **Project Board** (PENDING)
  - Kanban board: Backlog → In Progress → Review → Done
  - Automated transitions on PR/issue state changes

- [ ] **Capacity Planning** (PENDING)
  - 2-week sprint velocity target
  - 60% feature work, 20% bug fixes, 20% technical debt
  - On-call/support rotation (if applicable)

---

## Planned Phases (6-Month Vision) ⚪ FUTURE

### Phase 6: Advanced Testing & Observability (Weeks 9-10)

- Load testing suite (k6)
- Integration test coverage (>90%)
- Distributed tracing (Jaeger + OpenTelemetry)
- Custom Grafana dashboards for KPIs

### Phase 7: Mobile App Parity (Weeks 11-12)

- iOS: App Store deployment
- Android: Google Play deployment
- Offline-first synchronization
- Push notifications (FCM + APNs)

### Phase 8: Advanced Features (Weeks 13-16)

- Machine learning alerting (anomaly detection)
- Driver behavior scoring (harsh acceleration, speeding, idling)
- Route optimization (OSRM integration)
- Temperature trend forecasting

### Phase 9: Scale & Resilience (Weeks 17-20)

- Horizontal scaling (Kubernetes HPA)
- Database replication & failover
- Global CDN for static assets
- Multi-region deployment

### Phase 10: Enterprise Readiness (Weeks 21-24)

- SSO/SAML integration
- Data export & compliance (GDPR, data residency)
- Advanced RBAC (row-level security)
- Audit log retention & analysis

---

## Release Schedule

| Release | Target Date     | Focus                   | Features                                              |
| ------- | --------------- | ----------------------- | ----------------------------------------------------- |
| v2.0.0  | March 2026      | Code Quality            | Security hardening, SQL cleanup, E2E baseline         |
| v2.1.0  | Mid-April 2026  | Definition of Done      | TypeScript strict, coverage thresholds, documentation |
| v2.2.0  | Late April 2026 | Testing & Observability | Load testing, tracing, monitoring                     |
| v2.3.0  | May 2026        | Mobile Parity           | iOS/Android stores, offline sync, push notifications  |
| v3.0.0  | June 2026       | Enterprise Ready        | SSO, SAML, data exports, advanced RBAC                |

---

## How to Contribute

1. **Check roadmap** for planned work (this document)
2. **Look for open issues** with `help-wanted` or `good-first-issue` labels
3. **Review Definition of Done** (`docs/DEFINITION_OF_DONE.md`) before starting
4. **Follow Developer Guide** (`docs/DEVELOPER_GUIDE.md`) for setup & patterns
5. **Make a PR** with clear commit messages and test coverage
6. **Request review** from maintainers, address feedback
7. **Merge** when all CI checks pass

---

## Contact

- **Project Lead:** @PATTANAKORN025
- **Slack Channel:** #ice-truck-dev
- **Issues:** GitHub Issues page with templates
- **Discussions:** GitHub Discussions for larger decisions

---

Last updated: **March 17, 2026** ✅
