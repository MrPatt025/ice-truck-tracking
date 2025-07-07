const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter
};