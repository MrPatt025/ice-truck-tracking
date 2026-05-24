# Multi-stage Dockerfile for Ice Truck Tracking Monorepo
# Build optimized for layer caching and minimal image size

# ── Dependencies stage ──────────────────────────────
FROM node:26-alpine AS deps
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g pnpm@11.1.3 --ignore-scripts && mkdir -p /pnpm/store

# Copy only workspace and dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/
COPY mobile-app/package.json ./mobile-app/
COPY sdk/edge/package.json ./sdk/edge/
COPY sdk/mobile/package.json ./sdk/mobile/

# Install dependencies with pnpm network resilience and retries against transient registry failures
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  sh -ec 'pnpm config set fetch-retries 5 && pnpm config set fetch-timeout 600000 && pnpm config set network-concurrency 1; for attempt in 1 2 3; do pnpm install --frozen-lockfile --ignore-scripts && exit 0; echo "pnpm install failed (attempt ${attempt}), retrying..." >&2; if [ "$attempt" -eq 3 ]; then exit 1; fi; sleep $((attempt * 5)); done'

# ── Builder stage ───────────────────────────────────
FROM node:26-alpine AS builder
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@11.1.3 --ignore-scripts && mkdir -p /pnpm/store
ENV NODE_ENV production

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace config and root-level files (essential for build)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY next.config.js eslint.config.mjs tsconfig.json commitlint.config.js lint-staged.config.js renovate.json stryker.conf.js index.js ./

# Copy workspace packages (only source files needed for build)
COPY backend/package.json ./backend/
COPY backend/index.js ./backend/
COPY backend/src ./backend/src
COPY dashboard/package.json ./dashboard/
COPY dashboard ./dashboard
COPY mobile-app/package.json ./mobile-app/
COPY mobile-app ./mobile-app
COPY sdk ./sdk
COPY src ./src

ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build all packages
RUN pnpm run build

# ── Runtime stage ──────────────────────────────────
FROM node:26-alpine AS runner
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV NODE_ENV production
ENV PORT 5000
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Copy runtime dependencies only
COPY --from=deps /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/dashboard/.next ./dashboard/.next
COPY --from=builder /app/sdk ./sdk
COPY --from=builder /app/src ./src

# Copy only essential package files (no build tools)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Expose API port
EXPOSE 5000

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const request = require('http').get('http://localhost:5000/api/v1/health', (response) => { if (response.statusCode !== 200) throw new Error(response.statusCode); }); request.on('error', error => { throw error; })"

# Start backend API
CMD ["node", "backend/index.js"]
