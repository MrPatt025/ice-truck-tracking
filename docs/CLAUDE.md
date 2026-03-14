---

CLAUDE.md

Ice-Truck Tracking Platform — AI Engineering Contract

Version: 1.0

This file defines the engineering rules, architecture, and development protocols for all AI coding agents working on this repository.

All AI assistants must follow this document strictly.


---

1. Project Overview

Ice-Truck Tracking Platform is a real-time cold-chain logistics intelligence system designed to monitor refrigerated trucks and analyze fleet operations.

Key capabilities:

• Real-time truck tracking
• Temperature monitoring
• Geofence alerts
• Fleet analytics
• Digital twin visualization
• Predictive anomaly detection

System scale target:

Fleet size: 1,000,000 trucks
Telemetry ingestion: 100k+ messages/sec
Frontend performance: ≥ 60 FPS
API latency: < 100ms p95
End-to-end latency: < 200ms


---

2. Engineering Principles

All development must follow these principles.

2.1 Performance First

Performance is a hard requirement.

Frontend requirements:

Dashboard FPS ≥ 60
Minimum acceptable FPS ≥ 55
Initial bundle < 150 KB gzipped
3D model load < 500 ms

Backend requirements:

API latency (p95) < 100 ms
WebSocket latency < 200 ms
Kafka ingestion throughput > 100k msgs/sec

If performance drops below target:

STOP development
PROFILE bottleneck
OPTIMIZE
RETEST


---

2.2 Security by Default

Assume all systems are under attack.

Mandatory practices:

• Zod validation on every API input
• Rate limiting via Redis token bucket
• JWT authentication with refresh tokens
• RBAC authorization system
• No PII in logs
• Secrets stored via environment variables or Vault

Security scans must run in CI:

pnpm audit
trivy fs .
gitleaks detect

No commit may introduce secrets.


---

2.3 Open Source First

This project must remain 100% open source compatible.

Forbidden services:

Mapbox
Firebase
Datadog
New Relic
Auth0
Google Analytics

Approved alternatives:

Proprietary	Open Source Alternative

Mapbox	MapLibre GL
Firebase	Supabase / Appwrite
Datadog	Prometheus + Grafana
New Relic	OpenTelemetry
Auth0	Ory / Keycloak
Algolia	Meilisearch / Typesense
Google Analytics	Umami



---

2.4 AI Readable Code

Code must be easy for humans and AI to understand.

Rules:

• Functions ≤ 50 lines
• Meaningful variable names
• JSDoc/TSDoc comments
• No magic numbers
• Constants stored in config files
• Avoid global state

Bad example:

const d = a + b;

Good example:

const totalDistanceKm = originDistanceKm + routeDistanceKm;


---

3. Monorepo Structure

This repository uses pnpm workspaces + turborepo.

ice-truck-tracking/

packages/
  core/
  backend-api/
  frontend-web/
  mobile-app/
  websocket-server/
  mqtt-subscriber/
  streaming/
  sdk/
  ui/

infra/
  docker-compose/
  terraform/
  helm/

tests/
  e2e/
  integration/
  k6/

scripts/
docs/
.github/


---

4. Technology Stack

Frontend

Next.js 15
React 19
React Three Fiber
MapLibre GL
Deck.gl
Framer Motion
Tailwind CSS

3D rendering uses:

Three.js
WebGL2
WebGPU (future)


---

Backend

Node.js
Fastify
TypeScript
Zod
Prisma / SQL clients
Socket.IO


---

Messaging & Streaming

EMQX (MQTT broker)
Redpanda (Kafka compatible)
NATS JetStream
Apache Flink
ksqlDB
Ray (ML inference)


---

Databases

TimescaleDB — time series telemetry
ClickHouse — analytics queries
Redis — caching and pub/sub


---

Observability

Prometheus
Grafana
Loki
Tempo
OpenTelemetry


---

Infrastructure

Docker
Kubernetes
Terraform
Helm
ArgoCD
GitHub Actions


---

5. Performance Budgets

All components must respect these budgets.

Metric	Target

FCP	< 1.0s
TTI	< 2.0s
FPS	≥ 60
Bundle size	<150KB gz
API latency	<100ms
WebSocket latency	<200ms
Query time	<2s
Test coverage	>95%



---

6. Development Workflow

All AI agents must follow this workflow.

Step 1 — Task Analysis

Break task into atomic subtasks.

Evaluate:

• performance impact
• security impact
• dependencies
• test strategy


---

Step 2 — Test Design

Write tests before implementing logic whenever possible.

Required tests:

unit tests
integration tests
E2E tests (Playwright)
performance tests


---

Step 3 — Implementation Order

Always implement in this order:

1. Type definitions


2. Zod validation schemas


3. Pure business logic


4. Database / I/O layers


5. API routes


6. Frontend integration


7. Tests


8. Documentation




---

Step 4 — Validation

Before committing, run:

pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm perf:check
pnpm audit
trivy fs .
gitleaks detect

All must pass.


---

Step 5 — Commit

Use Conventional Commits.

Examples:

feat(api): add truck telemetry endpoint
fix(streaming): correct geofence detection
perf(frontend): optimize deck.gl rendering


---

7. Testing Strategy

Unit Tests

Framework:

Jest
Vitest

Coverage requirement:

>95%


---

Integration Tests

Use Testcontainers.

Example services:

PostgreSQL
Redis
Redpanda
EMQX


---

End-to-End Tests

Framework:

Playwright

Scenarios:

• login flow
• dashboard load
• real-time truck updates
• alert notifications


---

8. Real-Time Architecture

Data pipeline:

Truck Sensors
   ↓
MQTT (EMQX)
   ↓
MQTT Subscriber
   ↓
Redpanda
   ↓
Apache Flink
   ↓
TimescaleDB / ClickHouse
   ↓
WebSocket Server
   ↓
Frontend Dashboard


---

9. Frontend Rendering Rules

Large fleets require GPU optimization.

Rules:

• Use instanced rendering for trucks
• Use a single shared WebGL canvas
• Avoid multiple WebGL contexts
• Use Web Workers for heavy computation
• Use shader-based effects instead of CSS blur


---

10. Observability Requirements

All services must expose Prometheus metrics.

Required metrics:

http_requests_total
http_request_duration_seconds
websocket_connections
kafka_consumer_lag
frontend_fps
telemetry_ingestion_rate

Dashboards required:

System Health
Fleet Overview
Performance Metrics
Business KPIs


---

11. AI Agent Execution Protocol

Every AI coding agent must follow this format.

Before coding:

TASK PLAN
---------
Subtasks:
1.
2.
3.

Dependencies:
Performance impact:
Testing strategy:
Security considerations:

After completion:

RESULT
------
Tests passed:
Performance metrics:
Security scan results:
Files changed:


---

12. Definition of Done

A task is complete only when:

TypeScript strict passes
Unit tests pass
Integration tests pass
E2E tests pass
Performance budgets met
Security scans pass
Documentation updated
PR created


---

13. Repository Startup Instructions

When starting work on this repository:

1. Install dependencies



pnpm install

2. Start local infrastructure



docker compose -f infra/docker-compose.dev.yml up

3. Run development servers



pnpm dev


---

14. Architecture Decision Records

All architecture decisions must be recorded in:

docs/architecture/

Each decision should include:

• context
• alternatives considered
• chosen solution
• consequences


---

15. AI Agent Start Command

When an AI agent begins work on this repository, start with:

PHASE 0 — FOUNDATION

Tasks:

• initialize monorepo
• configure pnpm workspaces
• configure turborepo
• create docker dev stack
• configure CI pipeline

Report progress after each step.


---

End of CLAUDE.md

---
