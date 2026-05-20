# ============================================================================
# Edge SDK Dockerfile — Secure Production Build
# ============================================================================

FROM node:26-alpine

WORKDIR /app

# Ensure standard secure path
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Copy package files (lockfile required for locked version resolution)
COPY package.json package-lock.json* ./

# Configure NPM network retry settings to prevent ECONNRESET timeouts
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

# Install dependencies with locked versions + --ignore-scripts (SonarCloud docker:S4507 & S8543)
RUN npm ci --only=production --ignore-scripts && \
  addgroup -g 1001 -S nodejs && \
  adduser -S notification -u 1001

COPY tsconfig.json ./
COPY src ./src

RUN npm run build && \
  true
USER notification

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
