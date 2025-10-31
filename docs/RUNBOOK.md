# Ice Truck Tracking — Operations Runbook

This runbook equips on-call and contributors with environment setup, common procedures, troubleshooting steps, and SLO/alert guidance. New developer onboarding target: < 15 minutes.

## Quick start (≤ 15 minutes)

Prereqs

- Node 20+, pnpm 9+
- Docker Desktop (for backend DB and services via `docker-compose`)
- Map API key (TomTom)

Setup

1. Install deps at repo root
   - pnpm install

2. Bring up backend dependencies
   - docker compose up -d

3. Configure environment
   - Copy `backend/env.example` to `.env` files as needed
   - Dashboard env (set at `dashboard/.env.local`):
     - Recommended (dev proxy): do NOT set `NEXT_PUBLIC_API_URL` (Next dev proxies `/api` → `http://localhost:5000`)
     - Optional (direct API): `NEXT_PUBLIC_API_URL=http://localhost:5000`
     - `NEXT_PUBLIC_TOMTOM_API_KEY=YOUR_TOMTOM_KEY`
     - `NEXT_PUBLIC_E2E=0`
     - OPTIONAL: `NEXT_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN` (prod only)

4. Start apps
   - pnpm --filter @dashboard dev
   - pnpm --filter @backend dev (if applicable)

Verification

- Open <http://localhost:3000> → expect redirect to `/login` when not authenticated
- After login, `/dashboard` shows map and telemetry widgets

## Common commands

- Typecheck: pnpm --filter @dashboard type-check
- Lint: pnpm --filter @dashboard lint
- Unit tests: pnpm --filter @dashboard test
- E2E tests: pnpm --filter @dashboard test:e2e
- Build: pnpm --filter @dashboard build
- Analyze bundle: ANALYZE=true pnpm --filter @dashboard build

CI gates (PR): commitlint, typecheck, lint, unit, build, size-limit, E2E, preview deploy.

### Dev API health and auth smoke (curl)

Health:

```sh
curl -i http://localhost:5000/api/v1/health
```

Auth (when calling backend directly, not via proxy):

```sh
# CORS precheck for dev origin
curl -i \
   -H "Origin: http://localhost:3000" \
   -H "Content-Type: application/json" \
   -X POST http://localhost:5000/api/v1/auth/login \
   --data '{"username":"admin","password":"password"}'
# Expect: Access-Control-Allow-Origin: http://localhost:3000
#         Access-Control-Allow-Credentials: true
#         Set-Cookie: auth_token=...
```

## Feature flags and test toggles

- `NEXT_PUBLIC_E2E=1` → deterministic client flows during E2E (guards bypass, fixed refresh interval)
- `ANALYZE=true` → enables bundle analyzer

## Security and privacy

- CSP: Enforced via Next headers. Allowed externals restricted to TomTom maps/tiles and a CDN. See `dashboard/next.config.ts`.
- Cookies: Auth cookie is HttpOnly, SameSite=Lax, Secure in prod, set by API routes `/api/session/set|clear`. Middleware reads `authToken|auth_token` only.
- Sentry: Client SDK auto-initialized in production only. PII scrubbing enabled via `beforeSend` (passwords, tokens, email, phone redacted).
- Secrets: Must be provided via environment variables; no hardcoded secrets in repo.

## Troubleshooting

Map doesn’t load

- Ensure `NEXT_PUBLIC_TOMTOM_API_KEY` is set and valid
- Check console for TomTom domain CSP violations; CSP allows `*.tomtom.com`

CORS/API failures

- Verify `NEXT_PUBLIC_API_URL`; the backend must respond at that origin
- Network error in login often indicates backend unavailable

Stale telemetry indicators

- Staleness thresholds come from shared utils; if all items show stale, confirm backend data timestamps and client clock skew

Login redirects loop

- Middleware relies on HttpOnly auth cookie; ensure `/api/session/set` was called after login
- In dev, clear cookies and localStorage for `authToken` and retry

E2E server won’t start on Windows

- Playwright config sets env via cross-env for compatibility
- Ensure no process is already bound to the configured port (default 3000)

“App router invariant” or jest-dom matcher errors in tests

- Ensure Jest setup runs (`jest.setup.ts` imports `@testing-library/jest-dom` and mocks `next/navigation`)

Bundle too large / CI fails size-limit

- Run build with `ANALYZE=true` to inspect heavy modules and enable `optimizePackageImports`

## On-call procedures

Incident intake

- Check Grafana/Prometheus dashboards (monitoring/) for latency, error rate, and staleness panels
- Review recent deploy (GitHub Actions), and Vercel preview comments for context

Known remediation steps

- Restart backend services via Docker if API is down
- Roll back recent release via GitHub if client regression suspected
- Temporarily set `NEXT_PUBLIC_E2E=1` in Preview to bypass strict guards for triage, revert afterward

## SLOs and alerting (guidance)

- Availability: API 99.9% monthly
- Latency: p95 < 300 ms for GET /telemetry; p95 < 500 ms for POST /auth/login
- Telemetry freshness: < 10 seconds lag p95
- Client error budget: JS error rate < 2% sessions

Alert thresholds

- API 5xx rate > 2% for 5 minutes → page on-call
- Telemetry ingest lag > 15s for 5 minutes → warn
- Frontend `Map init failure` logs > 50 in 10 minutes → investigate map key or CSP

## Change management

- Conventional Commits enforced; semantic-release on main
- All PRs must pass CI gates and size-limit
- Preview deploy links posted on PR for verification

## References

- Next config: `dashboard/next.config.ts`
- Auth and cookies: `dashboard/src/shared/auth/AuthContext.tsx`, `dashboard/src/app/api/session/*`
- Middleware guards: `dashboard/middleware.ts`
- Tests: `dashboard/tests/*`, `dashboard/e2e/*`
- Sentry config: `dashboard/sentry.client.config.ts`
