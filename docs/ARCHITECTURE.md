# 🏛️ Architecture Overview

## Monorepo Structure

- `backend/` — Node.js/Express API server
- `dashboard/` — Next.js web dashboard
- `mobile-app/` — React Native Expo mobile app
- `sdk/` — Shared SDKs/libraries (edge, mobile)
- `infra/` — Infrastructure as Code (Terraform, K8s, Docker, CI/CD)
- `docs/` — Documentation (architecture & quickstart only)
- Centralized config: ESLint, Prettier, Jest, TS, Husky, lint-staged, commitlint

## Clean Architecture Principles

- **Controllers → Services → Repositories → Database/API**
- **SOLID**: Separation of concerns, testable, maintainable
- **Pure Functions**: Business logic is isolated and testable
- **DTOs & Validation**: All input/output validated at boundaries

## CI/CD & Automation

- **GitHub Actions**: Lint, type-check, build, test, e2e, security, performance, deploy
- **Semantic Release**: Automated versioning, changelog, and tagging
- **TurboRepo**: Fast, incremental builds and tests, remote caching
- **Docker**: Multi-stage builds, production-ready images
- **Terraform/K8s**: Infrastructure as Code, blue/green deploy

## Tooling

- **Code Quality**: ESLint, Prettier, Husky, lint-staged, commitlint, conventional commits
- **Security**: Snyk, npm audit, Helmet, CSP, HSTS, rate limiting, input validation
- **Testing**: Jest (unit/integration), Cypress/Detox (E2E), Stryker (mutation)
- **Release**: semantic-release, changelog automation

## Testing Strategy

- **Unit**: ≥95% coverage (Jest)
- **Integration**: ≥90% (Jest)
- **E2E**: Cypress (web), Detox (mobile)
- **Mutation**: Stryker (≥80% score)

## Security

- **Dependency Scanning**: Snyk, npm audit
- **Headers**: Helmet, CSP, HSTS
- **Rate Limiting**: express-rate-limit
- **Input Validation**: Joi, custom middleware
- **Audit Logging**: Centralized logs, error tracking

## Performance & Observability

- **Metrics**: Prometheus, custom /metrics endpoint
- **Dashboards**: Grafana, business & infra metrics
- **Alerting**: Slack/email, SLO/SLA rules
- **Tracing**: OpenTelemetry (optional), Sentry

## Onboarding & Developer Experience

- **One-command setup**: `npm run bootstrap`
- **Centralized scripts**: All dev/test/build/lint commands at root
- **Docs**: README, this file, inline code comments, [Project Wiki](https://github.com/ice-truck-tracking/ice-truck-tracking/wiki)

---

**For full details, see the [root README](../README.md) and [docs/](./)**
