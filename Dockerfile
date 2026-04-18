# Multi-stage Dockerfile for Monorepo
FROM node:25-alpine AS deps
RUN npm install -g pnpm@10.30.3 --ignore-scripts
WORKDIR /app
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node turbo.json ./
COPY --chown=node:node backend/package.json ./backend/
COPY --chown=node:node dashboard/package.json ./dashboard/
COPY --chown=node:node mobile-app/package.json ./mobile-app/
COPY --chown=node:node sdk/edge/package.json ./sdk/edge/
COPY --chown=node:node sdk/mobile/package.json ./sdk/mobile/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:25-alpine AS builder
RUN npm install -g pnpm@10.30.3 --ignore-scripts
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY --chown=node:node next.config.js next.config.ts eslint.config.mjs tsconfig.json commitlint.config.js lint-staged.config.js renovate.json stryker.conf.js index.js ./
COPY --chown=node:node backend/package.json ./backend/
COPY --chown=node:node backend/index.js ./backend/
COPY --chown=node:node backend/swagger.json ./backend/
COPY --chown=node:node backend/src ./backend/src
COPY --chown=node:node dashboard ./dashboard
COPY --chown=node:node sdk/edge ./sdk/edge
COPY --chown=node:node sdk/mobile ./sdk/mobile
COPY --chown=node:node src ./src
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
