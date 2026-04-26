# Multi-stage build for production
FROM node:24-alpine AS base

# Install security updates and dumb-init
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json ./

# Configure NPM network retry settings to prevent ECONNRESET timeouts
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

# Development stage
FROM base AS development
RUN npm install --ignore-scripts
COPY index.js swagger.json ./
COPY src ./src
EXPOSE 5000
USER node
CMD ["dumb-init", "npm", "run", "dev"]

# Production dependencies stage
FROM base AS dependencies
RUN npm install --omit=dev --ignore-scripts

# Production stage
FROM node:24-alpine AS production

# Install security updates and dumb-init
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

# Set working directory
WORKDIR /usr/src/app

# Copy production dependencies
COPY --from=dependencies /usr/src/app/node_modules ./node_modules

# Copy application code
COPY index.js swagger.json ./
COPY src ./src

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
