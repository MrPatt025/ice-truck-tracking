const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

// Import configurations
const config = require('./src/config/env');
const logger = require('./src/config/logger');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');
const { metricsMiddleware, metricsHandler } = require('./src/middleware/metrics');

// Import services
const websocketService = require('./src/services/websocketService');

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Enhanced security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss:;");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      config.CLIENT_URL,
      'http://localhost:3000',
      'https://ice-truck-tracking.com'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Rate limiting
app.use(generalLimiter);

// Metrics middleware
app.use(metricsMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    websocket_clients: websocketService.getConnectedClientsCount()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚚❄️ Ice Truck Tracking API',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      health: '/api/v1/health'
    }
  });
});

// Handle undefined routes
app.all('*', (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 'fail';
  err.statusCode = 404;
  next(err);
});

// Global error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
const PORT = config.PORT;
const server = http.createServer(app);

// Initialize WebSocket
websocketService.initialize(server);
websocketService.startSimulation();

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.NODE_ENV} mode`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/api/v1/health`);
  logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
  logger.info(`🔌 WebSocket enabled for real-time updates`);
});

module.exports = { app, server };
