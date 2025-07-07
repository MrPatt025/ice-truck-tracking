# Architecture Overview

## Monorepo Structure

- `apps/` — Application code (backend, dashboard, mobile-app)
- `packages/` — Shared libraries/SDKs
- Centralized config: ESLint, Prettier, Jest, TS, Husky, lint-staged, commitlint

## Clean Architecture

- Controllers → Services → Repositories → Database/API
- SOLID, separation of concerns, pure functions, testable

## CI/CD

- GitHub Actions: lint, type-check, build, test, e2e, security, performance, deploy
- Semantic Release: auto version/tag/release note

## Tooling

- Husky, lint-staged, commitlint, conventional commits
- Stryker (mutation testing), Snyk (security), Prettier, ESLint

## Testing

- Unit: ≥95% coverage, Integration: ≥90%, E2E: Cypress
- Mutation testing: Stryker

## Security

- npm audit, Snyk, Helmet, CSP, HSTS, rate limit, input sanitization

## Performance/Observability

- Compression, caching, DB pooling, OpenTelemetry, Prometheus, Grafana, Sentry

## Onboarding

- One command setup: `npm run bootstrap`
- Docs: README, this file, inline code comments
