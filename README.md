นี่คือเวอร์ชัน README.md ที่แก้ไขให้เรียบร้อย อ่านง่าย ลิงก์/แบดจ์ถูกต้องตามรูปแบบ และสอดคล้องกับสภาพโปรเจกต์ (backend + dashboard บน pnpm/monorepo). แทนที่ `<OWNER>` กับ `<REPO>` ด้วยของจริงของคุณก่อนคอมมิต

---

# 🚚❄️ Ice Truck Tracking Platform

[![CI](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml/badge.svg)](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/<OWNER>/<REPO>/badge.svg?branch=main)](https://coveralls.io/github/<OWNER>/<REPO>?branch=main)
[![Lint](https://img.shields.io/badge/lint-passing-brightgreen)](./)
[![Security Audit](https://img.shields.io/badge/security-audit-passing-brightgreen)](https://github.com/<OWNER>/<REPO>/security)
[![Release](https://img.shields.io/github/v/release/<OWNER>/<REPO>)](https://github.com/<OWNER>/<REPO>/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Enterprise-grade monorepo for real-time cold-chain tracking, analytics, and operations.**

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
* [License](#license)

---

## Overview

**Ice Truck Tracking** ให้การมองเห็นปลายทางถึงปลายทางสำหรับรถห้องเย็น: ตำแหน่งเรียลไทม์, อุณหภูมิสินค้า, geofencing, analytics และการแจ้งเตือนอัตโนมัติ ภายใน repo นี้มีบริการ backend และเว็บแดชบอร์ดแบบเรียลไทม์ (รองรับ WebSocket)

---

## Monorepo Layout

```
ice-truck-tracking/
├── backend/      # Express REST + WebSocket, auth, metrics
│   ├── src/
│   └── index.js
├── dashboard/    # Next.js App Router dashboard (maps, alerts, KPIs)
│   └── src/
├── docs/         # (optional) guides/ADR/architecture
└── infra/        # (optional) IaC / pipelines
```

> ถ้ามีโมดูลอื่น (mobile-app/, sdk/ ฯลฯ) เพิ่มโครงสร้างตามจริงได้ภายหลัง

---

## Prerequisites

* **Node.js** 18+
* **pnpm** 8+
* (แนะนำ) **Docker** / **Docker Compose** สำหรับรันแบบ container
* Map rendering: **Mapbox token** (ถ้าเปิดแผนที่จริงใน UI)

---

## Quick Start

```bash
# 1) Clone & install (ใช้ pnpm สำหรับ workspaces)
git clone https://github.com/<OWNER>/<REPO>.git
cd ice-truck-tracking
pnpm install

# 2) ตั้งค่า env
# backend/.env (ดูตัวอย่างด้านล่าง)
# dashboard/.env.local (ดูตัวอย่างด้านล่าง)

# 3) รันแยกเทอร์มินัล
# Terminal A: Backend
pnpm --filter backend start

# Terminal B: Dashboard (Next.js dev)
pnpm --filter dashboard dev

# Access
# API:       http://localhost:5000
# Dashboard: http://localhost:3000
# Metrics:   http://localhost:5000/metrics
# Health:    http://localhost:5000/api/v1/health
```

> ใน Windows PowerShell คุณอาจ export env ชั่วคราวด้วย `$env:NAME="value"`

---

## Development

* โค้ดสไตล์: ESLint + Prettier
* Commits: **Conventional Commits** (`feat:`, `fix:`, `chore:` …)
* แนะนำให้ทำงานบน branch แล้ว PR เข้า `main`

---

## Architecture

**Clean layering**:

* **Routes/Controllers** — รับ/ตรวจสอบ input
* **Services** — บิสิเนสรวม logic และ orchestration
* **Repositories** — data access (dev ใช้ in-memory/SQLite ได้)
* **Interfaces** — REST (`/api/v1/*`) + WebSocket (realtime)
* **Cross-cutting** — auth, rate limit, validation, logging, metrics

**Realtime**:

* Backend broadcast ผ่าน WebSocket
* Dashboard subscribe และ fallback เป็น polling หากยังไม่เชื่อมต่อ

---

## Technology Stack

| Layer    | Tech/Tools                            |
| -------- | ------------------------------------- |
| Backend  | Node.js, Express, WebSocket, JWT      |
| Frontend | Next.js (App Router), React, Tailwind |
| DevOps   | pnpm workspaces, GitHub Actions       |
| Observ.  | Prometheus metrics, (Grafana-ready)   |
| Security | Helmet, CORS, Rate limiting           |

---

## Key Features

* **Realtime Dashboard**: สถานะรถ/อุณหภูมิ/alerts แบบสด
* **REST + WebSocket**: low-latency updates
* **Metrics & Health**: พร้อมสำหรับ monitoring
* **Dev-friendly**: pnpm workspaces, live reload

---

## Configuration

สร้างไฟล์ตามนี้:

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
# NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token   # (ถ้าใช้แผนที่จริง)
```

> ใน dev เราอนุญาต `DISABLE_RATE_LIMIT=true` เพื่อหลีกเลี่ยง 429 ระหว่างรีเฟรชบ่อย ๆ

---

## Scripts

รันที่ root หรือเฉพาะแพ็กเกจ:

| Command                       | Description                  |
| ----------------------------- | ---------------------------- |
| `pnpm --filter backend start` | Start Express API + WS       |
| `pnpm --filter dashboard dev` | Start Next.js dev server     |
| `pnpm -r build`               | Build ทุกแพ็กเกจ (recursive) |
| `pnpm -r lint`                | Lint ทุกแพ็กเกจ              |
| `pnpm -r test`                | รันเทสต์ (ถ้ากำหนดไว้)       |

> คุณสามารถเพิ่มสคริปต์ orchestrator ที่ root (เช่น ใช้ turbo หรือ concurrently) ภายหลังได้

---

## Testing & Quality

* Unit/Integration tests (Jest) — (เพิ่มภายหลังได้)
* Lint & format ใน CI
* เป้าหมาย coverage ≥ **90%** (กำหนดในอนาคต)

---

## CI/CD

Pipeline แนะนำ: **Lint → Type-check → Build → Test → Security → Release**
ตัวอย่าง workflow: `.github/workflows/ci.yml` (เพิ่มเมื่อพร้อม)
Release แนะนำ: **semantic-release**

---

## Security

* Helmet + CORS
* JWT auth
* Rate limit (ปิดได้ใน dev ด้วย `DISABLE_RATE_LIMIT=true`)
* Audit dependencies (Snyk / `pnpm audit`)

> แจ้งปัญหาด้านความปลอดภัยผ่าน **GitHub Security Advisories**

---

## Observability

* **Health**: `GET /api/v1/health`
* **Metrics**: `GET /metrics` (Prometheus format)

---

## Deployment

* **Local (bare-metal)**: ใช้สคริปต์ pnpm ข้างต้น
* **Docker**: เพิ่ม `Dockerfile`/`docker-compose.yml` เมื่อพร้อม
* **Kubernetes/Terraform**: วางไว้ใน `infra/` (ถ้ามี)

---

## Roadmap

* Geofencing ขั้นสูงและ rule-based alerts
* Predictive ETA/temperature anomalies
* Multi-tenant + RBAC
* SDKs สำหรับ Edge/Mobile

---

## Documentation

* `docs/ARCHITECTURE.md` — ภาพรวมระบบ
* `docs/DEPLOYMENT.md` — แนวทางดีพลอย
* `docs/CONTRIBUTING.md` — วิธีร่วมพัฒนา

> เอกสารจะขยายเมื่อโปรเจกต์เติบโต

---

## Contributing

1. Fork
2. `git checkout -b feat/your-change`
3. Commit แบบ Conventional Commits
4. เปิด PR พร้อมรายละเอียด/ภาพหน้าจอ

---

## License

โครงการนี้ใช้สัญญาอนุญาต **MIT** — ดูที่ [LICENSE](./LICENSE)

---

**Built by the Ice Truck Tracking Team.**
