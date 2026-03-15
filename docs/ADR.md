# Architecture Decision Records (ADR)

## ADR-001: Migrate to TimescaleDB for Time-Series Data

**Status:** Accepted
**Date:** 2025-01-15
**Decision Makers:** Platform Team

### Context

The Ice Truck Tracking system generates continuous telemetry data (GPS coordinates, temperature readings, speed) at high volume from IoT devices. The existing MySQL/SQLite storage could not efficiently handle:

- Time-range queries across millions of rows
- Automatic data lifecycle management (compression, retention)
- Real-time continuous aggregates for dashboards

### Decision

Adopt **TimescaleDB** (PostgreSQL extension) as the primary database for all time-series data (telemetry, alerts, audit logs).

### Consequences

- **Positive:** 10-100x faster time-range queries via hypertables with automatic partitioning
- **Positive:** Built-in compression saves 90%+ storage on historical data
- **Positive:** Continuous aggregates pre-compute hourly/daily summaries
- **Positive:** Full PostgreSQL compatibility — no SQL dialect changes needed
- **Negative:** Requires PostgreSQL extension support (not available on all managed DB services)
- **Negative:** Team must learn TimescaleDB-specific APIs

### Alternatives Considered

| Option           | Pros                          | Cons                                          |
| ---------------- | ----------------------------- | --------------------------------------------- |
| InfluxDB         | Purpose-built for time-series | Separate query language (Flux), limited JOINs |
| ClickHouse       | Excellent for analytics       | OLAP-focused, poor real-time writes           |
| Plain PostgreSQL | Already familiar              | Poor time-range query performance at scale    |

---

## ADR-002: Event-Driven Architecture with Kafka

**Status:** Accepted
**Date:** 2025-01-15

### Context

The monolithic backend processes telemetry ingestion, alerting, and dashboard updates synchronously, creating coupling and bottlenecks under high load.

### Decision

Introduce **Apache Kafka** as the event backbone with topic-based routing:

- `telemetry.raw` — raw device readings (6 partitions, 7-day retention)
- `alerts.triggered` — threshold-based alerts
- `truck.status.changed` — state machine transitions

### Consequences

- **Positive:** Decoupled producers/consumers enable independent scaling
- **Positive:** Event replay for debugging and reprocessing
- **Positive:** Graceful degradation — EventEmitter fallback when Kafka is unavailable
- **Negative:** Operational complexity (Zookeeper/KRaft, topic management)
- **Negative:** Eventual consistency — consumers may lag behind producers

---

## ADR-003: Zero Trust Security Model

**Status:** Accepted
**Date:** 2025-01-15

### Context

The IoT domain requires defense-in-depth. Previous implementation used long-lived JWT tokens with hardcoded fallback secrets.

### Decision

Implement Zero Trust security:

1. **Short-lived JWT (15m)** with refresh token rotation
2. **Refresh token family tracking** — reuse detection revokes entire family
3. **Zod input validation** on all endpoints
4. **Helmet + CSP** — strict Content Security Policy
5. **CSRF protection** — Double Submit Cookie pattern
6. **Audit trail** — immutable TimescaleDB hypertable

### Consequences

- **Positive:** Compromised tokens expire in 15 minutes
- **Positive:** Token theft detected automatically via family reuse
- **Positive:** All inputs validated and sanitized before processing
- **Negative:** More complex auth flow (access + refresh tokens)
- **Negative:** Slightly higher latency for token refresh round-trips

---

## ADR-004: Kong API Gateway

**Status:** Accepted
**Date:** 2025-01-15

### Context

Need centralized API management for rate limiting, authentication, CORS, and request routing across microservices.

### Decision

Deploy **Kong** (declarative mode) as the edge API gateway:

- Rate limiting: 100 requests/minute per IP via Redis
- CORS centralized at gateway level
- Request size limiting (5MB max)
- Correlation ID injection for distributed tracing

### Consequences

- **Positive:** Consistent policy enforcement across all services
- **Positive:** Offloads cross-cutting concerns from backend
- **Negative:** Additional infrastructure component to maintain

---

## ADR-005: Helm Charts for Kubernetes Deployment

**Status:** Accepted
**Date:** 2025-01-15

### Context

Manual kubectl manifests are error-prone and don't support parameterized multi-environment deployments.

### Decision

Package all Kubernetes resources as a **Helm chart** with:

- HPA: 3-15 replicas, scaling on CPU (70%) and memory (80%)
- PDB: minAvailable=2 for zero-downtime deployments
- Pod anti-affinity by availability zone
- NetworkPolicy: default deny, explicit allow list

### Consequences

- **Positive:** Single `helm upgrade` for all environments
- **Positive:** Values file per environment (staging, production)
- **Negative:** Helm chart templating complexity
