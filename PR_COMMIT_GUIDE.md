# Quick PR Commit Guide

## PR #1: Fix Backend Test Failures (Critical Bugfix)

**Branch:** `fix/backend-compress-version`

```bash
git add backend/package.json
git commit -m "fix(backend): downgrade @fastify/compress to 7.x for Fastify 4.x compatibility

- Change @fastify/compress from 8.1.0 → ^7.0.3
- Fixes FastifyError: expected '5.x' fastify version, '4.29.1' is installed
- All backend tests now passing (smoke + full suite)

Verified:
- pnpm -F backend test:smoke → PASS (3 tests, 5.29s)
- pnpm -F backend test → PASS (all tests, 16.52s)
- pnpm -F backend typecheck → PASS"
```

**Status:** ✅ Ready to commit
**Files:** `backend/package.json` (@fastify/compress version only)

---

## PR #2: Remove Unused Backend Dependencies

**Branch:** `chore/backend-remove-unused-deps`

```bash
git add backend/package.json
git commit -m "chore(backend): remove unused dependencies

Removed 3 unused production dependencies:
- @sentry/node ^10.21.0 (error monitoring, not implemented)
- fastify-plugin ^5.1.0 (plugin wrapper, using direct registration)
- jsonwebtoken ^9.0.2 (JWT library, using @fastify/jwt instead)

Confirmed unused via:
- Grep search: 0 matches in backend/**/*.ts
- Codebase imports: none found
- knip deadcode: flagged as unused

Updated:
- Removed 3 deps from dependencies section
- Updated deps:audit script to remove @sentry/node from ignore list

Verified:
- pnpm -F backend install → Success (-59 packages)
- pnpm -F backend test → PASS (16.56s)
- pnpm -F backend typecheck → PASS
- pnpm -F backend deadcode → 3 deps no longer flagged"
```

**Status:** ✅ Ready to commit
**Files:** `backend/package.json` (dependencies + deps:audit script)

---

## PR #3: Remove Legacy JS Files (Previously Done)

**Branch:** `chore/backend-cleanup-legacy-js`

**Note:** Files were deleted in previous session. If not yet committed:

```bash
# Stage knip config update (only file changed if legacy JS already deleted)
git add backend/.knip.jsonc

# Verify deletions are staged
git status | grep deleted

# Expected deletions (if not already committed):
# deleted: backend/_legacy/controllers/auth.js
# deleted: backend/_legacy/controllers/health.js
# deleted: backend/_legacy/controllers/metrics.js
# deleted: backend/_legacy/middleware_root/auth.js
# deleted: backend/_legacy/repositories/alertRepository.js
# deleted: backend/_legacy/repositories/driverRepository.js
# deleted: backend/_legacy/repositories/shopRepository.js
# deleted: backend/_legacy/repositories/truckRepository.js
# deleted: backend/_legacy/repositories/userRepository.js
# deleted: backend/_legacy/metricsService.js
# deleted: backend/_legacy/telemetryStore.js
# deleted: backend/html/assets/index-D_ryMEPs.js

git commit -m "chore(backend): remove 12 legacy JS files and update knip config

Deleted files (12 total):
- backend/_legacy/controllers/*.js (3 files: auth, health, metrics)
- backend/_legacy/middleware_root/*.js (1 file: auth)
- backend/_legacy/repositories/*.js (5 files: alert, driver, shop, truck, user)
- backend/_legacy/*.js (2 files: metricsService, telemetryStore)
- backend/html/assets/index-D_ryMEPs.js (1 file: bundled JS asset)

All deleted files were unreferenced legacy JS superseded by TypeScript implementations.

Updated backend/.knip.jsonc:
- Added src/_legacy/** to ignore list (TS files kept for reference)

Verified:
- pnpm -F backend typecheck → PASS
- pnpm -F backend test → PASS
- knip backend deadcode → Unresolved imports gone"
```

**Status:** ⚠️ Check if files already committed; if not, stage and commit now
**Files:** 12 deleted legacy JS + `backend/.knip.jsonc`

---

## PR #4: Add Backend ENV Documentation (Optional - Previously Done)

**Branch:** `docs/backend-env-table`

**Note:** README.md Backend ENVs table was added in previous session.

```bash
git add README.md
git commit -m "docs(backend): add ENV validation table from envalid schema

Added Backend ENVs section to README with table of 16 environment variables:
- NODE_ENV, PORT, CORS_ORIGINS, CORS_ORIGIN
- JWT_SECRET, REQUIRE_AUTH, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW
- ENABLE_WS, DEMO_REGISTER, DEMO_CREDS
- ADMIN_USER, ADMIN_PASS, REQUEST_ID_HEADER
- DATABASE_URL

Table includes:
- Variable names
- Types (string, port, boolean, etc.)
- Default values
- Hardening recommendations

Source: backend/src/env.ts (envalid schema)"
```

**Status:** ⚠️ Check if README.md ENV table already committed
**Files:** `README.md` (Backend ENVs table section)

---

## Combined PR Option (Alternative)

If you prefer **one PR** for all backend cleanup:

**Branch:** `chore/backend-qa-baseline-complete`

```bash
git add backend/package.json backend/.knip.jsonc README.md
git commit -m "chore(backend): complete QA baseline - fix compress, remove unused code/deps

1. Fix @fastify/compress version mismatch (CRITICAL BUGFIX)
   - Downgrade 8.1.0 → ^7.0.3 (Fastify 4.x compatible)
   - Fixes: FastifyError expected '5.x' fastify version
   - All backend tests now passing

2. Remove 12 legacy JS files
   - Deleted unreferenced legacy controllers, middleware, repositories, services
   - Updated backend/.knip.jsonc to ignore src/_legacy/** TS files

3. Remove 3 unused dependencies
   - @sentry/node, fastify-plugin, jsonwebtoken
   - Confirmed unused via grep search (0 matches)
   - Updated deps:audit script ignore list

4. Document backend ENV schema
   - Added ENV table to README (16 vars from envalid)

Verified:
- pnpm -F backend test → PASS (all tests, 16.56s)
- pnpm -F backend typecheck → PASS
- pnpm -F backend deadcode → Unused deps no longer flagged
- Removed 59 npm packages total"
```

---

## Recommended Approach

**Use 3 separate PRs** (cleaner history, easier review):

1. **PR #1** (bugfix, high priority): Fix @fastify/compress version
2. **PR #2** (cleanup): Remove unused deps
3. **PR #3** (cleanup): Remove legacy JS files (if not already committed)

**Merge order:** PR #1 first (critical bugfix), then #2 and #3 in any order.

---

## Post-Commit Verification

After committing all PRs:

```bash
# Pull latest changes
git pull origin main

# Reinstall deps
pnpm install

# Run backend checks
pnpm -F backend check:all
# Expected: typecheck ✅, test ✅, (lint ⚠️ known Tailwind plugin issue)

# Run unused code scans
pnpm run unused:files   # Global knip
pnpm -F backend run deadcode  # Backend knip

# Expected: No unused deps flagged, minimal noise
```

---

## Current Files Ready to Commit

1. ✅ `backend/package.json` - @fastify/compress fix + unused deps removed
2. ✅ `backend/.knip.jsonc` - Updated ignore list (if not committed)
3. ✅ `README.md` - Backend ENVs table (if not committed)
4. ⚠️ 12 deleted legacy JS files (verify with `git status`)

**Reference Docs (don't commit to main):**

- `PR_LEGACY_CLEANUP.md` - Legacy JS removal PR template
- `PR_UNUSED_DEPS.md` - Unused deps removal PR template
- `COMPLETION_SUMMARY.md` - Session summary and verification
- `PR_COMMIT_GUIDE.md` - This file
