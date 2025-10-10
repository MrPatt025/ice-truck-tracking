const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

// Import configurations
const config = require('./src/config/env');
const logger = require('./src/config/logger');
const { PORT, NODE_ENV, CLIENT_URL } = config;

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
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss:;"
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      CLIENT_URL,
      'http://localhost:3000',
      'https://ice-truck-tracking.com',
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
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
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
    websocket_clients: websocketService.getConnectedClientsCount(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ðŸššâ„ï¸ Ice Truck Tracking API',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      health: '/api/v1/health',
    },
  });
});

// ---- DEV mock data for frontend ----
if (process.env.USE_FAKE_DB === 'true') {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  let mem = {
    trucks: [
      { id: 'truck-001', latitude: 13.7563, longitude: 100.5018, driver_name: 'Somchai', speed: 32, temp: -8, updatedAt: new Date().toISOString() },
      { id: 'truck-002', latitude: 13.75, longitude: 100.49, driver_name: 'Suda', speed: 28, temp: -12, updatedAt: new Date().toISOString() },
      { id: 'truck-003', latitude: 13.762, longitude: 100.515, driver_name: 'Anan', speed: 40, temp: -6, updatedAt: new Date().toISOString() },
    ],
    alerts: [
      { id: String(Date.now()), level: 'info', message: 'System boot', ts: new Date().toISOString() }
    ]
  };

  // simple simulation
  setInterval(() => {
    mem.trucks = mem.trucks.map(t => ({
      ...t,
      latitude: t.latitude + (Math.random() - 0.5) * 0.002,
      longitude: t.longitude + (Math.random() - 0.5) * 0.002,
      speed: clamp((t.speed ?? 30) + (Math.random() - 0.5) * 5, 0, 70),
      temp: clamp((t.temp ?? -8) + (Math.random() - 0.5) * 0.5, -20, 5),
      updatedAt: new Date().toISOString(),
    }));

    // สุ่ม alert บ้าง
    if (Math.random() < 0.2) {
      mem.alerts.unshift({
        id: String(Date.now()),
        level: ['info', 'warn', 'critical'][Math.floor(Math.random() * 3)],
        message: `Ping from ${mem.trucks[Math.floor(Math.random() * mem.trucks.length)].id}`,
        ts: new Date().toISOString()
      });
      mem.alerts = mem.alerts.slice(0, 50);
    }

    // ถ้ามี WebSocket service อยู่แล้วก็ส่ง event แบบหลวม ๆ
    try {
      if (global.wss?.clients) {
        const pkt = { type: 'trucks', trucks: mem.trucks, alerts: mem.alerts };
        for (const c of global.wss.clients) c.send(JSON.stringify(pkt));
      }
    } catch { }
  }, 2000).unref?.();

  app.get('/api/v1/trucks', (req, res) => res.json(mem.trucks));
  app.get('/api/v1/alerts', (req, res) => res.json(mem.alerts));
  // Quick test endpoint to inject an alert into the mock alerts list and broadcast to WS clients
  app.post('/api/v1/alerts/test', (req, res) => {
    const a = {
      id: String(Date.now()),
      level: req.query.level || 'warn',
      message: req.query.msg || 'Test alert',
      ts: new Date().toISOString()
    };
    mem.alerts.unshift(a);
    mem.alerts = mem.alerts.slice(0, 50);
    try {
      if (global.wss?.clients) {
        for (const c of global.wss.clients) c.send(JSON.stringify({ type: 'alert', payload: a }));
      }
    } catch { }
    res.json(a);
  });

  // Clear all mock alerts
  app.post('/api/v1/alerts/clear', (req, res) => {
    mem.alerts = [];
    try {
      if (global.wss?.clients) {
        for (const c of global.wss.clients) c.send(JSON.stringify({ type: 'alerts', payload: mem.alerts }));
      }
    } catch { }
    res.json({ ok: true });
  });

  // Seed test trucks for map testing
  app.post('/api/v1/trucks/test', (req, res) => {
    const n = Number(req.query.count || 5);
    mem.trucks = Array.from({ length: n }, (_, i) => ({
      id: `truck-${String(i + 1).padStart(3, '0')}`,
      latitude: 13.7563 + (Math.random() - 0.5) * 0.02,
      longitude: 100.5018 + (Math.random() - 0.5) * 0.02,
      driver_name: `Driver ${i + 1}`,
      speed: Math.round(Math.random() * 60),
      temp: -10 + Math.random() * 5,
      updatedAt: new Date().toISOString(),
    }));
    try {
      if (global.wss?.clients) {
        for (const c of global.wss.clients) c.send(JSON.stringify({ type: 'trucks', payload: mem.trucks }));
      }
    } catch { }
    res.json(mem.trucks);
  });
}
// ---- /DEV mock data ----

// If running in development, allow a very permissive CORS temporarily so frontend dev isn't blocked.
if (process.env.NODE_ENV === 'development') {
  app.use(require('cors')({ origin: true, credentials: true }));
}

// Return 204 for favicon requests to avoid noisy errors
app.get('/favicon.ico', (_req, res) => res.status(204).end());

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
const server = http.createServer(app);

// Initialize WebSocket
websocketService.initialize(server);
websocketService.startSimulation();

server.listen(PORT, () => {
  logger.info(`ðŸš€ Server running on port ${PORT} in ${NODE_ENV} mode`);
  logger.info(`ðŸ¥ Health Check: http://localhost:${PORT}/api/v1/health`);
  logger.info(`ðŸ“Š Metrics: http://localhost:${PORT}/metrics`);
  logger.info(`ðŸ”Œ WebSocket enabled for real-time updates`);
});

module.exports = { app, server };


