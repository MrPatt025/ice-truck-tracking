const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const trucksActiveTotal = new promClient.Gauge({
  name: 'trucks_active_total',
  help: 'Number of active trucks'
});

const dbConnectionsActive = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections'
});

const dbConnectionsIdle = new promClient.Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections'
});

const truckOfflineTotal = new promClient.Counter({
  name: 'truck_offline_total',
  help: 'Total number of trucks that went offline',
  labelNames: ['truck_id']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(trucksActiveTotal);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbConnectionsIdle);
register.registerMetric(truckOfflineTotal);

// Middleware to collect HTTP metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Function to update truck metrics
const updateTruckMetrics = (activeTrucks) => {
  trucksActiveTotal.set(activeTrucks);
};

// Function to update database metrics
const updateDbMetrics = (active, idle) => {
  dbConnectionsActive.set(active);
  dbConnectionsIdle.set(idle);
};

// Function to record truck offline event
const recordTruckOffline = (truckId) => {
  truckOfflineTotal.labels(truckId).inc();
};

// Metrics endpoint
const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error.message);
  }
};

module.exports = {
  metricsMiddleware,
  metricsHandler,
  updateTruckMetrics,
  updateDbMetrics,
  recordTruckOffline,
  register
};