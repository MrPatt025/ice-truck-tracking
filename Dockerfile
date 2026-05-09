# Multi-stage Dockerfile for Ice Truck Tracking Monorepo
# Build optimized for layer caching and minimal image size

# ── Dependencies stage ──────────────────────────────
FROM node:24-alpine AS deps
RUN npm install -g pnpm@10.32.1 --ignore-scripts
WORKDIR /app

# Copy only workspace and dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/
COPY mobile-app/package.json ./mobile-app/
COPY sdk/edge/package.json ./sdk/edge/
COPY sdk/mobile/package.json ./sdk/mobile/

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm store prune

# ── Builder stage ───────────────────────────────────
FROM node:24-alpine AS builder
RUN npm install -g pnpm@10.32.1 --ignore-scripts
WORKDIR /app
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

# Build all packages
RUN pnpm run build

# ── Runtime stage ──────────────────────────────────
FROM node:24-alpine AS runner
RUN npm install -g pnpm@10.32.1 --ignore-scripts
WORKDIR /app
ENV NODE_ENV production
ENV PORT 5000

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
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode); })"

# Start backend API
CMD ["node", "backend/index.js"]
