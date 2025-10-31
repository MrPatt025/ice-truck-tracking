# Release v1.0.0-rc1

**Status**: Release Candidate ✅

**Date**: 2025-10-30

Node version (recommended):

- Node >= 20.19.0

Required environment variables for local dev:

- NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
- BACKEND_API_BASE_URL=http://localhost:5000/api/v1

Known-good dev credentials:

- admin / password
- demo / demo (when DEMO_REGISTER/DEMO_CREDS enabled)

Required ports:

- Backend: http://localhost:5000
- Dashboard: http://localhost:3000

Auth contract:
Auth flow is cookie-based. Do not introduce localStorage/sessionStorage tokens without updating middleware + README + tests.

Smoke test:

- Run from repo root while backend is running:

  pnpm smoke

This will POST /api/v1/auth/login and then GET /api/v1/auth/me using cookies and print `SMOKE LOGIN: PASS` on success.

Notes:

- Quality Gates:
  - Dashboard lint: 0 errors, 3 warnings (generated code + unused directive) → acceptable
  - Dashboard build: PASS (routes: /login 5.49 kB, /dashboard 46.3 kB)
  - Backend tests: 161/161 PASS
  - Backend coverage: Statements 92.68%, Branches 80.30%, Functions 98.07%, Lines 92.68%
- All frontend code must use resource-only paths (e.g. `api.post('auth/login')`) that go through the shared API client so the base URL and /api/v1 prefix are applied consistently.
- Do not change the AUTH FLOW without updating `dashboard/src/app/login/page.tsx`, `dashboard/middleware.ts`, `backend/src/index.ts`, `RELEASE_NOTES.md`, and `scripts/smoke-login.mjs`.

## Known Issues

- No `size` script defined in dashboard package.json (bundle size validation not automated).
