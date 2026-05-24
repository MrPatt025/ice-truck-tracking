# ============================================================================
# Dashboard Dockerfile — Monorepo-Aware Multi-Stage Build
# Context: repository root (.)
# ============================================================================

FROM node:26-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g pnpm@11.1.3 --ignore-scripts && mkdir -p /pnpm/store

# ── Dependencies stage ─────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Configure NPM network retry settings to prevent ECONNRESET timeouts
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

# Copy workspace-level dependency manifests (monorepo root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY dashboard/package.json ./dashboard/

# Install the full workspace with a cache-mounted pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# ── Builder stage ──────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy installed node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy dashboard source and config files
COPY dashboard/package.json dashboard/next.config.ts dashboard/tsconfig.json ./dashboard/
COPY dashboard/postcss.config.js ./dashboard/
COPY dashboard/jest.config.js ./dashboard/
COPY dashboard/next-env.d.ts ./dashboard/
COPY dashboard/public ./dashboard/public
COPY dashboard/src ./dashboard/src

WORKDIR /app/dashboard
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the Next.js application using the locked workspace dependencies.
RUN pnpm run build

# ── Production runner ──────────────────────────────────
FROM base AS runner
WORKDIR /app

# Ensure standard secure path
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/dashboard/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next \
  && chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/dashboard/.next/standalone ./
COPY --from=builder /app/dashboard/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
