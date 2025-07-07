const pino = require('pino');
const config = require('./env');

const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  } : undefined
});

module.exports = logger;