# Multi-stage Dockerfile for Monorepo
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
COPY api/package*.json ./api/
COPY web/package*.json ./web/
COPY mobile/package*.json ./mobile/
COPY packages/*/package*.json ./packages/
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
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/web/.next ./web/.next
COPY --from=builder /app/packages/*/dist ./packages/
COPY package*.json ./
EXPOSE 3000 5000
CMD ["npm", "run", "start"]