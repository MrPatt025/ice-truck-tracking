# ============================================================================
# Dashboard Dockerfile — Monorepo-Aware Multi-Stage Build
# Context: repository root (.)
# ============================================================================

FROM node:26-alpine AS base

# ── Dependencies stage ─────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Pin pnpm version to satisfy SonarQube docker:S8543 strict versioning
RUN npm install -g pnpm@10.32.1 --ignore-scripts

# Configure NPM network retry settings to prevent ECONNRESET timeouts
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

# Copy workspace-level dependency manifests (monorepo root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY dashboard/package.json ./dashboard/

# Install dependencies with frozen lockfile (now resolvable from root)
RUN pnpm install --frozen-lockfile --filter @ice-truck/dashboard...

# ── Builder stage ──────────────────────────────────────
FROM base AS builder
RUN npm install -g pnpm@10.32.1 --ignore-scripts
WORKDIR /app

# Copy installed node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dashboard/node_modules ./dashboard/node_modules

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy dashboard source and config files
COPY dashboard/package.json dashboard/next.config.ts dashboard/tsconfig.json ./dashboard/
COPY dashboard/postcss.config.js ./dashboard/
COPY dashboard/jest.config.js ./dashboard/
COPY dashboard/next-env.d.ts ./dashboard/
COPY dashboard/public ./dashboard/public
COPY dashboard/src ./dashboard/src

# Build the Next.js application
WORKDIR /app/dashboard
RUN pnpm run build

# ── Production runner ──────────────────────────────────
FROM base AS runner
WORKDIR /app

# Ensure standard secure path
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV NODE_ENV=production

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
