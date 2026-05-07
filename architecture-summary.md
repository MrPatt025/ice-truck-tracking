# Ice Truck Tracking Platform - Architecture Summary

This document provides a comprehensive overview of the Ice Truck Tracking Platform, detailing its architecture, technology stack, database schema, primary API endpoints, and the flow of IoT telemetry data.

## 1. Architecture Overview

The system is designed as a **Monorepo** using **TurboRepo** and follows **Clean Architecture** principles (Controllers → Services → Repositories → Database/API). It is built for scale, real-time tracking, and high observability.

### Layered Architecture

- **Edge Layer**: Nginx (Reverse Proxy) and Kong (API Gateway) manage incoming HTTP/WS traffic. Eclipse Mosquitto handles MQTT traffic with TLS and ACLs.
- **Application Layer**:
  - **Dashboard**: A Next.js 15 application utilizing Server-Side Rendering (SSR) and Incremental Static Regeneration (ISR).
  - **Backend**: An Express.js REST API and WebSocket server.
  - **Telemetry Worker**: A Kafka consumer dedicated to processing high-throughput IoT data.
  - **Mobile App**: A React Native (Expo) mobile application.
- **Event & Cache Layer**: Redis is used for caching and session management. Kafka serves as the central event bus.
- **Data Layer**: TimescaleDB (PostgreSQL) is the primary database, utilizing Hypertables for time-series data and PgBouncer for transaction pooling.
- **Observability Layer**: Prometheus (Metrics), Grafana (Dashboards/Alerts), Loki (Logs), and Jaeger (Distributed Tracing).

## 2. Tech Stack

### Backend

- **Runtime**: Node.js (>=22.0.0)
- **Framework**: Express.js (v5.2.1)
- **Database**: PostgreSQL with TimescaleDB extension (`pg` client)
- **Message Brokers**: Kafka (`kafkajs`), MQTT (`mqtt` client connected to Mosquitto)
- **Caching & Real-time**: Redis (`ioredis`), Socket.io
- **Security & Validation**: Zod, Helmet, bcryptjs, jsonwebtoken
- **Logging**: Pino

### Frontend (Dashboard)

- **Framework**: Next.js 16.2.4 (React 19.2.5)
- **Styling**: Tailwind CSS v4, Framer Motion, Radix UI
- **State Management**: Zustand
- **Mapping & Visualization**: Mapbox GL, Deck.gl, Three.js, React Three Fiber
- **Real-time**: Socket.io-client
- **Testing**: Playwright (E2E), Jest, Testing Library

### Infrastructure & DevOps

- **Containerization**: Docker, Multi-stage builds, Docker Compose
- **Orchestration & IaC**: Kubernetes (K8s), Terraform
- **CI/CD**: GitHub Actions (Lint, Type-check, Build, Test, E2E, Deploy)
- **Code Quality**: ESLint 10, Prettier, Husky, lint-staged, commitlint, Stryker (Mutation Testing)

## 3. Database Schema (TimescaleDB)

The database utilizes relational tables for entities and TimescaleDB specific features (Hypertables) for time-series data.

### Core Entities

- **USERS**: Stores user credentials, roles (`admin|manager|dispatcher|driver|viewer`), and profile data. Links to `REFRESH_TOKENS` and `AUDIT_LOG`.
- **TRUCKS**: Stores truck metadata, plate number, capacity, and status.
- **DRIVERS**: Links `USERS` to `TRUCKS` with license details.
- **SHOPS**: Delivery destinations with geolocation and contact info.
- **ROUTES & ROUTE_STOPS**: Delivery sequences linking trucks to shops with planned vs. actual metrics.

### Time-Series Data (Hypertables)

- **TELEMETRY** (1-day chunk interval): Stores GPS and sensor data (`latitude`, `longitude`, `speed_kmh`, `temperature_c`, `fuel_level_pct`, `battery_voltage`, `extra` JSONB).
  - _Continuous Aggregate_: `telemetry_hourly`.
- **ALERTS** (7-day chunk interval): Stores triggered events (`severity`, `type`, `acknowledged` status).
  - _Continuous Aggregate_: `alerts_daily`.
- **AUDIT_LOG** (30-day chunk interval): Action logging for compliance and history.

## 4. API Endpoints

The backend exposes a structured RESTful API and WebSocket channels. Key endpoint groups include:

### Observability & Health

- `GET /health`, `/health/healthz`, `/health/readyz`, `/health/livez`
- `GET /metrics` (Prometheus)
- `GET /api-docs` (Swagger/OpenAPI)

### Authentication

- `POST /auth/login`
- `POST /auth/register`

### Entity Management

- **Drivers**: `/drivers`, `/drivers/{id}`
- **Trucks**: `/trucks`, `/trucks/{id}`
- **Shops**: `/shops`, `/shops/{id}`

### Real-time Tracking & Telemetry

- `GET /tracking/trucks`
- `GET /tracking/trucks/{id}`
- `GET /tracking/history/{truckId}`
- `POST /tracking/location`
- `POST /tracking/bulk`
- **Alerts**: `/alerts`

### Mobile & Device SDK Integration

- `/mobile/register`, `/mobile/devices`, `/mobile/device/{deviceId}`
- `/mobile/location`, `/mobile/sync`, `/mobile/ping`

### System Configuration

- `/feature-flags`, `/feature-flags/{key}/check`, `/feature-flags/{key}/rollout`

## 5. IoT Data Flow

The system employs an event-driven architecture to ingest, process, and distribute high-throughput telemetry data efficiently.

1. **Ingestion**: IoT Devices (OBD/GPS trackers) send data via MQTT/TLS to the **Mosquitto** broker. Mosquitto enforces Access Control Lists (ACLs).
2. **Subscription**: The Backend Service (acting as an MQTT subscriber) picks up the data.
3. **Validation**: The payload is strictly validated using **Zod** schemas.
4. **Event Bus Publish**: Validated data is published to a **Kafka** topic (`telemetry.raw`).
5. **Parallel Processing** (via Kafka Consumers):
   - **Storage**: The Telemetry Ingest Worker batches and inserts data into the **TimescaleDB** `telemetry` hypertable. Continuous aggregates automatically summarize this data hourly/daily.
   - **Alerting**: The Alert Engine evaluates the data against thresholds (e.g., temperature spikes, geofence breaches). If triggered, it pushes to an `alerts.triggered` Kafka topic, which notifies users via email/push.
   - **Real-time Broadcast**: The WebSocket Service pushes the exact location and sensor updates in real-time to active clients on the Next.js Dashboard and Mobile App.
