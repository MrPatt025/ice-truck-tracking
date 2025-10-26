'use strict';

/**
 * Fastify-compatible global error handler (CommonJS).
 * จัดหมวดหมู่ Prisma, JSON parse, Fastify validation, และ HTTP errors ให้สถานะเหมาะสม
 * ใช้กับ fastify โดย: app.setErrorHandler(require('./middleware/errorHandler'))
 *
 * @param {import('fastify').FastifyError & { code?: string, meta?: any }} err
 * @param {import('fastify').FastifyRequest} req
 * @param {import('fastify').FastifyReply} reply
 */
function errorHandler(err, req, reply) {
  // ค่าเริ่มต้น
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'internal_error';

  // ถ้ามี statusCode จากต้นทาง ให้เริ่มจากค่านั้นก่อน
  if (
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
  ) {
    statusCode = err.statusCode;
    message = err.message || message;
  }

  // Fastify validation (AJV)
  if (err.validation || err.code === 'FST_ERR_VALIDATION') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'validation_failed';
  }

  // Content-type parser / JSON body errors
  if (err.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
    statusCode = 415;
    code = 'UNSUPPORTED_MEDIA_TYPE';
    message = 'unsupported_media_type';
  } else if (err.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'payload_too_large';
  } else if (
    err.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
    (err.name === 'SyntaxError' && /JSON/i.test(err.message || ''))
  ) {
    statusCode = 400;
    code = 'BAD_JSON';
    message = 'invalid_json';
  }

  // Zod validation
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'validation_failed';
  }

  // Prisma known request errors
  if (typeof err.code === 'string' && /^P\d{4}$/.test(err.code)) {
    switch (err.code) {
      case 'P2002': // Unique constraint failed
        statusCode = 409;
        code = 'UNIQUE_CONSTRAINT';
        message = 'unique_constraint_violation';
        break;
      case 'P2025': // Record not found
      case 'P2001': // Record not found (older)
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'resource_not_found';
        break;
      case 'P2003': // FK constraint
        statusCode = 409;
        code = 'FK_CONSTRAINT';
        message = 'foreign_key_constraint_failed';
        break;
      case 'P2000': // Value too long
      case 'P2005': // Invalid value
      case 'P2006': // Invalid value type
        statusCode = 400;
        code = 'INVALID_VALUE';
        message = 'invalid_value';
        break;
      default:
        statusCode = statusCode === 500 ? 500 : statusCode;
        code = 'PRISMA_ERROR';
        message = 'database_error';
        break;
    }
  }

  // สร้าง payload แบบคงที่ ปลอดภัยต่อการเผยแพร่
  const payload = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  // แนบรายละเอียดเท่าที่ไม่เสี่ยงข้อมูล
  if (err.validation) payload.error.details = err.validation;
  if (code === 'UNIQUE_CONSTRAINT' && err.meta && err.meta.target)
    payload.error.target = err.meta.target;

  // log แบบมีโครงสร้าง
  req.log.error({ err }, 'unhandled error');

  reply.code(statusCode).type('application/json').send(payload);
}

module.exports = errorHandler;
