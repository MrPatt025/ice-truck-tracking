const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    server: 'Ice Truck Tracking API',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    database: 'Connected'
  });
});

module.exports = router;