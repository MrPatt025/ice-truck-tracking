# ============================================================================
# Edge SDK Dockerfile — Secure Production Build
# ============================================================================

FROM node:26-alpine AS base

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN apk add --no-cache libc6-compat && npm install -g pnpm@11.1.3 --ignore-scripts && mkdir -p /pnpm/store

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/
COPY mobile-app/package.json ./mobile-app/
COPY sdk/edge/package.json ./sdk/edge/
COPY sdk/mobile/package.json ./sdk/mobile/

FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
COPY sdk/edge/tsconfig.json ./sdk/edge/
COPY sdk/edge/src ./sdk/edge/src

WORKDIR /app/sdk/edge
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN pnpm run build

FROM base AS runner
RUN addgroup -g 1001 -S nodejs && \
  adduser -S notification -u 1001

ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/sdk/edge/dist ./dist

WORKDIR /app/sdk/edge

USER notification

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
