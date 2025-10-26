```markdown
# 🚚❄️ Ice Truck Tracking Platform

[![CI](https://github.com/MrPatt025/ice-truck-tracking/actions/workflows/ci.yml/badge.svg)](https://github.com/MrPatt025/ice-truck-tracking/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/MrPatt025/ice-truck-tracking/badge.svg?branch=main)](https://coveralls.io/github/MrPatt025/ice-truck-tracking?branch=main)
[![Lint](https://img.shields.io/badge/lint-passing-brightgreen)](./)
[![Security Audit](https://img.shields.io/badge/security-audit-brightgreen)](https://github.com/MrPatt025/ice-truck-tracking/security)
[![Release](https://img.shields.io/github/v/release/MrPatt025/ice-truck-tracking)](https://github.com/MrPatt025/ice-truck-tracking/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Enterprise-grade monorepo for real-time cold-chain tracking, analytics, and
> operations.**

---

## Table of Contents

- [Overview](#overview)
- [Monorepo Layout](#monorepo-layout)
- [Prerequisites](#prerequisites)
- [Quick Start (Local)](#quick-start-local)
- [Configuration](#configuration)
- [Development](#development)
- [Architecture](#architecture)
- [Scripts](#scripts)
- [Testing & Quality](#testing--quality)
- [Security](#security)
- [Observability](#observability)
- [Deployment (Docker)](#deployment-docker)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Ice Truck Tracking** ให้การมองเห็นแบบ end-to-end สำหรับรถห้องเย็น: ตำแหน่งเรียลไทม์
อุณหภูมิสินค้า geofencing analytics และการแจ้งเตือนอัตโนมัติ ภายใน monorepo นี้มีบริการ
**Backend API (Express + WebSocket)** และ **Next.js Dashboard** พร้อมรองรับ
metrics/health สำหรับการมอนิเตอร์ระดับโปรดักชัน

---

## Monorepo Layout
```

ice-truck-tracking/ ├── backend/ # Express REST + WebSocket, auth, metrics │ └── src/
├── dashboard/ # Next.js (App Router) dashboard: maps, alerts, KPIs │ └── src/ ├── sdk/
│ ├── edge/ # (optional) Edge SDK/service │ └── mobile/ # (optional) Mobile SDK ├──
mobile-app/ # (optional) Expo/React Native └── docs/infra/... # (optional) Docs / IaC /
pipelines

````

> ขณะนี้ **backend** และ **dashboard** ใช้งานได้แล้ว; โมดูลอื่น ๆ เพิ่ม/เปิดใช้ภายหลัง

---

## Prerequisites

- **Node.js** ≥ 18.19
- **pnpm** ≥ 8
- (แนะนำ) **Docker** และ **Docker Compose**
- (ตัวเลือก) **Mapbox token** หากเปิดแผนที่จริงใน UI

---

## Quick Start (Local)

```bash
# 1) Clone & install
git clone https://github.com/MrPatt025/ice-truck-tracking.git
cd ice-truck-tracking
pnpm install

# 2) ตั้งค่า env (ดูตัวอย่างด้านล่างหรือ .env.example)
#   - backend/.env
#   - dashboard/.env.local

# 3) รันแยกเทอร์มินัล
# Terminal A: Backend
pnpm --filter backend start

# Terminal B: Dashboard
pnpm --filter dashboard dev

# Access
# API:       http://localhost:5000
# Dashboard: http://localhost:3000
# Health:    http://localhost:5000/api/v1/health
# Metrics:   http://localhost:5000/metrics
````

> Windows PowerShell: export ชั่วคราวด้วย `$env:NAME="value"`

---

## Configuration

ตัวอย่างไฟล์:

**`backend/.env`**

```env
NODE_ENV=development
PORT=5000

# Auth / Security
JWT_SECRET=change-me
SALT_ROUNDS=1
CLIENT_URL=http://localhost:3000

# Dev helpers
USE_FAKE_DB=true
DISABLE_RATE_LIMIT=true
```

**`dashboard/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
# NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

มีไฟล์ตัวอย่างรวมที่ราก: `.env.example`

---

## Development

- โค้ดสไตล์: **ESLint + Prettier**
- Commit: **Conventional Commits** (`feat:`, `fix:`, `chore:` …)
- แนะนำทำงานบน branch แล้วเปิด PR เข้า `main`
- เปิด **Next.js Fast Refresh** และ **WebSocket** สำหรับข้อมูลเรียลไทม์

---

## Architecture

**Layers**

- **Routes/Controllers** — รับ/ตรวจสอบ input
- **Services** — บิสิเนสลอจิก/ออเคสเตรต
- **Repositories** — data access (dev: in-memory/SQLite)
- **Interfaces** — REST (`/api/v1/*`) + WebSocket (realtime)
- **Cross-cutting** — auth, rate limit, validation, logging, metrics

**Realtime**

- Backend broadcast ผ่าน WebSocket
- Dashboard subscribe; fallback เป็น polling เมื่อ WS ยังไม่เชื่อมต่อ

---

## Scripts

รันจาก root:

| Command                       | Description                        |
| ----------------------------- | ---------------------------------- |
| `pnpm --filter backend start` | Start API + WS                     |
| `pnpm --filter dashboard dev` | Start Next.js dev server           |
| `pnpm dev`                    | Run all dev (ผ่าน turbo)           |
| `pnpm build`                  | Build ทุกแพ็กเกจ                   |
| `pnpm lint` / `pnpm lint:fix` | ตรวจ/แก้ format & lint             |
| `pnpm type-check`             | ตรวจ TypeScript แบบ noEmit         |
| `pnpm docker:up`              | รันผ่าน Docker Compose             |
| `pnpm docker:down`            | ปิดและลบคอนเทนเนอร์                |
| `pnpm db:cleanup`             | ล้างข้อมูลกำพร้า (สคริปต์ตัวอย่าง) |

---

## Testing & Quality

- เตรียมรองรับ Unit/Integration/E2E (Jest / Playwright ได้)
- Lint/Type-check ใน CI
- เป้าหมาย coverage ≥ **90%** (เพิ่มกติกาในอนาคต)

---

## Security

- HTTP hardening (Helmet), CORS, JWT, rate-limit
- Dev mode สามารถตั้ง `DISABLE_RATE_LIMIT=true`
- ตรวจ dependencies: `pnpm audit` / Snyk
- แจ้งประเด็นความปลอดภัยผ่าน **GitHub Security Advisories**

---

## Observability

- **Health**: `GET /api/v1/health`
- **Metrics**: `GET /metrics` (Prometheus format)
- พร้อมต่อยอด Grafana/Prometheus และ exporters อื่น ๆ

---

## Deployment (Docker)

มีตัวอย่าง `docker-compose.yml` สำหรับ:

- **backend** + **dashboard**
- **prometheus** + **grafana** (พร้อม storage/โปรวิชัน dashboards)
- **redis** (แคช)
- **nginx** (reverse proxy/SSL)

เริ่มต้น:

```bash
pnpm docker:build
pnpm docker:up
# http://localhost (nginx), :3000 dashboard, :5000 api, :9090 prometheus, :3001 grafana
```

---

## Roadmap

- Advanced geofencing & rule-based alerts
- Predictive analytics (ETA/temperature anomalies)
- Multi-tenant + RBAC
- SDKs (Edge/Mobile) และ Mobile App พร้อมใช้งานจริง

---

## Contributing

1. Fork
2. `git checkout -b feat/your-change`
3. Commit ตาม Conventional Commits
4. เปิด PR พร้อมรายละเอียด/สกรีนช็อต

---

## License

โครงการนี้ใช้สัญญาอนุญาต **MIT** — ดูที่ [LICENSE](./LICENSE)

---

**Built by MrPatt025 · Ice Truck Tracking Platform**
