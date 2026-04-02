FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies, copy source, build, create user and set permissions
RUN npm ci --only=production && \
  true

COPY tsconfig.json ./
COPY src ./src

RUN npm run build && \
    addgroup -g 1001 -S nodejs && \
    adduser -S notification -u 1001 && \
    chown -R notification:nodejs /app
USER notification

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
