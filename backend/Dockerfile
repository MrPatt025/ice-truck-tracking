# Multi-stage build for production
FROM node:25-alpine AS base

# Install security updates and dumb-init
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY --chown=node:node package.json ./

# Development stage
FROM base AS development
RUN npm install
COPY --chown=node:node index.js swagger.json ./
COPY --chown=node:node src ./src
EXPOSE 5000
USER node
CMD ["dumb-init", "npm", "run", "dev"]

# Production dependencies stage
FROM base AS dependencies
RUN npm install --omit=dev

# Production stage
FROM node:25-alpine AS production

# Install security updates and dumb-init
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

# Set working directory
WORKDIR /usr/src/app

# Copy production dependencies
COPY --from=dependencies --chown=node:node /usr/src/app/node_modules ./node_modules

# Copy application code
COPY --chown=node:node index.js swagger.json ./
COPY --chown=node:node src ./src

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health/livez', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application
CMD ["dumb-init", "node", "index.js"]
