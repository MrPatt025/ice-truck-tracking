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

pool.on('connect', () => logger.debug('New PostgreSQL client connected'));
pool.on('error', (err) => logger.error('Unexpected PostgreSQL pool error', err));

/**
 * Execute a parameterised query ($1, $2 … style)
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    logger.debug({ text: text.substring(0, 80), duration: Date.now() - start, rows: result.rowCount }, 'query');
    return result.rows;
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
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const close = async () => {
  await pool.end();
  logger.info('PostgreSQL pool closed');
};

module.exports = { pool, query, get, transaction, close };
