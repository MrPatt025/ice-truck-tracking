# C4 Architecture Model — Ice Truck Tracking Platform

## Level 1: System Context Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          External Actors                            │
│                                                                     │
│  ┌───────────┐   ┌──────────────┐   ┌───────────┐   ┌────────────┐  │
│  │ Dispatcher│   │ Fleet Manager│   │ Driver    │   │ Shop Owner │  │
│  └─────┬─────┘   └──────┬───────┘   └─────┬─────┘   └──────┬─────┘  │
│        │                │                 │                │        │
│        ▼                ▼                 ▼                ▼        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Ice Truck Tracking Platform                 │   │
│  │                                                              │   │
│  │  Real-time GPS tracking, temperature monitoring, route       │   │
│  │  optimization, and delivery management for ice trucks        │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│              ┌──────────┼──────────┐                                │
│              ▼          ▼          ▼                                │
│  ┌──────────────┐ ┌─────────┐ ┌──────────┐                          │
│  │ IoT Devices  │ │ Mapbox  │ │ Keycloak │                          │
│  │ (OBD/GPS)    │ │ Maps API│ │ IAM      │                          │
│  └──────────────┘ └─────────┘ └──────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Level 2: Container Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    Ice Truck Tracking Platform                          │
│                                                                         │
│  ┌────────────────────────────────────────────────────┐                 │
│  │                   Edge Layer                       │                 │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │                 │
│  │  │  Nginx   │  │  Kong    │  │  Mosquitto MQTT  │  │                 │
│  │  │ (Reverse │  │ (API GW) │  │  (TLS + ACL)     │  │                 │
│  │  │  Proxy)  │  │          │  │                  │  │                 │
│  │  └────┬─────┘  └─────┬────┘  └─────────┬────────┘  │                 │
│  └───────┼──────────────┼─────────────────┼───────────┘                 │
│          │              │                 │                             │
│  ┌───────┼──────────────┼─────────────────┼───────────┐                 │
│  │       │     Application Layer          │           │                 │
│  │       ▼              ▼                 ▼           │                 │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │                 │
│  │  │Dashboard │  │ Backend  │  │ Telemetry Worker │  │                 │
│  │  │Next.js 15│  │Express.js│  │ (Kafka Consumer) │  │                 │
│  │  │ (SSR/ISR)│  │ (REST +  │  │                  │  │                 │
│  │  │          │  │  WS API) │  │                  │  │                 │
│  │  └──────────┘  └─────┬────┘  └─────────┬────────┘  │                 │
│  └──────────────────────┼─────────────────┼───────────┘                 │
│                         │                 │                             │
│  ┌──────────────────────┼─────────────────┼───────────┐                 │
│  │             Event & Cache Layer        │           │                 │
│  │                      ▼                 ▼           │                 │
│  │  ┌──────────┐  ┌──────────┐                        │                 │
│  │  │  Redis   │  │  Kafka   │                        │                 │
│  │  │ (Cache + │  │ (Event   │                        │                 │
│  │  │  Session)│  │  Bus)    │                        │                 │
│  │  └──────────┘  └──────────┘                        │                 │
│  └────────────────────────────────────────────────────┘                 │
│                         │                                               │
│  ┌──────────────────────┼─────────────────────────────┐                 │
│  │             Data Layer                             │                 │
│  │                      ▼                             │                 │
│  │  ┌──────────────────────────────────┐              │                 │
│  │  │         TimescaleDB              │              │                 │
│  │  │  ┌─────────────────────────┐     │              │                 │
│  │  │  │ Hypertables:            │     │              │                 │
│  │  │  │  • telemetry (1d chunks)│     │              │                 │
│  │  │  │  • alerts (7d chunks)   │     │              │                 │
│  │  │  │  • audit_log (30d)      │     │              │                 │
│  │  │  └─────────────────────────┘     │              │                 │
│  │  │  ┌─────────────────────────┐     │              │                 │
│  │  │  │ Continuous Aggregates:  │     │              │                 │
│  │  │  │  • telemetry_hourly     │     │              │                 │
│  │  │  │  • alerts_daily         │     │              │                 │
│  │  │  └─────────────────────────┘     │              │                 │
│  │  └──────────────────────────────────┘              │                 │
│  │         │                                          │                 │
│  │         ▼                                          │                 │
│  │  ┌──────────┐                                      │                 │
│  │  │PgBouncer │ (Transaction pooling, 1000 conns)    │                 │
│  │  └──────────┘                                      │                 │
│  └────────────────────────────────────────────────────┘                 │
│                                                                         │
│  ┌──────────────────────────────────────────────────┐                   │
│  │             Observability Layer                  │                   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │                   │
│  │  │Prometheus│  │  Grafana │  │  Jaeger  │        │                   │
│  │  │ (Metrics)│  │(Dashboard│  │ (Traces) │        │                   │
│  │  │          │  │  + Alerts│  │          │        │                   │
│  │  └──────────┘  └──────────┘  └──────────┘        │                   │
│  │  ┌──────────┐                                    │                   │
│  │  │   Loki   │                                    │                   │
│  │  │  (Logs)  │                                    │                   │
│  │  └──────────┘                                    │                   │
│  └──────────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Level 3: Component Diagram — Backend API

```text
┌──────────────────────────────────────────────────────────┐
│                   Backend API (Express.js)               │
│                                                          │
│  ┌─────────────────── Middleware Stack ────────────────┐ │
│  │                                                     │ │
│  │  requestId → helmet → securityHeaders → cors →      │ │
│  │  cookieParser → rateLimiter → bodyParser →          │ │
│  │  sanitize → auditMiddleware → metricsMiddleware     │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────── Route Layer ─────────────────────┐ │
│  │                                                     │ │
│  │  /api/v1/auth     → AuthController (register,       │ │
│  │                      login, refresh, revoke)        │ │
│  │  /api/v1/trucks   → TruckController (CRUD + GPS)    │ │
│  │  /api/v1/drivers  → DriverController (assignment)   │ │
│  │  /api/v1/routes   → RouteController (optimization)  │ │
│  │  /api/v1/alerts   → AlertController (thresholds)    │ │
│  │  /api/v1/telemetry→ TelemetryController (ingest)    │ │
│  │  /api/v1/health   → HealthController (liveness)     │ │
│  │  /metrics         → PrometheusExporter              │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────── Service Layer ───────────────────┐ │
│  │                                                     │ │
│  │  AuthService    → JWT signing, refresh rotation     │ │
│  │  EventBus       → Kafka publish/subscribe           │ │
│  │  MqttService    → Device telemetry subscription     │ │
│  │  TelemetryIngest→ Batch insert to TimescaleDB       │ │
│  │  WebSocketService→ Real-time push to clients        │ │
│  │  CacheService   → Redis get/set/invalidate          │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Data Flow: Telemetry Ingestion

```text
IoT Device ──MQTT/TLS──▶ Mosquitto ──ACL Check──▶ Backend (MQTT subscriber)
                                                         │
                                                         ▼
                                                  Zod Validation
                                                         │
                                                         ▼
                                                  Kafka (telemetry.raw)
                                                         │
                                          ┌──────────────┼──────────────┐
                                          ▼              ▼              ▼
                                     TimescaleDB    Alert Engine    WebSocket
                                     (hypertable)   (threshold     (real-time
                                                     check)         broadcast)
                                          │              │
                                          ▼              ▼
                                   Continuous       Kafka (alerts.triggered)
                                   Aggregates              │
                                   (hourly/daily)          ▼
                                                     Notification
                                                     (email/push)
```

## Deployment Topology

```text
┌──────────────── Kubernetes Cluster ─────────────────────┐
│                                                         │
│  ┌─────────── Zone A ──────────┐  ┌──── Zone B ──────┐  │
│  │                              │  │                  │ │
│  │  backend-pod-1               │  │  backend-pod-2   │ │
│  │  dashboard-pod-1             │  │  dashboard-pod-2 │ │
│  │  timescaledb-primary         │  │  timescaledb-    │ │
│  │  redis-primary               │  │   replica        │ │
│  │  kafka-broker-0              │  │  kafka-broker-1  │ │
│  │                              │  │                  │ │
│  └──────────────────────────────┘  └──────────────────┘ │
│                                                         │
│  ┌─── Monitoring Namespace ──────────────────────────┐  │
│  │  prometheus  grafana  loki  jaeger                │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  HPA: 3-15 replicas (CPU 70%, Memory 80%)               │
│  PDB: minAvailable=2                                    │
│  Anti-affinity: spread across zones                     │
└─────────────────────────────────────────────────────────┘
```
