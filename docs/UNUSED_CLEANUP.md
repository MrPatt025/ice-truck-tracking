# Unused Code Cleanup — Shortlist (Safe, Incremental)

This document summarizes low-risk cleanup opportunities based on the latest reports:

- `unused-exports.txt` (ts-prune)
- `unused-files-backend.txt` (knip on backend)
- `unused-deps.txt` (depcheck at root)

The goal is to propose conservative removals/changes that won’t affect runtime behavior.

## Top candidates (safe to remove)

- Backend legacy JS files (not referenced by TS code):
  - `backend/_legacy/**/*.js` (controllers, middleware_root, repositories, services)
- Generated/static artifact not used by server:
  - `backend/html/assets/index-*.js`

Rationale: These files are not referenced by current TypeScript entry points and appear to belong to a previous stack.

## Candidates to keep (likely false-positives)

- Root `unused-deps.txt` flags many devDependencies that are used across workspaces or via CLIs (ESLint, Playwright, Vitest, etc.). Treat root depcheck as advisory only and prefer per-package checks.
- Backend `Unused devDependencies`: ESLint and lint-staged entries are used by tooling and CI hooks; keep.

## Dependencies to revisit (backend)

- Marked unused by knip: `@sentry/node`, `fastify-plugin`, `jsonwebtoken`
  - `fastify-plugin` is often used when exporting custom plugins; if not used anymore, consider removing or moving to devDeps.
  - `@sentry/node` and `jsonwebtoken` may be stale if the new auth/observability paths don’t rely on them. Confirm before removal with a project-wide search.

## Follow-up PR plan

1. Remove legacy JS tree:
   - Delete `backend/_legacy/**/*.js`
   - Delete `backend/html/assets/index-*.js`
   - Verify: `pnpm -F backend typecheck && pnpm -F backend test`

2. Dependency trim (backend):
   - If verified unused, remove `fastify-plugin`, `@sentry/node`, `jsonwebtoken` from `backend/package.json`
   - Verify and run: `pnpm -F backend install && pnpm -F backend check:all`

3. Re-run hygiene reports and update this doc:
   - `pnpm run unused:exports > unused-exports.txt`
   - `pnpm -F backend run deadcode > unused-files-backend.txt`
   - `pnpm run unused:deps > unused-deps.txt`

## Notes

- Prefer small PRs with one logical change (e.g., legacy file removal only) to reduce risk.
- Attach before/after report snippets in the PR description for traceability.
- If any deletion touches code paths near auth or Prisma, add a smoke test run summary to the PR.
