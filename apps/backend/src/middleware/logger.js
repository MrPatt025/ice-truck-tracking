const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';

  const logEntry = `${timestamp} - ${method} ${url} - IP: ${ip} - ${userAgent}\n`;
  
  fs.appendFile(path.join(logDir, 'access.log'), logEntry, (err) => {
    if (err) console.error('Logging error:', err);
  });

  console.log(`${timestamp} - ${method} ${url} - ${ip}`);
  next();
};

const logError = (error, req) => {
  const timestamp = new Date().toISOString();
  const errorEntry = `${timestamp} - ERROR: ${error.message}\nStack: ${error.stack}\nURL: ${req.originalUrl}\nMethod: ${req.method}\n\n`;
  
  fs.appendFile(path.join(logDir, 'error.log'), errorEntry, (err) => {
    if (err) console.error('Error logging failed:', err);
  });
};

module.exports = { logger, logError };