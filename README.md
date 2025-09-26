# 🚚❄️ Ice Truck Tracking Platform

[![CI](https://github.coMrPatt025/ice-truck-trackingtruck-tracking/ice-truck-tracking/actions/workflows/ci.yml/badge.svg)](https://github.com/ice-truck-tracking/ice-truck-tracking/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/MrPatt025/ice-truck-tracking/badge.svg?branch=main)](https://coveralls.io/github/ice-truck-tracking/ice-truck-tracking?branch=main)
[![Li(https://img.shields.io/badge/lint-passing-brightgreen)](./)
[![Security Audit](https://img.shields.io/badge/security-audit-passing-brightgreen)](https://github.com/ice-truck-tracking/ice-truck-tracking/security)
[![Release](https://img.shields.io/github/v/release/ice-truck-tracking/ice-truck-tracking)](https://github.com/ice-truck-tracking/ice-truck-tracking/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Enterprise-grade monorepo for real-time cold-chain tracking, analytics, and cloud operations.**

---

## Table of Contents

* [Overview](#overview)
* [Monorepo Layout](#monorepo-layout)
* [Prerequisites](#prerequisites)
* [Quick Start](#quick-start)
* [Development](#development)
* [Architecture](#architecture)
* [Technology Stack](#technology-stack)
* [Key Features](#key-features)
* [Packages & Apps](#packages--apps)
* [Configuration](#configuration)
* [Scripts](#scripts)
* [Testing & Quality](#testing--quality)
* [CI/CD](#cicd)
* [Security](#security)
* [Observability](#observability)
* [Deployment](#deployment)
* [Roadmap](#roadmap)
* [Documentation](#documentation)
* [Contributing](#contributing)
* [Community & Support](#community--support)
* [License](#license)

---

## Overview

**Ice Truck Tracking** delivers end-to-end visibility for refrigerated fleets: live location, temperature integrity, geofencing, analytics, and automated alerts. The repository houses backend services, a web dashboard, a mobile app, SDKs, and infrastructure-as-code for repeatable deployments.

---

## Monorepo Layout

```
ice-truck-tracking/
├── backend/                 # REST + WebSocket API, auth, metrics
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── index.js
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── package.json
│   ├── jest.config.js
│   └── swagger.json
├── dashboard/               # Next.js dashboard (maps, analytics)
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── ui/
│   │   └── index.tsx
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── mobile-app/              # React Native (Expo) driver app
│   ├── App.tsx
│   ├── src/
│   └── package.json
├── sdk/                     # Reusable client libraries
│   ├── edge/
│   └── mobile/
├── infra/                   # IaC, clusters, pipelines
│   ├── terraform/
│   ├── k8s/
│   └── ci-cd/
└── docs/                    # Architecture, guides, ADRs
```

---

## Prerequisites

* **Node.js** 18+ and **npm** 9+
* **Docker** 24+ and **Docker Compose**
* Optional: **Terraform** 1.6+, **kubectl** 1.29+, **pnpm**/**turbo** if preferred
* Map rendering: a **Mapbox** token

---

## Quick Start

```bash
# 1) Clone and bootstrap
git clone https://github.com/MrPatt025/ice-truck-tracking.git


cd ice-truck-tracking
npm install
npm run bootstrap

# 2) Development

npm run dev         # starts backend, dashboard, and watchers

# 3) Access
# API:        http://localhost:5000
# API Docs:   http://localhost:5000/api-docs
# Dashboard:  http://localhost:3000
# Grafana:    http://localhost:3001
```

> For Docker-based bring-up use `npm run docker:up` after setting environment variables.

---

## Development

* **Tooling**: ESLint, Prettier, Husky, lint-staged, commitlint, TurboRepo
* **Branching**: `main` (protected), feature branches via PRs
* **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
* **Coverage gate**: 90%+ for merges

---

## Architecture

**Clean Architecture** with clear boundaries:

* **Controllers** → parse/validate requests
* **Services** → business rules and orchestration
* **Repositories** → data access (SQLite by default; adapters pluggable)
* **Interfaces** → REST + WebSocket
* **Cross-cutting** → auth, rate limit, input validation, logging, metrics

**Runtime capabilities**:

* Real-time telemetry ingestion (location, cargo temperature)
* Geofencing and alert rules
* Aggregations and analytics
* Health checks and readiness probes

> See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for diagrams and sequence flows.

---

## Technology Stack

| Layer        | Tech/Tools                                                        |
| ------------ | ----------------------------------------------------------------- |
| Backend      | Node.js 18+, Express.js, SQLite, JWT, WebSocket                   |
| Frontend     | Next.js 14, React 19, Tailwind CSS, Zustand                       |
| Mobile       | React Native, Expo SDK, TypeScript                                |
| SDKs         | TypeScript, Node.js, React Native                                 |
| Infra/DevOps | Docker, Docker Compose, TurboRepo, GitHub Actions, Terraform, K8s |
| Monitoring   | Prometheus, Grafana, Sentry                                       |
| Security     | Helmet, rate limiting, Snyk, npm audit                            |

---

## Key Features

* **Real-Time Dashboard**: live map, dark mode, geofencing, KPIs
* **API & WebSocket**: secure REST, streaming updates, metrics endpoint
* **Mobile App**: offline-first, push notifications, deep linking
* **Edge/Mobile SDKs**: simple client integration for IoT + driver apps
* **Cloud-Ready**: Docker images, K8s manifests, Terraform modules
* **Security**: JWT auth, RBAC, validation, rate limiting, audit logs
* **Observability**: Prometheus metrics, Grafana dashboards, Sentry traces
* **Automation**: lint/test/build/security/release via CI

---

## Packages & Apps

* **`backend/`**: Express API, WebSocket, auth, metrics, OpenAPI docs
* **`dashboard/`**: Next.js analytics UI with map and alerting views
* **`mobile-app/`**: Expo app for drivers and on-site staff
* **sdk/edge**: Node.js client for edge/IoT senders
* **`sdk/mobile`**: l client libraries for React Native consumers
* **`infra/terraform`**: Amodules for ECS/EKS, networking, and storage
* **`infra/k8s`**: deploy manifests and Helm values
* **`infra/ci-cd`**: GitHub Actions workflows and shared actions

---

## Configuration

Create `.env` files from the examples provided and adjust as needed.

```env
# Backend
NODE_ENV=development
PORT=5000
JWT_SECRET=change-me
DB_URL=./database.sqlite

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

Secrets should be stored using your platform’s secret manager in non-dev environments.

---

## Scripts

Common orchestration commands from the monorepo root:

| Command                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| `npm run dev`            | Start all apps in development                 |
| `npm run build`          | Build all apps and packages                   |
| `npm run type-check`     | TypeScript checks across workspaces           |
| `npm run test:all`       | Run unit + integration + e2e where applicable |
| `npm run test:mutation`  | Run mutation tests with Stryker               |
| `npm run lint`           | Lint with ESLint                              |
| `npm run format`         | Format with Prettier                          |
| `npm run docker:build`   | Build Docker images                           |
| `npm run docker:up`      | Compose up all services                       |
| `npm run deploy`         | Build & deploy (see infra/ci-cd)              |
| `npm run security:audit` | Snyk + npm audit                              |
| `npm run release`        | Semantic-release for versioning and changelog |

---

## Testing & Quality

* **Frameworks**: Jest (unit/integration), Cypress (e2e), Detox (mobile)
* **Mutation testing**: Stryker
* **Policies**: coverage ≥ **90%** required for merges
* **Pre-commit**: lint-staged + Husky to keep diffs clean

---

## CI/CD

**Pipeline**: Lint → Type-check → Build → Test → Security → E2E → Deploy

* **Environments**: Development → Staging → Production
* **Deploy**: Blue/Green with automatic health checks
* **Notifications**: Slack/LINE on failures and releases
* **Release**: Semantic-release for tags and changelogs

See [`infra/ci-cd/github-actions-full.yml`](./infra/ci-cd/github-actions-full.yml).

---

## Security

* **Auth**: JWT + role-based access control
* **Hardening**: Helmet, strict CORS, HSTS, CSP
* **Abuse prevention**: rate limiting and basic anomaly detection
* **Dependencies**: Snyk and `npm audit` in CI
* **Audit logging**: centralized request and auth logs

> Report security issues privately via **GitHub Security Advisories**.

---

## Observability

* **Metrics**: `/metrics` (Prometheus format)
* **Dashboards**: Grafana boards for business and infra KPIs
* **Tracing**: OpenTelemetry (optional) + Sentry for errors
* **Health**: `/healthz` and `/readyz` endpoints

---

## Deployment

* **Local**: `npm run docker:up` (Compose)
* **Kubernetes**: manifests in `infra/k8s/` and Terraform modules in `infra/terraform/`
* **AWS**: ECS/EKS, RDS/SQLite migration path, CloudWatch/ALB integrations

> Replace sample domains, registry names, and secrets before production.

---

## Roadmap

* Cold-chain anomaly detection (ML-assisted)
* Route optimization and ETA prediction
* Multi-tenant orgs and granular RBAC
* Advanced alert rules and webhooks
* Hardware integration playbooks (OBD-II, BLE temp probes)

See [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## Documentation

* [Architecture Overview](./docs/ARCHITECTURE.md)
* [Monorepo Guide](./docs/MONOREPO.md)
* [Deployment Guide](./docs/DEPLOYMENT.md)
* [API Reference](./docs/API.md)
* [Contributing Guidelines](./docs/CONTRIBUTING.md)
* [Project Wiki](https://github.com/ice-truck-tracking/ice-truck-tracking/wiki)

---

## Contributing

Contributions are welcome.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-change`
3. Commit using Conventional Commits
4. Open a PR with context and screenshots where relevant

Please review the [Code of Conduct](./docs/CODE_OF_CONDUCT.md) and [Contributing Guide](./docs/CONTRIBUTING.md).

---

## Community & Support

* **Issues**: use GitHub Issues for bugs and feature requests
* **Discussions**: architecture ideas and Q\&A
* **Monitoring**: Grafana (dev): `http://localhost:3001`
* **API Docs**: Swagger UI: `http://localhost:5000/api-docs`

---

## License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE).

---

**Built by the Ice Truck Tracking Team.**
