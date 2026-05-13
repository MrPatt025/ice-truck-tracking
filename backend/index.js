const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('node:http');

// Import configurations
const config = require('./src/config/env');
const logger = require('./src/config/logger');
const { PORT, NODE_ENV, CLIENT_URL } = config;

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');
const { metricsMiddleware, metricsHandler } = require('./src/middleware/metrics');

// Enterprise middleware
const {
  helmetMiddleware,
  requestId: requestIdMiddleware,
  securityHeaders,
} = require('./src/middleware/security');

// Load observability metrics (registers on shared prom-client registry)
require('./src/middleware/observability');
const { auditMiddleware } = require('./src/middleware/audit');
const { sanitize } = require('./src/middleware/zodValidation');

// Import services
const websocketService = require('./src/services/websocketService');

// Import IoT / caching services
let mqttService, telemetryIngestion, redisClient;
try {
  mqttService = require('./src/services/mqttService');
  telemetryIngestion = require('./src/services/telemetryIngestion');
  redisClient = require('./src/config/redis');
} catch (err) {
  // Services are optional during tests or when infra is unavailable
  logger.warn('Optional services not loaded: ' + err.message);
}

// Import API routes
const apiV1Routes = require('./src/routes/v1');

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// ─── Security middleware stack ───
app.use(requestIdMiddleware); // X-Request-Id on every response
app.use(helmetMiddleware); // CSP, HSTS, X-Frame-Options, etc.
app.use(securityHeaders); // Permissions-Policy, Referrer-Policy

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [CLIENT_URL, 'http://localhost:3000', 'https://ice-truck-tracking.com'];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Cookie parser (required for CSRF tokens)
app.use(cookieParser());

// Rate limiting
app.use(generalLimiter);

// Metrics middleware
app.use(metricsMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input sanitization — strip HTML tags from all string fields
app.use(sanitize);

// Audit trail — attaches req.audit() helper
app.use(auditMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Mount API v1 routes (after mock data block so mock routes take precedence in dev)
// SEE BELOW: mock data block is registered first when USE_FAKE_DB=true

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Ice Truck Tracking API',
    version: '2.0.0',
    status: 'healthy',
    endpoints: {
      health: '/api/v1/health',
    },
  });
});

// Mount API v1 routes (after mock data so mock endpoints take precedence in dev)
app.use('/api/v1', apiV1Routes);

// If running in development, allow a very permissive CORS temporarily so frontend dev isn't blocked.
if (process.env.NODE_ENV === 'development') {
  app.use(require('cors')({ origin: true, credentials: true }));
}

// Return 204 for favicon requests to avoid noisy errors
app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.use((req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 'fail';
  err.statusCode = 404;
  next(err);
});

// Global error handling middleware
app.use(errorHandler);

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  try {
    if (mqttService) await mqttService.close();
    if (redisClient) await redisClient.close();
  } catch (err) {
    logger.error('Cleanup error: ' + err.message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const server = http.createServer(app);
let isServerStarted = false;

// Initialize WebSocket
websocketService.initialize(server);

// Only start simulation in development/test modes
if (NODE_ENV !== 'production') {
  websocketService.startSimulation();
}

async function onServerStarted() {
  logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  logger.info(`Health Check: http://localhost:${PORT}/api/v1/health`);
  logger.info(`Metrics: http://localhost:${PORT}/metrics`);
  logger.info('WebSocket enabled for real-time updates');

  // Connect Kafka Event Bus, Telemetry Worker, and MQTT
  if (mqttService && telemetryIngestion) {
    try {
      const { eventBus } = require('./src/services/eventBus');
      const { startTelemetryWorker } = require('./src/workers/telemetryWorker');

      await eventBus.connect();
      await startTelemetryWorker();

      await mqttService.connect();
      telemetryIngestion.registerHandlers(mqttService);

      logger.info('Kafka and MQTT connected — telemetry ingestion active');
    } catch (err) {
      logger.error('Telemetry pipeline initialization failed: ' + err.message);
    }
  }

  // Verify Redis connectivity
  if (redisClient) {
    try {
      const client = redisClient.getClient();
      if (client) {
        await client.ping();
        logger.info('Redis connected');
      }
    } catch (err) {
      logger.warn('Redis not available — caching disabled: ' + err.message);
    }
  }
}

function startServer() {
  if (isServerStarted) return;
  isServerStarted = true;
  server.listen(PORT, () => {
    void onServerStarted();
  });
}

if (!process.env.JEST_WORKER_ID) {
  startServer();
}

module.exports = { app, server, startServer };
