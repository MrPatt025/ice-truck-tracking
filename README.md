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
  [QA Baseline](#qa-baseline)
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

```

> ขณะนี้ **backend** และ **dashboard** ใช้งานได้แล้ว; โมดูลอื่น ๆ เพิ่ม/เปิดใช้ภายหลัง

---

## Prerequisites

- **Node.js** ≥ 20.19.4 (use `nvm` to install: `nvm use`)
- **pnpm** 10.19.0-10.20.0 (managed via corepack)
- (แนะนำ) **Docker** และ **Docker Compose**
- (ตัวเลือก) **Mapbox token** หากเปิดแผนที่จริงใน UI

---

## Dev Setup

```bash
# 1) Install Node 20.19.4
nvm install 20.19.4
nvm use

# 2) Enable corepack and install pnpm
corepack enable
corepack prepare pnpm@10.20.0 --activate

# 3) Clone & install workspace dependencies
git clone https://github.com/MrPatt025/ice-truck-tracking.git
cd ice-truck-tracking
pnpm -w install

# 4) Setup environment files
#   - backend/.env (see backend/env.example)
#   - dashboard/.env.local

# 5) Generate Prisma client
pnpm -C backend prisma:generate

# 6) Run development servers
pnpm -C backend dev      # Terminal 1: http://localhost:5000
pnpm -C dashboard dev    # Terminal 2: http://localhost:3000
```

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

---

## Local Dev Runbook

### Node Version Requirements

**Required**: Node.js >= **20.19.0** for full tooling compatibility.

- If you're on Node 20.18.0, you can still develop but some tools (taze, size-limit auto-update) may have limited functionality
- Run installations with: `pnpm install --config.engine-strict=false`
- Consider upgrading to >= 20.19.0 for optimal experience

### Startup Sequence

```bash
# Terminal 1 - Backend API
pnpm -F backend dev

# Terminal 2 - Dashboard UI
pnpm -F dashboard dev

# Access Points:
# Dashboard: http://localhost:3000
# API:       http://localhost:5000/api/v1
# Health:    http://localhost:5000/api/v1/health
```

### Demo Credentials

```
Username: admin
Password: password

# Alternative demo account:
Username: demo
Password: demo
```

### Health Check Commands

**API Health:**

```bash
# Basic health check
curl -i http://localhost:5000/api/v1

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {"ok":true,"name":"Ice Truck API","version":"1.0.0"}
```

**Login Test:**

```bash
# Test authentication endpoint
curl -i -X POST http://localhost:5000/api/v1/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  --data '{"username":"admin","password":"password"}'

# Expected output:
# HTTP/1.1 200 OK
# Set-Cookie: auth_token=...; HttpOnly; Path=/
# Set-Cookie: authToken=...; HttpOnly; Path=/
# {"user":{"id":1,"username":"admin","role":"admin"},"token":"...","accessToken":"..."}
```

### Expected Login Behavior in Browser

1. **Login Flow:**
   - Navigate to `http://localhost:3000/login`
   - Enter credentials (admin / password)
   - Click "Sign in"
   - Browser performs **full page navigation** to `/dashboard` (not client-side routing)
   - HttpOnly cookies are automatically attached by the browser

2. **Session Persistence:**
   - Reload `/dashboard` → you stay on `/dashboard` (no redirect)
   - Cookies persist until expiry (1 day) or manual logout

3. **Auto-Redirect:**
   - Visit `/login` while already logged in → automatically redirected to `/dashboard`
   - Visit `/dashboard` while not logged in → redirected to `/login?redirect=/dashboard`

4. **Cookie-Based Auth:**
   - No tokens stored in localStorage or sessionStorage
   - All auth state is in HttpOnly cookies set by backend
   - Middleware validates session by forwarding cookies to `/api/v1/auth/me`

### Troubleshooting

**Issue: "Redirect loop between /login and /dashboard"**

- Ensure backend is running on port 5000
- Check `BACKEND_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL` includes `/api/v1` prefix
- Verify cookies are being set (check browser DevTools → Application → Cookies)

**Issue: "404 on /auth/login"**

- Backend only serves `/api/v1/auth/*` routes
- Update frontend to use full `/api/v1/auth/login` path

**Issue: "CORS errors in browser console"**

- Ensure backend `CORS_ORIGINS` includes `http://localhost:3000`
- Check that requests include `Origin` header matching CORS config

**Issue: "Session not persisting after login"**

- Verify `Set-Cookie` headers appear in login response (DevTools → Network)
- Check cookies are HttpOnly, SameSite=Lax (dev) or SameSite=None (prod with HTTPS)
- Ensure `/dashboard` request includes `Cookie` header with `auth_token`

> Windows PowerShell: export ชั่วคราวด้วย `$env:NAME="value"`

```

```

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

## QA Baseline

This project enforces **production-grade quality gates** across all packages. All checks must pass before merging to `main`.

### Toolchain Requirements

- **Node.js**: `20.19.4` (pinned via `.nvmrc` and `.node-version`)
- **pnpm**: `10.20.0` (managed via Corepack)
- **TypeScript**: `5.8.3`
- **ESLint**: `9.20.0` with strict configs (jsx-a11y, tailwindcss, simple-import-sort)
- **Prettier**: `3.5.0` with import/class sorting plugins

### Quality Scripts

```bash
# Code formatting
pnpm run format        # Auto-fix all formatting issues
pnpm run format:check  # Check formatting without fixing

# Linting (zero warnings allowed in CI)
pnpm run lint          # Auto-fix linting issues
pnpm run lint:ci       # Strict mode (fails on warnings)

# Type checking
pnpm run type-check    # Run TypeScript compiler checks

# Testing
pnpm run test          # Run all test suites
pnpm run test:e2e      # Run Playwright E2E tests

# Accessibility scanning
pnpm run a11y:scan     # Run axe-core a11y audit (requires dev server running)

# Unused code detection
pnpm run unused:exports  # Find unused TypeScript exports
pnpm run unused:files    # Find unused files (via knip)
pnpm run unused:deps     # Find unused dependencies (via depcheck)

# Bundle analysis
pnpm run analyze:bundle  # Analyze Next.js bundle size

# Comprehensive validation
pnpm run check:all     # Run all checks (format, lint, type-check, build, test)
```

### Pre-Commit Hooks

**Husky** hooks automatically enforce code quality:

- **Pre-commit**: Runs `lint-staged` (ESLint, Prettier) on staged files
- **Commit-msg**: Validates commit message format (Conventional Commits)

### Validation Pipeline

Run this sequence before pushing to `main` or deploying:

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Check formatting
pnpm run format:check

# 3. Run ESLint (strict mode - zero warnings)
pnpm run lint:ci

# 4. Type-check TypeScript
pnpm run type-check

# 5. Build production bundles
pnpm run build

# 6. Run accessibility scans
# Start dashboard dev server, then:
pnpm run a11y:scan

# 7. Run test suites
pnpm run test

# 8. Check for unused code
pnpm run unused:exports > unused-exports.txt
pnpm run unused:files > unused-files.txt
pnpm run unused:deps > unused-deps.txt
```

### Environment Validation

**Dashboard** uses `@t3-oss/env-nextjs` for strict ENV validation:

- Required ENV variables are validated at build time
- TypeScript-safe ENV access via `import { env } from '@/env'`
- See `dashboard/src/env.ts` for schema definition

**Required ENVs** (see `.env.example` files for full list):

| Variable                   | Type   | Description                                         |
| -------------------------- | ------ | --------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Client | API base URL (e.g., `http://localhost:5000/api/v1`) |
| `NEXT_PUBLIC_WS_URL`       | Client | WebSocket URL (e.g., `ws://localhost:5000`)         |
| `BACKEND_API_BASE_URL`     | Server | Backend API for SSR/API routes                      |
| `NODE_ENV`                 | Both   | Environment (`development`, `production`)           |

### Backend ENVs (validated with envalid)

The backend loads `.env` using dotenv-flow and validates at startup with `envalid`. Below are the accepted variables, types, and defaults from `backend/src/env.ts`.

| Variable            | Type                                       | Default                 | Notes                                                     |
| ------------------- | ------------------------------------------ | ----------------------- | --------------------------------------------------------- |
| `NODE_ENV`          | string (`development`/`test`/`production`) | `development`           | Controls mode; affects certain defaults                   |
| `PORT`              | number (port)                              | `5000`                  | API port                                                  |
| `CORS_ORIGINS`      | string                                     | `http://localhost:3000` | Comma-separated list of allowed origins                   |
| `CORS_ORIGIN`       | string                                     | ``                      | Alternative single-origin override (optional)             |
| `JWT_SECRET`        | string                                     | `change-me`             | Set a strong secret in non-dev environments               |
| `REQUIRE_AUTH`      | boolean                                    | `false`                 | Force auth in all routes if enabled                       |
| `RATE_LIMIT_MAX`    | number                                     | `120`                   | Max requests per window                                   |
| `RATE_LIMIT_WINDOW` | string                                     | `1 minute`              | Window duration (e.g., `1 minute`, `10 minutes`)          |
| `ENABLE_WS`         | boolean                                    | `false`                 | Toggle WebSocket features                                 |
| `DEMO_REGISTER`     | boolean                                    | `true`                  | Allow demo registration endpoints in dev                  |
| `DEMO_CREDS`        | string                                     | ``                      | Optional preset demo credentials                          |
| `ADMIN_USER`        | string                                     | `admin`                 | Default admin username (dev only)                         |
| `ADMIN_PASS`        | string                                     | `admin`                 | Default admin password (dev only)                         |
| `REQUEST_ID_HEADER` | string                                     | `x-request-id`          | Incoming request id header name                           |
| `DATABASE_URL`      | string                                     | ``                      | Prisma connection string; required for DB-backed features |

Hardening recommendations:

- In production, set `JWT_SECRET`, `REQUIRE_AUTH=true`, and a secure `CORS_ORIGINS`.
- Consider enabling rate limiting (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`) and `ENABLE_WS` only when needed.
- Provide a proper `DATABASE_URL` in all non-demo environments.

### Accessibility Standards

**WCAG 2.1 Level AA compliance** is enforced via:

- **ESLint plugin**: `eslint-plugin-jsx-a11y` (30+ error-level rules)
- **Axe DevTools**: `@axe-core/cli` for automated scans
- **Playwright + Axe**: Integration tests with `@axe-core/playwright`

**A11y test coverage**:

```bash
# Run Playwright a11y tests
pnpm exec playwright test dashboard/tests/a11y.spec.ts
```

All public-facing pages must have **zero axe violations** before deployment.

### Troubleshooting

**Issue: "Corepack not found"**

```bash
# Enable Corepack (ships with Node.js 16.9+)
corepack enable
corepack prepare pnpm@10.20.0 --activate
```

**Issue: "pnpm command not found"**

```bash
# Install pnpm via Corepack
npm install -g corepack
corepack enable
corepack prepare pnpm@10.20.0 --activate
```

**Issue: "Node version mismatch"**

```bash
# Install Node 20.19.4 via nvm
nvm install 20.19.4
nvm use
```

**Issue: "ESLint errors on fresh clone"**

```bash
# Run auto-fix
pnpm run lint

# If errors persist, check:
# 1. Node version (should be 20.19.4)
# 2. pnpm version (should be 10.20.0)
# 3. Dependencies installed (pnpm install)
```

---

## Testing & Quality

- เตรียมรองรับ Unit/Integration/E2E (Jest / Playwright ได้)
- Lint/Type-check ใน CI
- เป้าหมาย coverage ≥ **90%** (เพิ่มกติกาในอนาคต)

### E2E (Playwright)

The dashboard includes Playwright tests. They start a production build in standalone mode for reliability on Windows/CI.

```powershell
# Optional: provide demo credentials to exercise login flow
$env:E2E_USER="demo"; $env:E2E_PASS="demo"

# Run all E2E tests
pnpm -C dashboard test:e2e

# Or run a single test by title
pnpm -C dashboard test:e2e -g "dashboard hydrates cleanly"
```

Notes:

- The Playwright config builds and serves the Next.js app using `.next/standalone/dashboard/server.js`.
- On Windows, file watcher warnings (hiberfil.sys, pagefile.sys) are harmless.

### Windows notes

หากเจอข้อผิดพลาดจาก Prisma แบบ EPERM/rename ระหว่างขั้นตอน pretest บน Windows (อาจเกิดจากไฟล์ถูกล็อกโดย AV/Explorer):

- ปิดหน้าต่าง Explorer หรือสแกนเนอร์ที่อาจล็อกไฟล์ใน `node_modules/.pnpm/@prisma` แล้วลองใหม่
- หรือรันตัวทดสอบโดยตรง (ข้าม pretest ชั่วคราว):

```powershell
# รันเฉพาะชุดทดสอบของ backend โดยเรียก Vitest โดยตรง
pnpm -C backend vitest run

# หรือรันตามสคริปต์ปกติเมื่อแก้ปัญหาการล็อกไฟล์แล้ว
pnpm -C backend test
```

หมายเหตุ: ใน CI และสภาพแวดล้อมส่วนใหญ่ คำสั่ง `pnpm -C backend test` จะทำงานครบ (รวม prisma generate/migrate deploy) ตามเดิม

---

## How to run (verification sequence)

Use these commands locally to fully verify the repo on a clean install:

```powershell
# Install workspace dependencies
pnpm install

# Prepare Prisma client (first time)
pnpm -F backend exec prisma generate

# Backend checks
pnpm -F backend typecheck
pnpm -F backend test

# Dashboard checks
pnpm -F dashboard type-check
pnpm -F dashboard build

# Repo-wide hygiene
pnpm -w exec prettier -w .
pnpm -w exec eslint . --fix
```

Tips:

- If you hit a Prisma EPERM on Windows, close anything locking `.pnpm/@prisma` and retry the `prisma generate` step.
- Ensure `NEXT_PUBLIC_API_URL` points to your API (default `http://localhost:5000`).

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

### API Docs (Swagger) and Rate Limiting

Both are configurable via environment flags on the backend:

- Swagger UI: enabled by default in non-production; served at `/docs` when enabled.
  - ENV: `EXPOSE_DOCS=true|false` (alias: `ENABLE_DOCS`)
- Rate limit: enabled by default in production; disabled in dev/test unless explicitly enabled.
  - ENV: `ENABLE_RATE_LIMIT=true|false` (alias: `RATE_LIMIT`)
  - ENV: `RATE_LIMIT_MAX=120` and `RATE_LIMIT_WINDOW="1 minute"` to tune.

Health endpoints (`/health`, `/api/v1/health`, `/readyz`) are exempt from rate limiting.

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

```

```
