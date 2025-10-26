# Deployment checklist

Use this focused checklist to deploy the backend and dashboard to production with sensible defaults.

## Backend (API + WS)

Environment (example):

- `NODE_ENV=production`
- `PORT=5000` (or your choice, typically behind a reverse proxy)
- `JWT_SECRET` – long, randomly generated
- `DATABASE_URL` – e.g., Prisma connection string if applicable
- `CORS_ORIGINS` – comma-separated list of allowed origins (e.g., `https://app.your-domain.com`)
- `DISABLE_RATE_LIMIT=false` (ensure rate limiting is enabled in prod)

Hardening:

- CORS: allow only configured origins; `credentials: true` if cookies are used
- Rate limiting: global enabled; stricter per-route limit on `POST /api/v1/auth/login`
- Input validation/sanitization: trim and validate auth payloads (already in place)
- Security headers: enable Helmet (CSP as needed per your CDN/fonts/maps)
- TLS: terminate at reverse proxy (e.g., nginx) with HSTS; set `trust proxy` if applicable

Observability:

- Health: `GET /api/v1/health`
- Metrics: Prometheus endpoint exposed (configure scrape job)

## Dashboard (Next.js 15 + React 19)

Environment (see `dashboard/.env.production.example`):

- `NODE_ENV=production`
- `NEXT_PUBLIC_API_URL=https://api.your-domain.com` (public backend URL)
- Feature flags: `NEXT_PUBLIC_THREE_HERO=1` (or `0` to disable 3D hero)
- Sentry: `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`
- Disable demo: `DEMO_LOGIN=false`

Build & runtime:

- Ensure the build uses the correct env vars (CI/CD injects them at build time)
- Serve behind a reverse proxy with gzip/brotli enabled
- Verify route guards and logout flow (sessionStorage is cleared on logout)

Performance & quality gates:

- Lint & type-check must pass with zero warnings
- Size budgets/limits enforced (as configured)
- Storybook a11y checks (if part of your CI)

## Networking & proxy (nginx)

- Terminate TLS at nginx
- Proxy `/` to dashboard, `/api/` and `/ws` to backend
- Set appropriate timeouts for long-running WS connections
- Apply standard security headers at the edge (CSP, X-Frame-Options, Referrer-Policy)

## Post-deploy smoke tests

- Load dashboard, ensure `LIVE` indicator reflects realtime updates
- Login/logout (invalid → error; valid → session established; logout clears session)
- API CORS preflight works only for allowed origins
- Error boundary renders a branded fallback when a client error is thrown and reports to Sentry

## Optional: Sentry source maps

If you choose to upload source maps, consult Sentry's Next.js docs and provide `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in CI.

## Notes

- Keep secrets out of the repo; use your platform's secret manager or key vault
- Rotate `JWT_SECRET` periodically and monitor login rate-limit metrics
- Review CSP for any third-party scripts (maps, analytics, Sentry replay)
