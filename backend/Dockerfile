# ============================================================================
# Backend Dockerfile — Multi-Stage Production Build
# ============================================================================

FROM node:26-alpine AS base

# Install security updates and dumb-init
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /usr/src/app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Configure NPM network retry settings to prevent ECONNRESET timeouts
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN npm install -g pnpm@11.1.3 --ignore-scripts && mkdir -p /pnpm/store

# Copy workspace files required for pnpm resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/
COPY mobile-app/package.json ./mobile-app/
COPY sdk/edge/package.json ./sdk/edge/
COPY sdk/mobile/package.json ./sdk/mobile/

# Development stage
FROM base AS development
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  sh -ec '\
  pnpm config set fetch-retries 5 && \
  pnpm config set fetch-timeout 600000 && \
  pnpm config set network-concurrency 1; \
  for attempt in 1 2 3; do \
    pnpm install --frozen-lockfile --ignore-scripts && exit 0; \
    echo "pnpm install failed (attempt ${attempt}), retrying..." >&2; \
    if [ "$attempt" -eq 3 ]; then exit 1; fi; \
    sleep $((attempt * 5)); \
  done'
COPY backend/index.js backend/swagger.json ./backend/
COPY backend/src ./backend/src
EXPOSE 5000
USER node
CMD ["dumb-init", "node", "backend/index.js"]

# Production dependencies stage — locked versions
# ignore-scripts required by SonarCloud docker rules
FROM base AS dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  sh -ec 'pnpm config set fetch-retries 5 && \
  pnpm config set fetch-timeout 600000 && \
  pnpm config set network-concurrency 1; \
  for attempt in 1 2 3; do pnpm install --frozen-lockfile --ignore-scripts && exit 0; \
  echo "pnpm install failed (attempt ${attempt}), retrying..." >&2; \
  if [ "$attempt" -eq 3 ]; then exit 1; fi; sleep $((attempt * 5)); done'

# Production stage
FROM node:26-alpine AS production

# Install security updates and dumb-init
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Set working directory
WORKDIR /usr/src/app

# Copy production dependencies
COPY --from=dependencies /usr/src/app/node_modules ./node_modules

# Copy application code
COPY backend/index.js backend/swagger.json ./backend/
COPY backend/src ./backend/src

# Set environment variables
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV NODE_ENV=production
ENV PORT=5000
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Expose port
EXPOSE 5000

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const request = require('http').get('http://localhost:5000/api/v1/health/livez', (response) => { process.exit(response.statusCode === 200 ? 0 : 1) }); request.on('error', () => process.exit(1))"

# Start application
CMD ["dumb-init", "node", "backend/index.js"]
