const db = require('../config/database');
const logger = require('../config/logger');
const config = require('../config/env');

const healthCheck = async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error.message;
    res.status(503).json(healthcheck);
  }
};

const readinessCheck = async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Database connectivity check
    const startTime = Date.now();
    await db.query('SELECT 1');
    const dbResponseTime = Date.now() - startTime;
    
    checks.checks.database = {
      status: 'healthy',
      responseTime: `${dbResponseTime}ms`
    };

    // Memory usage check
    const memUsage = process.memoryUsage();
    checks.checks.memory = {
      status: memUsage.heapUsed < 100 * 1024 * 1024 ? 'healthy' : 'warning', // 100MB threshold
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    };

    // Overall status
    const allHealthy = Object.values(checks.checks).every(check => check.status === 'healthy');
    checks.status = allHealthy ? 'healthy' : 'degraded';

    res.status(allHealthy ? 200 : 503).json(checks);
  } catch (error) {
    logger.error('Readiness check failed:', error);
    
    checks.status = 'unhealthy';
    checks.checks.database = {
      status: 'unhealthy',
      error: error.message
    };

    res.status(503).json(checks);
  }
};

const livenessCheck = async (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck
};