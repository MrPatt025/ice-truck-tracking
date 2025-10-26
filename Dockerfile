# syntax=docker/dockerfile:1.6

########################
# Base + PNPM
########################
FROM node:22-alpine AS base
RUN apk add --no-cache tini curl libc6-compat
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

WORKDIR /repo

########################
# ---- Back-end build ----
########################
FROM base AS backend-deps
# คัดเฉพาะไฟล์ที่มีผลต่อ dependency graph เพื่อ cache ดีขึ้น
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/
# เตรียม store (cache-friendly) แล้วติดตั้ง
RUN pnpm -w fetch && pnpm -w install --frozen-lockfile

FROM backend-deps AS backend-build
# คัดโค้ด backend + tsconfig/ไฟล์แชร์ที่จำเป็น
COPY tsconfig.json ./
COPY backend ./backend
# สร้างไฟล์ production
RUN pnpm -C backend build

########################
# ---- Back-end runtime ----
########################
FROM node:22-alpine AS backend
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app
# คัดเฉพาะสิ่งที่ต้องใช้รันจริง
COPY --from=backend-build /repo/backend/dist ./dist
COPY /repo/backend/package.json ./package.json
COPY /repo/pnpm-lock.yaml ./pnpm-lock.yaml

# ติดตั้งเฉพาะ production deps (ignore scripts เพื่อความปลอดภัย/เร็ว)
RUN corepack enable \
    && pnpm fetch --prod \
    && pnpm install --prod --frozen-lockfile --ignore-scripts

USER node
EXPOSE 5000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","dist/index.js"]

########################
# ---- Dashboard build ----
########################
FROM base AS dashboard-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY dashboard/package.json dashboard/
RUN pnpm -w fetch && pnpm -w install --frozen-lockfile

FROM dashboard-deps AS dashboard-build
# แนะนำให้ตั้งค่า output: 'standalone' ใน next.config.js
# เพื่อได้ .next/standalone ที่ self-contained
COPY next.config.js turbo.json tsconfig.json ./
COPY dashboard ./dashboard
RUN pnpm -C dashboard build

########################
# ---- Dashboard runtime ----
########################
FROM node:22-alpine AS dashboard
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ถ้าใช้ output: 'standalone' (แนะนำ)
# จะได้ไฟล์ server + node_modules ที่ minimal อยู่ใน .next/standalone
COPY --from=dashboard-build /repo/dashboard/.next/standalone ./ 
COPY --from=dashboard-build /repo/dashboard/.next/static ./dashboard/.next/static
COPY --from=dashboard-build /repo/dashboard/public ./dashboard/public

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
# server.js มาจาก .next/standalone (Next.js standalone)
CMD ["node","server.js"]
