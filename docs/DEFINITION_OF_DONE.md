<!-- markdownlint-disable MD041 -->

# Definition of Done (DoD)

## Overview

This document defines the quality gates and acceptance criteria for each pull
request and release in the Ice Truck Tracking platform. All code must satisfy
these criteria before merging.

**Last Updated:** March 22, 2026  
**Phase:** 5 (Release) & beyond  
**Enforced:** GitHub Actions CI, branch protection rules

---

## Pre-Merge Criteria

### 1. Code Quality

- [ ] **TypeScript strict mode**: All code compiles with `--strict` flag
- [ ] **No console errors**: Zero `console.error` or unhandled rejections in logs
- [ ] **Linting**: ESLint passes with zero errors (warnings allowed after review)
- [ ] **Formatting**: Prettier-compliant (auto-fixable)
- [ ] **Type coverage**: ≥ 95% of code paths have explicit types (no `any`)

**Command:**

```bash
pnpm type-check
pnpm lint
pnpm format:check
```

### 2. Testing

#### Unit & Integration Tests

- [ ] **Backend**: Coverage ≥ 30% statements, ≥ 10% branches, ≥ 20% functions
- [ ] **Dashboard**: Coverage ≥ 8% statements (E2E is primary validation)
- [ ] **All tests pass**: Exit code 0 on `pnpm test`
- [ ] **No test flakiness**: Tests must pass consistently on re-run

#### E2E Tests

- [ ] **Dashboard critical paths**: 69 tests passing with `playwright.light.config.ts`
  - Login flow with auth validation
  - Dashboard rendering and interactions
  - Landing page navigation
  - Responsive design (mobile, tablet, desktop)
  - Accessibility compliance
- [ ] **No new E2E regressions**: Baseline = 69 tests passing

#### Mutation Testing

- [ ] **Stryker mutation score**: ≥ 80% for changed services
- [ ] **Interpretation**: >80% of intentional code mutations are caught by tests

**Commands:**

```bash
# All tests
pnpm test

# With coverage report
pnpm test --coverage

# E2E only
pnpm test:e2e

# Mutation testing
pnpm test:mutation
```

### 3. Security

- [ ] **No hardcoded secrets**: Credentials only via environment variables
  - Pattern: No `password`, `token`, `api_key`, `secret` literals in code
  - Exception: Placeholder constants like `CHANGE_ME_` are acceptable for dev
- [ ] **SQL injection protection**: All SQL uses parameterized queries
- [ ] **Dependency audit**: `pnpm audit` returns 0 high or critical vulnerabilities
- [ ] **SonarQube scan**: PASS (no blockers, security hotspots documented)
- [ ] **bcrypt hashes**: All embedded hashes replaced with `__REVOKED_HASH_SET_VIA_APP_RUNTIME__`
  - Reason: Hashes should only be generated or stored at runtime via `bcrypt.hash()`

**Commands:**

```bash
pnpm security:audit
pnpm --filter @ice-truck/backend run security:audit
```

### 4. Code Review

- [ ] **GitHub PR review approval**: ≥ 1 approving review (maintainer)
- [ ] **CI passes**: All GitHub Actions workflows pass (green checkmarks)
- [ ] **No merge conflicts**: Branch is up-to-date with `main`
- [ ] **Commit messages**: Follow Conventional Commits (`feat:`, `fix:`, `chore:`)
- [ ] **Documentation**: Code is self-documenting or has comments for complex logic

### 5. Performance

- [ ] **Bundle size**: Dashboard ≤ 200KB gzipped (main chunk)
  - Check: Next.js build output shows route sizes
- [ ] **API response time**: P95 < 100ms for baseline queries
  - Validated via: E2E tests and smoke or load testing
- [ ] **Database queries**: All new queries have `EXPLAIN ANALYZE` review
- [ ] **No performance regressions**: Pagespeed Insights score unchanged

**Validation:**

```bash
# Build and check bundle sizes
cd dashboard && pnpm run build
# Review output: "Route (app)" section shows page sizes

# Load test
k6 run tests/k6/baseline.js
```

### 6. Database

- [ ] **SQL migrations reviewed**: Database schema changes explicit in `backend/database/`
- [ ] **SELECT queries explicit**: No `SELECT *`; list columns explicitly
- [ ] **ORDER BY explicit**: Include `ASC` or `DESC`
- [ ] **Backwards compatible**: Migrations do not break existing deployments
- [ ] **No duplicate literals**: Repeated values extracted to variables

### 7. Deployment Readiness

- [ ] **Environment variables documented**: All new `.env` vars listed in `backend/env.example`
- [ ] **Docker image builds**: `docker build -f Dockerfile .` succeeds with no warnings
- [ ] **Health check passes**: `GET /api/v1/health` returns 200 in <100ms
- [ ] **No unhandled process exits**: Container gracefully handles termination signals

---

## Release Criteria (Additional)

For production releases or tags:

- [ ] **Version bump**: Update `package.json` version following semantic versioning
- [ ] **Changelog**: Update `CHANGELOG.md` with user-facing changes
- [ ] **Breaking changes documented**: Major versions clearly document migration steps
- [ ] **Release notes**: GitHub Release created with user-friendly summary
- [ ] **Smoke test**: Manual verification in staging environment
- [ ] **Rollback plan**: Document how to revert if critical issues are discovered

---

## Quality Metrics Dashboard

| Metric                        | Target          | Current      | Trend                                       |
| ----------------------------- | --------------- | ------------ | ------------------------------------------- |
| E2E Test Pass Rate            | 100%            | 100% (69/69) | ✅ Stable                                   |
| TypeScript Strict             | 100%            | 100%         | ✅ Strict enabled all packages              |
| Security Findings (SonarQube) | 0               | 0            | ✅ No bcrypt hashes, secrets, SQL injection |
| Test Coverage (Backend)       | ≥30% statements | 34.61%       | ✅ Meets targets                            |
| Test Coverage (Dashboard)     | ≥8% statements  | 8.23%        | ✅ At baseline (E2E primary)                |
| Bundle Size (Dashboard)       | ≤200KB gzipped  | ~104KB       | ✅ Well under budget                        |
| API P95 Latency               | <100ms          | ~50-80ms     | ✅ Excellent                                |
| Dependency Vulnerabilities    | 0 high/critical | 0            | ✅ Clean audit                              |

---

## CI/CD Integration

All criteria are enforced via GitHub Actions:

### Required Status Checks (Branch Protection)

1. ✅ `test-backend` — Jest tests plus coverage validation
2. ✅ `test-dashboard` — Build plus unit tests plus coverage
3. ✅ `test-e2e` — Playwright E2E suite (69 tests)
4. ✅ `lint` — ESLint, Prettier, and type checking
5. ✅ `security` — Snyk plus dependency scan
6. ✅ `sonarqube` — Code quality analysis

### PR Checks (Non-blocking Information)

- 📊 Bundle size analysis (informational comment on PR)
- 📈 Performance timing (if Lighthouse integration enabled)
- 📝 Code coverage delta (trend comment)

---

## Exemptions & Waivers

Very rarely, criteria may be waived with explicit **maintainer approval** and a
**documented reason**.

### Valid Exemption Reasons

1. **Critical security patch**: Emergency hotfix skips E2E regression if time-sensitive
   - Requirement: Hotfix must be isolated to minimal scope
2. **Performance tradeoff**: Intentional bundle size increase documented in PR comment
   - Requirement: Must reduce latency or improve UX proportionally
3. **Legacy payload coverage**: Existing dead code or tests with <8% coverage
   - Requirement: Documented as technical debt for a later phase refactoring

### Invalid Exemptions

- ❌ "Too busy" or "We'll fix it later"
- ❌ "My linter config is broken"
- ❌ Hardcoded secrets (always unacceptable)
- ❌ Skipped tests or `test.skip()`

---

## Continuous Improvement

This DoD is reviewed every sprint and updated based on:

- New security vulnerabilities discovered
- Technical debt accumulation (for example, coverage threshold adjustments)
- Team feedback and learnings from production incidents
- Industry best practices and tool updates

**Last Modified:** `git log docs/DEFINITION_OF_DONE.md`  
**Maintainers:** @PATTANAKORN025
