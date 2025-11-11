# Branch Protection Rules

This document outlines the required branch protection settings for the repository.

## Protected Branches

### `main` (Production)

**Required Status Checks:**

- ✅ All CI checks must pass before merge
- ✅ `all-checks-passed` job must succeed
- ✅ Require branches to be up to date before merging

**Required Checks:**

1. `📋 Lint (Prettier + ESLint + Markdown)`
2. `🔍 TypeScript Type Check`
3. `🧪 Unit Tests (Backend + Dashboard)`
4. `♿ Accessibility Tests (Axe)`
5. `🎭 E2E Tests (Playwright)`
6. `🏗️ Production Build`
7. `📊 Bundle Analysis & Performance`
8. `✅ All CI Checks Passed`

**Merge Requirements:**

- ✅ Require pull request reviews (minimum 1)
- ✅ Dismiss stale PR reviews when new commits are pushed
- ✅ Require review from code owners (if CODEOWNERS file exists)
- ✅ Require status checks to pass
- ✅ Require conversation resolution before merging
- ✅ Require signed commits (recommended)
- ❌ Allow force pushes: **DISABLED**
- ❌ Allow deletions: **DISABLED**

**Additional Rules:**

- Restrict who can push to matching branches (admins only)
- Require linear history (optional, prevents merge commits)

### `develop` (Staging/Integration)

**Required Status Checks:**

- ✅ All CI checks must pass (same as main)
- ✅ `all-checks-passed` job must succeed

**Merge Requirements:**

- ✅ Require pull request reviews (minimum 1)
- ✅ Require status checks to pass
- ❌ Allow force pushes: **DISABLED**

## CI Pipeline Stages

The CI pipeline enforces strict quality gates in this order:

```
┌──────────────────────────────────────────────────────────────┐
│                      CI PIPELINE FLOW                        │
└──────────────────────────────────────────────────────────────┘

1. 📋 LINT (fail fast)
   ├─ Prettier format check
   ├─ ESLint (zero warnings)
   └─ Markdownlint
        ↓
2. 🔍 TYPECHECK
   ├─ Backend TypeScript
   └─ Dashboard TypeScript
        ↓
3. 🧪 UNIT TESTS
   ├─ Backend unit tests
   └─ Dashboard unit tests
        ↓
4. ♿ A11Y TESTS
   ├─ jest-axe unit tests
   └─ Playwright + Axe E2E
        ↓
5. 🎭 E2E TESTS
   └─ Full Playwright suite
        ↓
6. 🏗️ BUILD
   ├─ Dashboard production build
   └─ Backend build
        ↓
7. 📊 ANALYZE
   ├─ Bundle size analysis
   └─ Performance metrics
        ↓
8. ✅ FINAL GATE
   └─ All checks must pass
```

## Setting Up Branch Protection (GitHub UI)

### Step 1: Navigate to Settings

1. Go to repository **Settings**
2. Click **Branches** in left sidebar
3. Click **Add rule** under "Branch protection rules"

### Step 2: Configure Main Branch

**Branch name pattern:** `main`

**Protect matching branches:**

- [x] Require a pull request before merging
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners
  - [x] Require approval of the most recent reviewable push
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - **Status checks that are required:**
    - `📋 Lint (Prettier + ESLint + Markdown)`
    - `🔍 TypeScript Type Check`
    - `🧪 Unit Tests (Backend + Dashboard)`
    - `♿ Accessibility Tests (Axe)`
    - `🎭 E2E Tests (Playwright)`
    - `🏗️ Production Build`
    - `📊 Bundle Analysis & Performance`
    - `✅ All CI Checks Passed`
- [x] Require conversation resolution before merging
- [x] Require signed commits (recommended)
- [x] Require linear history (optional)
- [x] Include administrators (recommended)
- [x] Restrict who can push to matching branches
- [x] Do not allow bypassing the above settings

### Step 3: Configure Develop Branch (Optional)

**Branch name pattern:** `develop`

Same settings as `main`, but optionally:

- Lower review requirements to encourage faster iteration
- Allow rebasing/force-push for maintainers (with caution)

## Enforcement Policy

### What Gets Blocked?

**Pull Requests will be BLOCKED if:**

- ❌ Any lint error exists (Prettier, ESLint, Markdown)
- ❌ TypeScript compilation fails
- ❌ Any unit test fails
- ❌ Accessibility violations (serious/critical Axe findings)
- ❌ E2E test failures
- ❌ Production build fails
- ❌ Bundle size exceeds thresholds (when configured)
- ❌ Missing required approvals
- ❌ Unresolved PR conversations

### What Gets Warned?

**CI will warn but NOT block for:**

- ⚠️ Bundle analysis not configured (continue-on-error: true)
- ⚠️ Optional E2E tests not yet implemented
- ⚠️ Backend build not configured

These warnings should be addressed in future phases.

## Local Development Workflow

Before pushing, run local checks:

```bash
# Full CI simulation locally
pnpm lint              # Prettier + ESLint
pnpm typecheck         # TypeScript across all packages
pnpm test              # All unit tests
pnpm test:a11y         # Accessibility tests
pnpm test:e2e          # E2E tests
pnpm build             # Production build

# Quick pre-commit check
pnpm lint && pnpm typecheck
```

## Rollout Plan

### Phase 1: Soft Enforcement (Current)

- ✅ CI runs all checks
- ⚠️ Failures reported but don't block
- 📊 Team reviews reports and fixes issues

### Phase 2: Staged Hardening (Next)

1. Enable branch protection for `main`
2. Make `lint` + `typecheck` blocking
3. Make `unit-tests` blocking
4. Monitor for false positives

### Phase 3: Full Enforcement (Final)

- ✅ All 7 stages blocking
- ✅ No bypasses allowed
- ✅ Require signed commits
- ✅ Linear history enforced

## Troubleshooting

### "Status check has not run on this commit"

- Push a new commit to trigger CI
- Or close and reopen the PR

### "Required status check is expected"

- Check if CI workflow ran successfully
- Verify the job names match exactly (case-sensitive)

### "Check suite has not run"

- GitHub Actions may be disabled for the repo
- Check Actions tab for workflow run status

### Emergency Bypass

**Only for critical production hotfixes:**

1. Admin creates branch from `main`
2. Apply fix
3. Admin merges with override (document reason)
4. Follow-up PR to add tests

## References

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
