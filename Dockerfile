# Multi-stage Dockerfile for Monorepo
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
COPY backend/package*.json ./backend/
COPY dashboard/package*.json ./dashboard/
COPY mobile-app/package*.json ./mobile-app/
COPY sdk/edge/package*.json ./sdk/edge/
COPY sdk/mobile/package*.json ./sdk/mobile/
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/dashboard/.next ./dashboard/.next
COPY --from=builder /app/mobile-app/dist ./mobile-app/dist
COPY --from=builder /app/sdk/edge/dist ./sdk/edge/dist
COPY --from=builder /app/sdk/mobile/dist ./sdk/mobile/dist
COPY package*.json ./
EXPOSE 3000 5000
CMD ["npm", "run", "start"]
