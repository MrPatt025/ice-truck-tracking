# STRIDE Threat Model — Ice Truck Tracking Platform

## System Overview

The Ice Truck Tracking Platform is a cloud-native IoT system that monitors
ice delivery trucks in real-time. It ingests GPS telemetry, temperature
readings, and speed data from MQTT-connected devices, processes them through
a Kafka event bus, stores them in TimescaleDB hypertables, and serves
dashboards and mobile apps via REST/WebSocket APIs behind a Kong API Gateway.

---

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet (Untrusted)                    │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐              │
│  │ Browser  │  │ Mobile App│  │ IoT Devices │              │
│  └─────┬────┘  └─────┬─────┘  └──────┬──────┘              │
│────────┼──────────────┼───────────────┼──── Trust Boundary 1│
│        ▼              ▼               ▼                     │
│  ┌──────────────────────────────────────┐                   │
│  │           Kong API Gateway           │ ← TB2             │
│  │  (TLS termination, rate limiting)    │                   │
│  └─────────────────┬────────────────────┘                   │
│────────────────────┼──────────────────── Trust Boundary 2   │
│                    ▼                                        │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Backend │──│  Kafka   │──│  Workers  │ ← TB3             │
│  │  API    │  │  Broker  │  │          │                   │
│  └────┬────┘  └──────────┘  └──────────┘                   │
│───────┼──────────────────────────────── Trust Boundary 3    │
│       ▼                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │TimescaleDB│  │  Redis   │  │  Loki    │ ← TB4            │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Threat Analysis

### 1. Spoofing (S)

| ID  | Threat                 | Target           | Severity | Mitigation                                                                                |
| --- | ---------------------- | ---------------- | -------- | ----------------------------------------------------------------------------------------- |
| S1  | Forged JWT tokens      | Backend API      | High     | HS256 signing with strong secret (>64 chars), short TTL (15m), issuer/audience validation |
| S2  | Stolen refresh tokens  | Auth endpoints   | High     | Refresh token family tracking — reuse revokes entire family                               |
| S3  | Spoofed MQTT device ID | Mosquitto Broker | Critical | TLS client certificates, ACL by username (`%u` pattern)                                   |
| S4  | Password brute force   | Login endpoint   | Medium   | Rate limiting (5 attempts/15min), bcrypt with cost factor 12, account lockout             |

### 2. Tampering (T)

| ID  | Threat                     | Target      | Severity | Mitigation                                                       |
| --- | -------------------------- | ----------- | -------- | ---------------------------------------------------------------- |
| T1  | Modified telemetry payload | Kafka topic | High     | Zod schema validation on all inputs, HMAC message signing        |
| T2  | SQL injection              | TimescaleDB | Critical | Parameterized queries only (`$1, $2`), no string concatenation   |
| T3  | XSS via stored data        | Dashboard   | High     | Input sanitization (HTML tag stripping), CSP `script-src 'self'` |
| T4  | Tampered audit logs        | Audit table | High     | Immutable hypertable, no UPDATE/DELETE grants for app_user       |

### 3. Repudiation (R)

| ID  | Threat                      | Target        | Severity | Mitigation                                                              |
| --- | --------------------------- | ------------- | -------- | ----------------------------------------------------------------------- |
| R1  | User denies actions         | All endpoints | Medium   | Immutable audit_log hypertable with user_id, IP, action, payload hash   |
| R2  | Device denies sending data  | MQTT          | Medium   | TLS client cert binding, message timestamps checked against NTP         |
| R3  | Admin denies config changes | Admin panel   | Medium   | Audit trail records all admin mutations with `before`/`after` snapshots |

### 4. Information Disclosure (I)

| ID  | Threat                      | Target              | Severity | Mitigation                                                        |
| --- | --------------------------- | ------------------- | -------- | ----------------------------------------------------------------- |
| I1  | Leaked credentials in repo  | Git history         | Critical | Gitleaks pre-commit scanning, `.env.example` with blank values    |
| I2  | Excessive error messages    | API responses       | Medium   | Generic error responses in production, details only in audit logs |
| I3  | Database connection strings | Environment         | High     | HashiCorp Vault for secrets, never log connection strings         |
| I4  | Prometheus metrics exposure | `/metrics` endpoint | Low      | NetworkPolicy restricts access to monitoring namespace only       |

### 5. Denial of Service (D)

| ID  | Threat                     | Target                | Severity | Mitigation                                                      |
| --- | -------------------------- | --------------------- | -------- | --------------------------------------------------------------- |
| D1  | Request flooding           | Backend API           | High     | Kong rate limiting (100/min/IP), Express rate limiter as backup |
| D2  | Large payload attack       | Body parser           | Medium   | Request body limit 1MB, Kong request-size-limiting plugin       |
| D3  | Connection pool exhaustion | PgBouncer/TimescaleDB | High     | PgBouncer transaction pooling (1000 max), HPA auto-scaling      |
| D4  | MQTT message flooding      | Mosquitto             | High     | Per-client message rate limit, max_inflight_messages=20         |

### 6. Elevation of Privilege (E)

| ID  | Threat                                  | Target             | Severity | Mitigation                                                                                |
| --- | --------------------------------------- | ------------------ | -------- | ----------------------------------------------------------------------------------------- |
| E1  | Role escalation                         | RBAC system        | Critical | Role stored in signed JWT, verified on every request, no client-side role                 |
| E2  | Container escape                        | Kubernetes pods    | Critical | Distroless base images, `runAsNonRoot`, `readOnlyRootFilesystem`, `drop ALL` capabilities |
| E3  | Unauthorized admin access               | Admin routes       | High     | `requireRole('admin')` middleware, separate admin JWT claims                              |
| E4  | IDOR (Insecure Direct Object Reference) | Resource endpoints | Medium   | Ownership checks: drivers see only their trucks, shops see only their routes              |

---

## Risk Matrix

| Severity | Count | Examples                                                                |
| -------- | ----- | ----------------------------------------------------------------------- |
| Critical | 4     | S3 (MQTT spoofing), T2 (SQLi), I1 (leaked creds), E2 (container escape) |
| High     | 8     | S1, S2, T1, T4, I3, D1, D3, E1                                          |
| Medium   | 7     | S4, R1-R3, I2, D2, E4                                                   |
| Low      | 1     | I4                                                                      |

---

## Controls Summary

| Control               | Implementation                    | Status        |
| --------------------- | --------------------------------- | ------------- |
| Input Validation      | Zod schemas on all routes         | ✅ Implemented |
| Authentication        | JWT 15m TTL + refresh rotation    | ✅ Implemented |
| Authorization         | RBAC with 5 roles                 | ✅ Implemented |
| Encryption in Transit | TLS 1.3 everywhere                | ✅ Configured  |
| Encryption at Rest    | PostgreSQL TDE (planned)          | 🔲 Planned     |
| Audit Logging         | Immutable hypertable              | ✅ Implemented |
| Secret Scanning       | Gitleaks pre-commit + CI          | ✅ Implemented |
| Container Security    | Distroless, seccomp, capabilities | ✅ Implemented |
| Rate Limiting         | Kong + Express dual-layer         | ✅ Implemented |
| Network Segmentation  | K8s NetworkPolicy default-deny    | ✅ Implemented |
