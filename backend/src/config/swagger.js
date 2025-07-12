const config = require('./env');

// Simple swagger mock for now
const specs = {
  openapi: '3.0.0',
  info: {
    title: 'Ice Truck Tracking API',
    version: '1.0.0',
    description: 'Professional Ice Truck Tracking System API',
  },
};

const swaggerUi = {
  serve: (req, res, next) => next(),
  setup: (specs, options) => (req, res) => {
    res.json({
      message: 'API Documentation',
      swagger: 'Available at /api-docs',
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth/login',
      },
    });
  },
};

module.exports = {
  specs,
  swaggerUi,
};
