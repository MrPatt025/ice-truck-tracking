// PostgreSQL + TimescaleDB connection pool
const { Pool } = require('pg');
const config = require('./env');
const logger = require('./logger');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.DB_SSL ? { rejectUnauthorized: false } : false,
});

let dbOfflineLogged = false;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const logDatabaseOfflineWarning = () => {
  if (dbOfflineLogged) return
  logger.warn('DATABASE OFFLINE: Please verify Docker Desktop is running')
  dbOfflineLogged = true
}

const isAggregateError = err => err instanceof AggregateError || err?.name === 'AggregateError'

const isConnectionRefused = err => {
  if (!err) return false

  if (err.code === 'ECONNREFUSED') return true

  const message = typeof err.message === 'string' ? err.message : ''
  if (message.includes('ECONNREFUSED')) return true

  if (isAggregateError(err) && Array.isArray(err.errors)) {
    return err.errors.some(innerErr => isConnectionRefused(innerErr))
  }

  return false
}

pool.on('connect', () => {
  dbOfflineLogged = false;
  logger.debug('New PostgreSQL client connected');
});
pool.on('error', err => {
  if (isConnectionRefused(err) || isAggregateError(err)) {
    logDatabaseOfflineWarning()
  } else {
    logger.error('Unexpected PostgreSQL pool error', err);
  }
});

const handleMaxRetriesReached = (fallbackValue) => {
  logDatabaseOfflineWarning()
  return fallbackValue;
};

const executeWithBackoff = async (operation, fallbackValue) => {
  let attempt = 0;
  const maxRetries = 5;
  const initialDelay = 1000;

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (err) {
      if (!isConnectionRefused(err)) {
        throw err;
      }
      attempt++;
      if (attempt >= maxRetries) {
        return handleMaxRetriesReached(fallbackValue);
      }
      await wait(initialDelay * Math.pow(2, attempt - 1));
    }
  }
};

/**
 * Execute a parameterised query ($1, $2 … style)
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await executeWithBackoff(async () => {
      const res = await pool.query(text, params);
      return res.rows;
    }, []);

    logger.debug(
      { text: text.substring(0, 80), duration: Date.now() - start, rows: result ? result.length : 0 },
      'query'
    );
    return result;
  } catch (err) {
    logger.error({ text: text.substring(0, 80), error: err.message }, 'query error');
    throw err;
  }
};

/** Get single row */
const get = async (text, params) => {
  const rows = await query(text, params);
  return rows[0] || null;
};

/** Execute inside a transaction */
const transaction = async callback => {
  let client = await executeWithBackoff(async () => {
    return await pool.connect();
  }, null);

  if (!client) {
    // Return a mock gracefully if DB is completely offline
    return callback({
      query: async () => ({ rows: [] }),
      release: () => {}
    });
  }

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    if (client.release) client.release();
  }
};

const close = async () => {
  await pool.end();
  logger.info('PostgreSQL pool closed');
};

module.exports = { pool, query, get, transaction, close };
