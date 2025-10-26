'use strict';

const config = require('../config/env');
const logger = require('../config/logger');

/** Operational error wrapper */
class AppError extends Error {
  constructor(message, statusCode = 500, meta) {
    super(message || 'internal_error');
    this.name = 'AppError';
    this.statusCode = Number(statusCode) || 500;
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    if (meta && typeof meta === 'object') this.meta = meta;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** Mappers -> AppError */
const fromPrisma = (err) => {
  const code = err && err.code;
  if (code === 'P2002') {
    const fields = Array.isArray(err.meta?.target)
      ? err.meta.target.join(',')
      : err.meta?.target || 'unique';
    return new AppError(`Duplicate value for unique field(s): ${fields}`, 409, {
      code,
    });
  }
  if (code === 'P2025')
    return new AppError('Resource not found', 404, { code });
  return null;
};

const fromFastify = (err) => {
  if (err?.code === 'FST_ERR_CTP_INVALID_JSON')
    return new AppError('Invalid JSON body', 400);
  if (err?.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE')
    return new AppError('Unsupported media type', 415);
  if (err?.validation)
    return new AppError('Invalid request data', 400, {
      validation: err.validation,
    });
  return null;
};

const fromJWT = (err) => {
  if (err?.name === 'JsonWebTokenError')
    return new AppError('Invalid token', 401);
  if (err?.name === 'TokenExpiredError')
    return new AppError('Token expired', 401);
  return null;
};

const fromMongoose = (err) => {
  if (err?.name === 'CastError')
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  if (err?.name === 'ValidationError') {
    const errors = Object.values(err.errors || {})
      .map((e) => e.message)
      .filter(Boolean);
    return new AppError(`Invalid input data. ${errors.join('. ')}`.trim(), 400);
  }
  if (err?.code === 11000) return new AppError('Duplicate field value', 400);
  return null;
};

const toOperationalError = (err) =>
  err instanceof AppError
    ? err
    : fromPrisma(err) ||
      fromFastify(err) ||
      fromJWT(err) ||
      fromMongoose(err) ||
      null;

/** Reply type detector (Fastify vs Express) */
const isFastifyReply = (obj) =>
  !!obj && typeof obj.code === 'function' && typeof obj.send === 'function';

/** Responders */
const sendDev = (err, replyLike) => {
  const body = {
    status: err.status,
    message: err.message,
    stack: err.stack,
    ...(err.meta ? { meta: err.meta } : {}),
  };
  if (isFastifyReply(replyLike)) replyLike.code(err.statusCode).send(body);
  else replyLike.status(err.statusCode).json(body);
};

const sendProd = (err, replyLike) => {
  if (err.isOperational) {
    const body = { status: err.status, message: err.message };
    if (isFastifyReply(replyLike)) replyLike.code(err.statusCode).send(body);
    else replyLike.status(err.statusCode).json(body);
    return;
  }
  logger.error({ err }, 'unhandled error');
  const body = { status: 'error', message: 'Something went wrong' };
  if (isFastifyReply(replyLike)) replyLike.code(500).send(body);
  else replyLike.status(500).json(body);
};

/** Unified handler (Fastify + Express) */
function unifiedErrorHandler(err, req, replyOrRes, _next) {
  const mapped =
    toOperationalError(err) ||
    new AppError(
      err?.message || 'internal_error',
      typeof err?.statusCode === 'number' ? err.statusCode : 500,
    );

  if (config?.isDevelopment) sendDev(mapped, replyOrRes);
  else sendProd(mapped, replyOrRes);
}

/** Fastify adapter: app.setErrorHandler(unifiedErrorHandler) */
function fastifyErrorHandler(err, req, reply) {
  unifiedErrorHandler(err, req, reply);
}

/** Express adapter (kept for compatibility) */
function expressErrorHandler(err, req, res, _next) {
  unifiedErrorHandler(err, req, res);
}

module.exports = expressErrorHandler; // default CommonJS export (Express-style)
module.exports.fastify = fastifyErrorHandler; // Fastify-style handler
module.exports.AppError = AppError;
module.exports.toOperationalError = toOperationalError;
