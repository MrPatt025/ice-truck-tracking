# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- Dashboard: Lazy-load heavy Recharts components via dynamic imports to reduce initial bundle size; resolved duplicate identifier issues in `page.tsx` by scoping sparkline import.
- Dashboard: Token handling unified across `fetchJSON`, `apiClient`, and `AuthContext` with dual-key support (`authToken` primary, mirrored to `auth_token`).
- Dashboard: Quiet Sentry/OpenTelemetry dev warnings by switching `ErrorBoundary` to dynamically import `@sentry/nextjs` in `componentDidCatch`.
- Dashboard: Removed server-side Sentry import in `apiClient` and switched to lazy, client-only breadcrumbs to eliminate Next build warnings from OpenTelemetry/require-in-the-middle.
- Dashboard: Switched Sentry usage to `@sentry/browser` (client-only) for breadcrumbs and error capture to avoid bundling server OpenTelemetry in builds and remove critical-dependency warnings.
- Dashboard: Disabled server-side Sentry init (`sentry.server.config.ts` is now a no-op) to fully eliminate OTel/`require-in-the-middle` warnings.
- Dashboard: Moved `ThemeProvider` into `Providers`; root layout now wraps as `Providers -> AuthProvider -> children`.
- Backend: Stabilized Windows test runs by adding `scripts/prisma-safe-prepare.js` to gracefully handle Prisma EPERM rename cases during pretest.
- Repo: Lint/type-check green; removed invalid per-file ESLint disable that referenced missing React Native rule.

### Changed

- Backend dependencies aligned to Fastify v4-compatible provider versions: `fastify-type-provider-zod@^3`, `zod@^3.23.x`. Root overrides updated to enforce Fastify plugin versions and allow per-package `zod` versions.
- CI workflow updated to Node 20.x with reproducible steps: frozen `pnpm install`, Prettier check, ESLint no-warnings, backend type-check/tests, dashboard type-check/build, and required env vars.
- README updated with Windows Prisma note and a verified "How to run" sequence.

### Notes

- No routes or REST shapes were changed.
- 3D Hero and Maps remain dynamically imported for optimal TTI; mobile degrades handled by existing codepaths.
