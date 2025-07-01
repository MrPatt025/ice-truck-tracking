const config = require('./env');

// Simple console logger for now
const logger = {
  info: (msg, extra) => {
    const timestamp = new Date().toISOString();
    if (typeof msg === 'object') {
      console.log(`[${timestamp}] INFO:`, JSON.stringify(msg), extra || '');
    } else {
      console.log(`[${timestamp}] INFO: ${msg}`, extra || '');
    }
  },
  error: (msg, extra) => {
    const timestamp = new Date().toISOString();
    if (typeof msg === 'object') {
      console.error(`[${timestamp}] ERROR:`, JSON.stringify(msg), extra || '');
    } else {
      console.error(`[${timestamp}] ERROR: ${msg}`, extra || '');
    }
  },
  warn: (msg, extra) => {
    const timestamp = new Date().toISOString();
    if (typeof msg === 'object') {
      console.warn(`[${timestamp}] WARN:`, JSON.stringify(msg), extra || '');
    } else {
      console.warn(`[${timestamp}] WARN: ${msg}`, extra || '');
    }
  }
};

module.exports = logger;