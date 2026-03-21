const logger = require('../config/logger');

const errorHandler = (err, req, res, _next) => {
  // Prefer explicit application error status first.
  let statusCode = 500;
  if (Number.isInteger(err.statusCode)) {
    statusCode = err.statusCode;
  } else if (Number.isInteger(err.status)) {
    statusCode = err.status;
  }
  let message = err.message || 'Server Error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map(val => val.message)
      .join(', ');
    statusCode = 400;
  }

  if (statusCode >= 500) {
    logger.error(err);
  } else {
    logger.warn(`Client error ${statusCode} on ${req.method} ${req.originalUrl}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = errorHandler;
