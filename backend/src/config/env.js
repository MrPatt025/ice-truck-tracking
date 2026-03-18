const dotenv = require('dotenv');
const path = require('node:path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number.parseInt(process.env.PORT) || 5000,

  // ── PostgreSQL + TimescaleDB ─────────────────────────────
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ice_tracking',
  DB_POOL_MAX: Number.parseInt(process.env.DB_POOL_MAX) || 20,

  // ── Redis ────────────────────────────────────────────────
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // ── MQTT (Eclipse Mosquitto) ─────────────────────────────
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  MQTT_USERNAME: process.env.MQTT_USERNAME || '',
  MQTT_PASSWORD: process.env.MQTT_PASSWORD || '',

  // ── Security ─────────────────────────────────────────────
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  SALT_ROUNDS: Number.parseInt(process.env.SALT_ROUNDS) || 12,

  // ── CORS ─────────────────────────────────────────────────
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // ── Rate Limiting ────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // ── Logging ──────────────────────────────────────────────
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'json',

  // ── Health Check ─────────────────────────────────────────
  HEALTH_CHECK_TIMEOUT: Number.parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,

  // ── Flags ────────────────────────────────────────────────
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
