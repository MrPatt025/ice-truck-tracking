<p align="center">
  <img src="https://img.shields.io/badge/🚚❄️-Ice_Truck_Tracking-0ea5e9?style=for-the-badge&labelColor=0f172a" alt="Ice Truck Tracking" />
</p>

<p align="center">
  <a href="https://github.com/MrPatt025/ice-truck-tracking/actions/workflows/ci.yml"><img src="https://github.com/MrPatt025/ice-truck-tracking/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-339933?logo=nodedotjs&logoColor=white" alt="Node.js >= 22" />
  <img src="https://img.shields.io/badge/pnpm-10.18-f69220?logo=pnpm&logoColor=white" alt="pnpm 10" />
  <img src="https://img.shields.io/badge/turbo-2.8-0f172a?logo=turborepo&logoColor=white" alt="TurboRepo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License" /></a>
</p>

<p align="center">
  <strong>Enterprise-grade cold-chain tracking platform — real-time vehicle monitoring, temperature telemetry, geofencing, analytics, and automated alerting.</strong>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development](#development)
- [Scripts Reference](#scripts-reference)
- [API Documentation](#api-documentation)
- [Testing & Quality](#testing--quality)
- [CI/CD Pipeline](#cicd-pipeline)
- [Infrastructure & Deployment](#infrastructure--deployment)
- [Observability](#observability)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Ice Truck Tracking** provides end-to-end visibility for refrigerated fleets: real-time GPS tracking, cold-chain temperature monitoring, geofence enforcement, analytics dashboards, and automated alerting — all in a single monorepo.

### Key Capabilities

| Capability                |                         Description                           |
|---------------------------|---------------------------------------------------------------|
| **Real-time Tracking**    | Sub-second GPS & telemetry via MQTT → WebSocket pipeline      |
| **Cold-chain Monitoring** | Temperature anomaly detection with automated alerts           |
| **Geofencing**            | Zone-based rules with breach/exit notifications               |
| **Role-based Access**     | 5-level RBAC (admin, manager, dispatcher, driver, viewer)     |
| **Multi-platform**        | Web dashboard, mobile app (iOS/Android), Edge SDKs            |
| **Event-driven**          | Kafka-backed event bus with graceful in-memory fallback       |
| **Observability**         | OpenTelemetry tracing, Prometheus metrics, Grafana dashboards |
| **Feature Flags**         | Runtime feature toggles for gradual rollouts                  |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nginx (L7 Proxy)                         │
└──────────┬──────────────────────┬───────────────────────────────┘
           │                      │
    ┌──────▼──────┐       ┌───────▼───────┐
    │  Dashboard  │       │   Backend API │
    │  Next.js 15 │       │   Express 4   │
    │  React 18   │       │   Socket.IO   │
    └──────┬──────┘       └───┬───┬───┬───┘
           │                  │   │   │
           │          ┌───────┘   │   └────────┐
           │          │           │            │
      ┌────▼────┐  ┌──▼──┐  ┌─────▼─────┐  ┌───▼────┐
      │ Mapbox  │  │Redis│  │TimescaleDB│  │ Kafka  │
      │  GL JS  │  │Cache│  │  (PG 16)  │  │  Bus   │
      └─────────┘  └──┬──┘  └───────────┘  └────────┘
                      │
              ┌───────▼───────┐
              │   Mosquitto   │
              │  MQTT Broker  │
              └───────┬───────┘
                      │
         ┌────────────▼────────────┐
         │   IoT Devices / Trucks  │
         │  GPS + Temp Sensors     │
         └─────────────────────────┘
```

**Design Principles:** Clean Architecture · SOLID · DTOs & validation at boundaries · Pure functions · Event-driven messaging

---

## Monorepo Structure

```
ice-truck-tracking/
├── backend/              # Express REST API + WebSocket + MQTT
│   ├── src/
│   │   ├── config/       # env, RBAC, logger, OpenTelemetry
│   │   ├── middleware/    # auth, rate-limit, security, validation, audit
│   │   ├── routes/v1/    # versioned API routes
│   │   └── services/     # authService, mqttService, eventBus, telemetry
│   ├── routes/           # legacy route handlers
│   ├── database/         # SQL migrations (TimescaleDB)
│   └── tests/            # unit + integration (Jest)
├── dashboard/            # Next.js 15 App Router (Turbopack)
│   └── src/
│       ├── app/          # pages (dashboard, login, alerts, tracking)
│       ├── components/   # ThemeProvider, ErrorBoundary, shadcn/ui
│       └── lib/          # API client, i18n, utils
├── mobile-app/           # Expo 52 / React Native 0.76
│   └── src/
│       ├── screens/      # Map, Alerts, History, Settings
│       ├── services/     # apiClient, secureStorage, offlineQueue
│       └── navigation/   # expo-router tab/stack navigation
├── sdk/
│   ├── edge/             # Edge notification templates (Handlebars)
│   └── mobile/           # Shared mobile utilities
├── infra/
│   ├── helm/             # Kubernetes Helm chart (HPA, deployment)
│   ├── k8s/              # Raw K8s manifests
│   ├── kong/             # Kong API Gateway configuration
│   ├── terraform/        # Infrastructure as Code
│   ├── mosquitto/        # MQTT broker config
│   └── docker-base/      # Base Docker images
├── monitoring/
│   ├── prometheus/        # prometheus.yml
│   ├── alerts/            # alert-rules.yml
│   ├── grafana/           # dashboard provisioning
│   └── loki/              # log aggregation
├── tests/k6/             # Load & soak testing (k6)
├── docs/                 # ARCHITECTURE.md, API.md, CONTRIBUTING.md
├── nginx/                # Reverse proxy config
├── scripts/              # deploy, health-check, init
├── docker-compose.yml    # Full stack orchestration (8 services)
├── turbo.json            # TurboRepo pipeline config
└── package.json          # Root workspace config
```

---

## Technology Stack

### Backend

|   Component    |                Technology              |         Version       |
|----------------|----------------------------------------|-----------------------|
| Runtime        | Node.js                                |         ≥ 22          |
| Framework      | Express                                |         4.22          |
| Database       | PostgreSQL + **TimescaleDB**           |         PG 16         |
| Cache          | **Redis** (ioredis)                    |         7 Alpine      |
| Messaging      | **Apache Kafka** (kafkajs)             |         2.2           |
| IoT Broker     | **Eclipse Mosquitto** (MQTT 5)         |         5.15          |
| Real-time      | Socket.IO                              |         4.7           |
| Auth           | JWT + Refresh Token Rotation           |     jsonwebtoken 9    |
| Validation     | Zod + Joi + express-validator          |         Latest        | 
| Observability  | OpenTelemetry + prom-client            |   Auto-instrumented   |
| Logging        | Pino (structured JSON)                 |         10.3          |
| API Docs       | Swagger / OpenAPI 3.0                  |   swagger-ui-express  |

### Dashboard

| Componen       |                Technology              |         Version       |
|----------------|----------------------------------------|-----------------------|
| Framework      | Next.js (App Router, Turbopack)        | 15.5                  |
| UI Library     | React                                  | 18.3                  |
| Components     | shadcn/ui + Radix UI                   | Latest                |
| Styling        | Tailwind CSS                           | 3.4                   |
| Map ผs         | Mapbox GL JS + react-map-gl            | 3.9                   |
| Charts         | Recharts                               | 2.15                  |
| Animation      | Framer Motion                          | 11.15                 |
| i18n           | i18next + react-i18next                | Latest                |
| Real-time      | socket.io-client                       | 4.8                   |
 
### Mobile App

| Component      |                Technology              |         Version       |
|----------------|----------------------------------------|-----------------------|
| Framework      | Expo (with expo-router)                | SDK 52                |
| Platform       | React Native                           | 0.76                  |
| Navigation     | React Navigation (tabs, stack, drawer) | 7                     |
| Maps           | react-native-maps                      | 1.20                  |
| Storage        | expo-secure-store + expo-sqlite        | Latest                |
| Location       | expo-location                          | 18.0                  |
| Error Tracking | Sentry (react-native)                  | 6.5                   |
| OTA Updates    | expo-updates                           | Latest                |

### DevOps & Tooling

|      Tool                        |                    Purpose                   |
|----------------------------------|----------------------------------------------|
| pnpm 10 + TurboRepo              | Monorepo management & build orchestration    |
| TypeScript 5.9                   | Type safety across all packages              |
| ESLint 9 + Prettier              | Code quality & formatting                    |
| Husky + lint-staged + commitlint | Git hooks & conventional commits             |
| Docker Compose                   | Full-stack local development (8 services)    |
| Helm + Terraform + Kubernetes    | Production infrastructure                    |
| Kong                             | API Gateway                                  |
| GitHub Actions                   | CI/CD pipeline                               |
| Renovate Bot                     | Automated dependency updates                 |
| Stryker                          | Mutation testing                             |

---

## Prerequisites

- **Node.js** ≥ 22.0.0
- **pnpm** ≥ 10.0.0
- **Docker** & **Docker Compose** (for full-stack local dev)
- **Mapbox Token** (optional, for map rendering)

---

## Quick Start

### Option 1 — Docker Compose (Recommended)

```bash
# Clone
git clone https://github.com/MrPatt025/ice-truck-tracking.git
cd ice-truck-tracking

# Start all 8 services
docker-compose up -d

# Access points:
#   Dashboard:  http://localhost:3000
#   API:        http://localhost:5000
#   Swagger:    http://localhost:5000/api-docs
#   Grafana:    http://localhost:3001
#   Prometheus: http://localhost:9090
```

### Option 2 — Local Development

```bash
# Install dependencies
pnpm install

# Copy environment files
cp backend/env.example backend/.env

# Start all workspaces in parallel
pnpm dev

# Or start individually:
pnpm --filter @ice-truck/backend dev       # API on :5000
pnpm --filter @ice-truck/dashboard dev      # Dashboard on :3000
```

---

## Configuration

### Backend (`backend/.env`)

```env
# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database (TimescaleDB)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ice_tracking
DB_POOL_MAX=20

# Redis
REDIS_URL=redis://localhost:6379

# MQTT (Mosquitto)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Auth
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Kafka (optional)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ice-truck-backend

# OpenTelemetry (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=ice-truck-backend

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Dev helpers
USE_FAKE_DB=true
```

### Dashboard (`dashboard/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
# NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

---

## Development

### Conventions

- **Commits:** [Conventional Commits](https://conventionalcommits.org/) enforced by commitlint (`feat:`, `fix:`, `chore:`, etc.)
- **Branching:** Feature branches → PR to `main`
- **Code Style:** ESLint 9 flat config + Prettier auto-formatting
- **Git Hooks:** Husky runs lint-staged on pre-commit

### Useful Commands

```bash
# Lint all workspaces
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Type-check
pnpm type-check

# Format all files
pnpm format

# Interactive commit (Commitizen)
pnpm commit
```

---

## Scripts Reference

| Command                          |                  Description                 |
|----------------------------------|----------------------------------------------|
| `pnpm dev`                       | Start all workspaces in parallel (Turbo)     |
| `pnpm build`                     | Build all workspaces                         |
| `pnpm test`                      | Run all tests                                | 
| `pnpm test:unit`                 | Unit tests only                              |
| `pnpm test:integration`          | Integration tests                            |
| `pnpm test:e2e`                  | Playwright E2E tests                         |
| `pnpm test:coverage`             | Tests with coverage report                   |
| `pnpm test:mutation`             | Stryker mutation testing                     |
| `pnpm lint`                      | ESLint across all packages                   |
| `pnpm type-check`                | TypeScript type checking                     |
| `pnpm format`                    | Prettier formatting                          |
| `pnpm docker:up`                 | Start Docker Compose stack                   |
| `pnpm docker:down`               | Stop Docker Compose stack                    |
| `pnpm docker:logs`               | Tail container logs                          |
| `pnpm deploy`                    | Build + Docker build + up                    |
| `pnpm security:audit`            | Security audit (high severity)               |
| `pnpm clean:all`                 | Remove all node_modules and caches           |
| `pnpm release`                   | Semantic release                             |

---

## API Documentation

### Endpoints (v1)

| Group          |                Base Path               |               Description             |
|----------------|----------------------------------------|---------------------------------------|
| Health         | `GET /api/v1/health`                   | Service health check                  |
| Auth           | `/api/v1/auth`                         | Login, register, refresh token        |
| Trucks         | `/api/v1/trucks`                       | CRUD + live status                    |
| Drivers        | `/api/v1/drivers`                      | Driver management                     |
| Shops          | `/api/v1/shops`                        | Delivery location management          |
| Tracking       | `/api/v1/tracking`                     | GPS & telemetry records               |
| Alerts         | `/api/v1/alerts`                       | Alert management & notifications      |
| Feature Flags  | `/api/v1/feature-flags`                | Runtime feature toggles               |

### Interactive Docs

Swagger UI available at `http://localhost:5000/api-docs` when the backend is running.

### Real-time Events (Socket.IO)

| Event | Direction | Payload |
|-------|-----------|---------|
| `truck:update` | Server → Client | Live truck position & status |
| `alert:new` | Server → Client | New alert notification |
| `temperature:warning` | Server → Client | Temperature threshold breach |

### MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `trucks/+/telemetry` | Device → Server | GPS + temperature data |
| `trucks/+/status` | Device → Server | Engine, door, battery status |
| `trucks/+/alerts` | Device → Server | Geofence & sensor alerts |
| `system/broadcast` | Server → Devices | System-wide commands |

---

## Testing & Quality

### Test Strategy

| Level           |                   Tool                   |             Target Coverage           |
|-----------------|------------------------------------------|---------------------------------------|
| **Unit**        | Jest + @testing-library                  | ≥ 95%                                 |
| **Integration** | Jest + Supertest (live services)         | ≥ 90%                                 |
| **E2E**         | Playwright (Chromium)                    | Critical paths                        |
| **Mutation**    | Stryker                                  | ≥ 80% score                           |
| **Load**        | k6 (ramp, spike, soak)                   | P95 < 200ms                           |
| **Mobile**      | jest-expo + @testing-library/jest-native | Core flows                            |

### Running Tests

```bash
# All tests
pnpm test

# Backend only (with mocks)
pnpm --filter @ice-truck/backend test

# Dashboard unit tests
pnpm --filter @ice-truck/dashboard test

# E2E (requires running services)
pnpm test:e2e

# Load testing (k6)
k6 run tests/k6/load-test.js
k6 run tests/k6/soak-test.js

# Mutation testing
pnpm test:mutation
```

### Current Test Results

```
Backend:   6 suites · 9 tests · all passing ✅
Dashboard: Build successful · 3 static pages ✅
```

---

## CI/CD Pipeline

The GitHub Actions CI/CD pipeline runs on every push/PR to `main` or `develop`:

```
┌──────────┐    ┌──────────┐   ┌──────────────┐    ┌───────────┐
│ Install  │──▶│   Lint   │──▶│  Test       │──▶ │   Build   │
│ (pnpm)   │    │ + Types  │   │  Backend     │    │ (Turbo)   │
└──────────┘    │ + Commit │   │  Dashboard   │    └────┬──────┘
                └──────────┘   │  E2E         │          │
                               └──────────────┘   ┌────▼─────┐
                                                  │  Deploy  │
                                                  │ Vercel   │
                                                  │ Render   │
                                                  └──────────┘
```

| Job                |            Service Containers          |                 Notes                 |
|--------------------|----------------------------------------|---------------------------------------|
| `test-backend`     | TimescaleDB, Redis, Mosquitto          | Full integration with live services   |
| `test-dashboard`   | —                                      | Jest unit tests                       |
| `test-e2e`         | —                                      | Playwright (Chromium)                 |
| `preview`          | —                                      | Vercel preview deploy on PR           |
| `deploy-dashboard` | —                                      | Vercel production on merge            |
| `deploy-backend`   | —                                      | Render deploy hook on merge           |

---

## Infrastructure & Deployment

### Docker Compose (Local/Staging)

8-service stack with health checks:

| Service        |                  Image                 |                  Ports                |
|----------------|----------------------------------------|---------------------------------------|
| **postgres**   | `timescale/timescaledb:latest-pg16`    | 5432                                  |
| **redis**      | `redis:7-alpine`                       | 6379                                  |
| **mosquitto**  | `eclipse-mosquitto:2`                  | 1883, 9001                            |
| **backend**    | Custom (Node.js)                       | 5000                                  |
| **dashboard**  | Custom (Next.js)                       | 3000                                  |
| **prometheus** | `prom/prometheus:latest`               | 9090                                  |
| **grafana**    | `grafana/grafana:latest`               | 3001                                  |
| **nginx**      | `nginx:alpine`                         | 80, 443                                |

### Kubernetes (Production)

- **Helm chart** with configurable replicas, HPA autoscaling, pod security contexts
- **Kong API Gateway** for rate limiting, auth plugins, request transformation
- **Terraform** for cloud infrastructure provisioning
- Raw K8s manifests available in `infra/k8s/`

### Deploy Commands

```bash
# Docker Compose
pnpm docker:up                    # Start stack
pnpm docker:down                  # Stop stack
pnpm docker:logs                  # Tail logs

# Staging
pnpm deploy:staging

# Production
pnpm deploy:production

# Helm (Kubernetes)
helm install ice-truck infra/helm/ -f infra/helm/values.yaml
```

---

## Observability

### Metrics & Monitoring

| Tool               |                  Purpose               |                 Access                |
|--------------------|----------------------------------------|---------------------------------------|
| **Prometheus**     | Metrics collection                     | `http://localhost:9090`               |
| **Grafana**        | Dashboards & visualization             | `http://localhost:3001`               |
| **Loki**           | Log aggregation                        | Via Grafana data sources              |
| **OpenTelemetry**  | Distributed tracing                    | OTLP endpoint                         |
| **prom-client**    | App-level metrics                      | `GET /metrics`                        |

### Health Endpoints

| Endpoint             |                  Description              |
|----------------------|-------------------------------------------|
| `GET /api/v1/health` | Application health check                  |
| `GET /metrics`       | Prometheus metrics (counters, histograms) |

### Alert Rules

Pre-configured Prometheus alert rules in `monitoring/alerts/alert-rules.yml` for:
- High error rates
- Response time degradation
- Database connection pool exhaustion
- MQTT broker disconnection
- Temperature sensor anomalies

---

## Security

| Layer                 |                      Implementation                       |
|-----------------------|-----------------------------------------------------------|
| **Authentication**    | JWT with refresh token rotation (15m access / 7d refresh) |
| **Authorization**     | RBAC (5 roles) + ABAC policies                            |
| **Transport**         | HTTPS/TLS via Nginx, secure WebSocket (wss://)            |
| **Headers**           | Helmet (CSP, HSTS, X-Frame-Options, etc.)                 |
| **Rate Limiting**     | express-rate-limit (configurable per-route)               |
| **Input Validation**  | Zod schemas + Joi + express-validator                     |
| **Audit Logging**     | Request/response audit middleware                         |
| **Dependencies**      | Snyk + pnpm audit (CI-integrated)                         |
| **Secrets**           | Environment variables, never in code                      |
| **Container**         | Non-root user, read-only filesystem, minimal images       |
| **Mobile**            | expo-secure-store for credential storage                  |

> Report security vulnerabilities via [GitHub Security Advisories](https://github.com/MrPatt025/ice-truck-tracking/security).

---

## Roadmap

- [x] Real-time GPS tracking with WebSocket
- [x] MQTT telemetry ingestion pipeline
- [x] Role-based access control (5 levels)
- [x] TimescaleDB for time-series data
- [x] Redis caching layer
- [x] Kafka event bus
- [x] OpenTelemetry instrumentation
- [x] Prometheus + Grafana monitoring
- [x] Dark mode & i18n support
- [x] Mobile app (Expo/React Native)
- [x] Helm chart + Kubernetes deployment
- [x] CI/CD with Vercel + Render deployment
- [ ] Predictive ETA & temperature anomaly ML models
- [ ] Multi-tenant architecture
- [ ] Advanced geofence rule engine
- [ ] Driver behavior analytics
- [ ] Fleet optimization algorithms
- [ ] Push notifications (FCM/APNS)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Write tests for your changes
4. Commit using [Conventional Commits](https://conventionalcommits.org/): `git commit -m "feat: add new feature"`
5. Open a Pull Request with description and screenshots

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

---

## Documentation

| Document                                       |               Description              |
|------------------------------------------------|----------------------------------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)        | System design & architecture decisions |
| [API.md](docs/API.md)                          | API reference & examples               |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md)        | Development guidelines                 |
| [CODE_OF_CONDUCT.md](docs/CODE_OF_CONDUCT.md)  | Community standards                    |
| [ROADMAP.md](docs/ROADMAP.md)                  | Feature planning & priorities          | 

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with ❄️ by the <strong>Ice Truck Tracking Team</strong></sub>
</p>
