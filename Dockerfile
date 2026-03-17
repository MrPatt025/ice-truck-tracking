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
COPY . .
RUN pnpm run build

FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/dashboard/.next ./dashboard/.next
COPY --from=builder /app/sdk/edge/dist ./sdk/edge/dist
COPY --from=builder /app/sdk/mobile/dist ./sdk/mobile/dist
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
EXPOSE 3000 5000
CMD ["node", "backend/index.js"]
