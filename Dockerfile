# Multi-stage Dockerfile for Monorepo
FROM node:25-alpine AS deps
RUN npm install -g pnpm@10.30.3
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/
COPY mobile-app/package.json ./mobile-app/
COPY sdk/edge/package.json ./sdk/edge/
COPY sdk/mobile/package.json ./sdk/mobile/
RUN pnpm install --frozen-lockfile --prod

FROM node:25-alpine AS builder
RUN npm install -g pnpm@10.30.3
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY next.config.js next.config.ts eslint.config.mjs tsconfig.json commitlint.config.js lint-staged.config.js renovate.json stryker.conf.js index.js ./
COPY backend/package.json ./backend/
COPY backend/index.js ./backend/
COPY backend/swagger.json ./backend/
COPY backend/src ./backend/src
COPY dashboard ./dashboard
COPY sdk/edge ./sdk/edge
COPY sdk/mobile ./sdk/mobile
COPY src ./src
RUN pnpm run build

FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/backend ./backend
COPY --from=builder --chown=node:node /app/dashboard/.next ./dashboard/.next
COPY --from=builder --chown=node:node /app/sdk/edge/dist ./sdk/edge/dist
COPY --from=builder --chown=node:node /app/sdk/mobile/dist ./sdk/mobile/dist
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
USER node
EXPOSE 3000 5000
CMD ["node", "backend/index.js"]
