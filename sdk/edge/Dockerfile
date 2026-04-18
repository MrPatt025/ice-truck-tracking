FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY --chown=node:node package.json ./

# Configure NPM network retry settings to prevent ECONNRESET timeouts
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

# Install dependencies, copy source, build, create user and set permissions
RUN npm ci --only=production --ignore-scripts && \
  addgroup -g 1001 -S nodejs && \
  adduser -S notification -u 1001

COPY --chown=notification:nodejs tsconfig.json ./
COPY --chown=notification:nodejs src ./src

RUN npm run build && \
  true
USER notification

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
