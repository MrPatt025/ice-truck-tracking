# 🚚❄️ Ice Truck Tracking Platform

[![CI](https://github.com/ice-truck-tracking/ice-truck-tracking/actions/workflows/ci.yml/badge.svg)](https://github.com/ice-truck-tracking/ice-truck-tracking/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/ice-truck-tracking/ice-truck-tracking/badge.svg?branch=main)](https://coveralls.io/github/ice-truck-tracking/ice-truck-tracking?branch=main)
[![Lint](https://img.shields.io/badge/lint-passing-brightgreen)](./)
[![Security Audit](https://img.shields.io/badge/security-audit-passing-brightgreen)](https://github.com/ice-truck-tracking/ice-truck-tracking/security)
[![Release](https://img.shields.io/github/v/release/ice-truck-tracking/ice-truck-tracking)](https://github.com/ice-truck-tracking/ice-truck-tracking/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Enterprise-Grade Monorepo for Real-Time Ice Truck Tracking, Analytics, and Cloud Operations**

---

## 📦 Monorepo Structure

```
ice-truck-tracking/
├─ apps/
│  ├─ backend/        # Node.js/Express API server
│  ├─ dashboard/      # Next.js web dashboard
│  └─ mobile-app/     # React Native Expo mobile app
├─ packages/
│  ├─ sdk-edge/       # Edge SDK (Node.js)
│  └─ sdk-mobile/     # Mobile SDK (React Native)
├─ infra/             # Infrastructure as Code (Terraform, K8s, Docker, CI/CD)
├─ scripts/           # Automation scripts
├─ docs/              # Documentation
└─ ...
```

---

## 🚀 Quick Start (One Command)

```bash
# Clone and setup
git clone https://github.com/ice-truck-tracking/ice-truck-tracking.git
cd ice-truck-tracking
npm install
npm run bootstrap
```

- **Start all services (dev):** `npm run dev`
- **Build all apps/packages:** `npm run build`
- **Run all tests:** `npm run test:all`
- **Lint & format:** `npm run lint && npm run format`

---

## 🏗️ Architecture & Best Practices

- **Clean Architecture:** Controllers → Services → Repositories → Database/API
- **SOLID Principles:** Separation of concerns, testability, maintainability
- **Centralized Tooling:** ESLint, Prettier, Husky, lint-staged, commitlint, TurboRepo
- **CI/CD:** GitHub Actions, Docker, Terraform, blue/green deploy, semantic-release
- **Security:** Snyk, npm audit, Helmet, CSP, HSTS, rate limiting, input validation
- **Quality:** Jest, Stryker (mutation testing), >90% coverage, conventional commits
- **Observability:** Prometheus, Grafana, Sentry, health checks, metrics, alerting

---

## 🛠️ Technology Stack

| Layer         | Tech/Tools                                 |
|--------------|--------------------------------------------|
| Backend      | Node.js 18+, Express.js, SQLite, JWT, WebSocket |
| Frontend     | Next.js 14, React 19, Tailwind CSS, Zustand |
| Mobile       | React Native, Expo SDK, TypeScript         |
| SDKs         | TypeScript, Node.js, React Native          |
| Infra/DevOps | Docker, Docker Compose, TurboRepo, GitHub Actions, Terraform, K8s |
| Monitoring   | Prometheus, Grafana, Sentry                |
| Security     | Snyk, npm audit, Helmet, rate limit        |

---

## 🧑‍💻 Key Features

- **Real-Time Dashboard:** Live map, analytics, dark mode, geofencing
- **API & WebSocket:** Secure REST API, real-time updates, metrics
- **Mobile App:** Offline support, push notifications, deep linking
- **Edge/Mobile SDKs:** Easy integration for IoT and mobile clients
- **Cloud-Ready:** Docker, K8s, AWS ECS, Terraform, blue/green deploy
- **Enterprise Security:** JWT, rate limiting, input validation, audit
- **Observability:** Metrics, dashboards, alerting, SLO/SLA monitoring
- **Automated CI/CD:** Lint, test, build, security, deploy, release

---

## 📋 Scripts & Commands

| Command                | Description                                 |
|------------------------|---------------------------------------------|
| `npm run dev`          | Start all apps in development mode          |
| `npm run build`        | Build all apps/packages                     |
| `npm run test:all`     | Run all test types (unit, integration, e2e) |
| `npm run test:mutation`| Run mutation tests (Stryker)                |
| `npm run lint`         | Lint all code (ESLint)                      |
| `npm run format`       | Format code (Prettier)                      |
| `npm run type-check`   | Type check all TypeScript code              |
| `npm run docker:build` | Build all Docker images                     |
| `npm run docker:up`    | Start all services with Docker Compose      |
| `npm run deploy`       | Build & deploy all services                 |
| `npm run security:audit`| Run security audit (Snyk, npm audit)       |
| `npm run release`      | Semantic release automation                 |

---

## 🔄 CI/CD Pipeline

- **Workflow:** Lint → Type-check → Build → Test → Security → E2E → Deploy
- **Environments:** Development → Staging → Production
- **Automation:** Blue/green deploy, health checks, Slack/LINE notifications
- **Release:** Semantic-release for versioning, changelog, and tagging

**See:** [infra/ci-cd/github-actions-full.yml](infra/ci-cd/github-actions-full.yml)

---

## 🔐 Security & Compliance

- **Authentication:** JWT, role-based access
- **Rate Limiting:** Brute-force protection
- **Input Validation:** Joi, custom middleware
- **CORS & Headers:** Strict CORS, Helmet, CSP, HSTS
- **Dependency Scanning:** Snyk, npm audit
- **Audit Logging:** Centralized logs, error tracking

---

## 📈 Monitoring & Observability

- **Metrics:** Prometheus, custom /metrics endpoint
- **Dashboards:** Grafana, business & infra metrics
- **Alerting:** Slack/email, SLO/SLA rules
- **Tracing:** OpenTelemetry (optional), Sentry

---

## 🧪 Testing & Quality

- **Unit/Integration/E2E:** Jest, Cypress, Detox
- **Mutation Testing:** Stryker
- **Coverage:** >90% required for merge
- **Lint/Format:** ESLint, Prettier, Husky, lint-staged
- **Conventional Commits:** Commitlint, semantic-release

---

## 🌍 Environment Variables (Sample)

```env
# Backend
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secret-key
DB_URL=./database.sqlite

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

---

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Monorepo Guide](./docs/MONOREPO.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [API Reference](./docs/API.md)
- [Development Roadmap](./docs/ROADMAP.md)
- [Contributing Guidelines](./docs/CONTRIBUTING.md)

---

## 🤝 Contributing

We welcome contributions from the community and enterprise partners!

- **Fork** the repository
- **Create** a feature branch: `git checkout -b feature/amazing-feature`
- **Commit** with [conventional commits](https://www.conventionalcommits.org/)
- **Push** and **open a Pull Request**
- **Follow:** [CONTRIBUTING.md](./docs/CONTRIBUTING.md)

---

## 🆘 Support & Troubleshooting

- **Issues:** [GitHub Issues](https://github.com/ice-truck-tracking/ice-truck-tracking/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ice-truck-tracking/ice-truck-tracking/discussions)
- **Monitoring:** [Grafana Dashboard](http://localhost:3001)
- **API Docs:** [Swagger/OpenAPI](http://localhost:5000/api-docs)
- **FAQ & Wiki:** [Project Wiki](https://github.com/ice-truck-tracking/ice-truck-tracking/wiki)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with passion and precision by the Ice Truck Tracking Team.**
