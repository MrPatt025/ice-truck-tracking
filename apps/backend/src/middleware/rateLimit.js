const config = require('../config/env');

// Simple rate limiter without express-rate-limit
const createLimiter = (maxRequests, windowMs) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    if (requests.has(ip)) {
      const userRequests = requests.get(ip).filter(time => time > windowStart);
      requests.set(ip, userRequests);
    } else {
      requests.set(ip, []);
    }
    
    const userRequests = requests.get(ip);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000 / 60) + ' minutes'
      });
    }
    
    userRequests.push(now);
    next();
  };
};

const generalLimiter = createLimiter(50, config.RATE_LIMIT_WINDOW_MS);
const authLimiter = createLimiter(config.RATE_LIMIT_MAX_REQUESTS, config.RATE_LIMIT_WINDOW_MS);

module.exports = {
  generalLimiter,
  authLimiter
};