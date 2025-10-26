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
- [Further docs](#further-docs)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Ice Truck Tracking** ให้การมองเห็นแบบ end-to-end สำหรับรถห้องเย็น: ตำแหน่งเรียลไทม์
อุณหภูมิสินค้า geofencing analytics และการแจ้งเตือนอัตโนมัติ ภายใน monorepo นี้มีบริการ
**Backend API (Fastify v4 + Zod + Prisma)** และ **Next.js 15 Dashboard (React 19)** พร้อมรองรับ
metrics/health สำหรับการมอนิเตอร์ระดับโปรดักชัน

หมายเหตุ: การอัปเดตล่าสุดได้ปรับสแต็ก backend จาก Express เป็น Fastify v4 และทำให้ WebSocket
ถูกปิดชั่วคราวในสภาพแวดล้อม dev โดย UI จะดึงข้อมูลด้วย REST polling แทนในระหว่างนี้

---

## Monorepo Layout
```

ice-truck-tracking/ ├── backend/ # Fastify v4 REST (Zod/Prisma), auth, metrics │ └── src/
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
# 1) Clone & install (workspace)
git clone https://github.com/MrPatt025/ice-truck-tracking.git
cd ice-truck-tracking
pnpm -w install

# 2) ตั้งค่า env (ดูตัวอย่างด้านล่างหรือ backend/env.example)
#   - backend/.env
#   - dashboard/.env.local

# 3) Generate Prisma client (ครั้งแรกหลังติดตั้ง)
pnpm -C backend prisma:generate

# 4) รันแยกเทอร์มินัล (Dev)
# Terminal A: Backend (Fastify dev server)
pnpm -C backend dev

# Terminal B: Dashboard (Next.js dev server)
pnpm -C dashboard dev

# Access
# API:       http://localhost:5000
# Dashboard: http://localhost:3000
# Health:    http://localhost:5000/api/v1/health
# Metrics:   http://localhost:5000/metrics
```
````

> Windows PowerShell: export ชั่วคราวด้วย `$env:NAME="value"`

---

## Configuration

ตัวอย่างไฟล์:

**`backend/.env`**

```env
# Server
NODE_ENV=development
PORT=5000

# CORS (อนุญาต Dashboard ใน dev)
CORS_ORIGINS=http://localhost:3000

# Auth / Security
JWT_SECRET=change-me-in-dev

# Database (Prisma - SQLite)
DATABASE_URL=file:./prisma/dev.db
```

**`dashboard/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
# WS ถูกปิดชั่วคราวใน dev — UI ใช้ REST polling
# NEXT_PUBLIC_WS_URL=ws://localhost:5000
# NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

มีไฟล์ตัวอย่างรวมที่ราก: `.env.example`

---

## Development

- โค้ดสไตล์: **ESLint + Prettier**
- Commit: **Conventional Commits** (`feat:`, `fix:`, `chore:` …)
- แนะนำทำงานบน branch แล้วเปิด PR เข้า `main`
- Dev UX: Next.js Fast Refresh; ข้อมูล realtime ปัจจุบันใช้ REST polling (WS ปิดชั่วคราว)

---

## Architecture

**Layers**

- **Routes/Controllers** — รับ/ตรวจสอบ input
- **Services** — บิสิเนสลอจิก/ออเคสเตรต
- **Repositories** — data access (dev: in-memory/SQLite)
- **Interfaces** — REST (`/api/v1/*`) + WebSocket (realtime)
- **Cross-cutting** — auth, rate limit, validation, logging, metrics

**Realtime**

- Dev/Local: ใช้ REST polling เป็นค่าเริ่มต้น
- WebSocket จะถูกเปิดอีกครั้งเมื่อปลั๊กอิน Fastify จัดการเวอร์ชันเรียบร้อย

---

## Scripts

รันจาก root:

| Command                       | Description                        |
| ----------------------------- | ---------------------------------- |
| `pnpm -C backend dev`         | Start API (Fastify dev)            |
| `pnpm -C backend build`       | Build backend (tsc)                |
| `pnpm -C backend start`       | Start compiled API (dist)          |
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

- HTTP hardening (Helmet), CORS, JWT, rate-limit (บางปลั๊กอินอาจถูกปิดใน dev เพื่อความเสถียร)
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

## Further docs

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Production deployment checklist
- [`docs/SENTRY.md`](docs/SENTRY.md) — Sentry setup for Next.js 15 + React 19
  
เพิ่มเติม:
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md) (ถ้ามี)

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
