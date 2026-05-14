/**
 * Testcontainers — Real PostgreSQL Integration Tests
 * ────────────────────────────────────────────────────
 * Spins up a real PostgreSQL container (via testcontainers-node)
 * and runs queries against it. Validates:
 *   • Schema migration applies cleanly
 *   • CRUD operations on core tables (users, trucks, drivers, shops)
 *   • Parameterised queries ($1, $2...) work correctly
 *   • Transaction commit / rollback semantics
 *
 * Requires Docker to be running.
 * Run: npx jest tests/integration/database.testcontainers.test.js --testTimeout=60000
 */

const { GenericContainer, Wait } = require('testcontainers');
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { exec } = require('node:child_process');
const { promisify } = require('node:util');

const execAsync = promisify(exec);

// ─── Container + Pool Setup ────────────────────────────────────

let container;
let pool;

/**
 * Check if Docker daemon is running.
 * Uses `docker ps` command to validate daemon availability.
 * Returns true if Docker is available, false otherwise.
 */
async function isDockerAvailable() {
  try {
    await execAsync('docker ps');
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait until the pool can actually execute a query (PostgreSQL fully ready).
 * Retries SELECT 1 every 500 ms for up to `maxAttempts` attempts.
 */
async function waitForPostgres(pg, maxAttempts = 20) {
  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await pg.query('SELECT 1');
      return; // connected
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error(`PostgreSQL did not become ready after ${maxAttempts * 500} ms`, {
    cause: lastError,
  });
}

/**
 * Executes a SQL file as a single batch.
 * The pg library natively supports multi-statement strings.
 * This avoids shattering dollar-quoted blocks ($$ ... $$) used in
 * functions and triggers.
 */
async function runMigration(pg, sql) {
  if (!sql || sql.trim().length === 0) return;
  await pg.query(sql);
}

beforeAll(async () => {
  // Pre-check: Detect if Docker daemon is running.
  // If Docker is NOT available (e.g., local Windows development),
  // gracefully skip the entire test suite.
  dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    console.log('\n⏭️  Docker daemon not running, skipping container tests.\n');
    return; // Gracefully exit without throwing error
  }

  // Start PostgreSQL 16 container.
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test', // NOSONAR
      POSTGRES_DB: 'ice_tracking_test',
    })
    .withExposedPorts(5432)
    .withHealthCheck({
      test: ['CMD-SHELL', 'pg_isready -U test -d ice_tracking_test'],
      interval: 2_000,
      timeout: 5_000,
      retries: 10,
      startPeriod: 5_000,
    })
    .withWaitStrategy(Wait.forHealthCheck())
    .withStartupTimeout(90_000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);

  pool = new Pool({
    host,
    port,
    user: 'test',
    password: 'test', // NOSONAR
    database: 'ice_tracking_test',
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  await waitForPostgres(pool);

  const migrationPath = path.resolve(__dirname, '../../database/migrations/001_init_timescaledb.sql');
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }
  let sql = fs.readFileSync(migrationPath, 'utf8');

  // Strip TimescaleDB-specific extensions and features not available in plain Postgres
  try {
    // 🛡️ RE-SECURITY: We ensure we NEVER split the SQL by ';'.
    // The pg library handles multi-statement strings natively in Simple Query mode.
    // Splitting by ';' would shatter PostgreSQL dollar-quoted ($$ ... $$) blocks.
    sql = sql
      .replace(/CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;/gi, '-- [TimescaleDB Extension Removed]')
      .replace(/SELECT\s+create_hypertable[\s\S]*?;/gi, '-- [Hypertable Conversion Removed]')
      .replace(/CREATE MATERIALIZED VIEW[\s\S]*?WITH\s*\(timescaledb\.continuous\)[\s\S]*?WITH\s+NO\s+DATA;/gi, '-- [Continuous Aggregate Removed]')
      .replace(/SELECT\s+add_(continuous_aggregate|retention|compression|reorder)_policy[\s\S]*?;/gi, '-- [TimescaleDB Policy Removed]')
      .replace(/ALTER\s+TABLE[\s\S]*?SET\s*\(\s*timescaledb\.compress[\s\S]*?\);/gi, '-- [Compression Config Removed]');

    await runMigration(pool, sql);
  } catch (err) {
    console.error('CRITICAL: Migration failed. Unterminated blocks or syntax errors suspected.');
    console.error('Resulting SQL snippet near error:\n', sql.substring(0, 1000));
    throw err;
  }
}, 120_000);

afterAll(async () => {
  if (pool) await pool.end();
  if (container) await container.stop();
}, 30_000);

// ─── Helper ────────────────────────────────────────────────────

const query = async (text, params) => {
  if (!pool) return []; // Return empty array if pool not initialized (Docker check skipped tests)
  const result = await pool.query(text, params);
  return result.rows;
};

const get = async (text, params) => {
  if (!pool) return null; // Return null if pool not initialized (Docker check skipped tests)
  const rows = await query(text, params);
  return rows[0] || null;
};

// Track whether Docker is available (set during beforeAll)
let dockerAvailable = true;

// ═══════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════

describe('Testcontainers — PostgreSQL Integration', () => {
  // Add a hook to skip all tests if Docker was not available
  beforeEach(() => {
    if (!dockerAvailable) {
      return; // This allows beforeEach to complete without errors
    }
  });

  // ── Schema Verification ────────────────────────────────────

  test('core tables exist after migration', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const tables = await query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
    const names = tables.map(t => t.table_name);

    expect(names).toContain('users');
    expect(names).toContain('trucks');
    expect(names).toContain('drivers');
    expect(names).toContain('shops');
    expect(names).toContain('telemetry');
    expect(names).toContain('alerts');
  });

  // ── Users CRUD ─────────────────────────────────────────────

  test('insert and select a user', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const [user] = await query(
      `INSERT INTO users (username, password_hash, role, email, full_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
      ['testuser', 'hashed_pw_abc123', 'admin', 'test@example.com', 'Test User']
    );

    expect(user.username).toBe('testuser');
    expect(user.role).toBe('admin');
    expect(user.is_active).toBe(true);

    const fetched = await get(
      'SELECT id, username, email, role, is_active FROM users WHERE id = $1 ORDER BY id DESC LIMIT 1',
      [user.id]
    );
    expect(fetched.email).toBe('test@example.com');
  });

  test('unique username constraint enforced', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    await query(`INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)`, [
      'unique_check',
      'unique@example.com',
      'pw',
      'driver',
    ]);

    await expect(
      query(`INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)`, [
        'unique_check',
        'unique2@example.com',
        'pw2',
        'viewer',
      ])
    ).rejects.toThrow(/unique/i);
  });

  test('role check constraint enforced', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    // Note: plain Postgres might not enforce the ENUM check if it's not created correctly or if we just want to test failure
    await expect(
      query(`INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)`, [
        'bad_role',
        'bad@example.com',
        'pw',
        'superadmin', // Not in user_role enum
      ])
    ).rejects.toThrow();
  });

  // ── Trucks CRUD ────────────────────────────────────────────

  test('insert and query trucks', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const [truck] = await query(
      `INSERT INTO trucks (license_plate, model, status, capacity_kg)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
      ['กท-1234', 'Isuzu NLR', 'active', 5000]
    );

    expect(truck.license_plate).toBe('กท-1234');
    expect(truck.status).toBe('active');
    expect(Number(truck.capacity_kg)).toBe(5000);
  });

  test('truck status constraint enforced', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    await expect(
      query(`INSERT INTO trucks (license_plate, status) VALUES ($1, $2)`, [
        'XX-0000',
        'flying', // Not in truck_status enum
      ])
    ).rejects.toThrow();
  });

  // ── Drivers CRUD ───────────────────────────────────────────

  test('insert driver linked to user', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    // Create user first
    const [user] = await query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      ['driver_user1', 'driver1@example.com', 'pw', 'driver']
    );

    const [driver] = await query(
      `INSERT INTO drivers (license_no, full_name, user_id, phone)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
      ['DRV-001', 'สมชาย ใจดี', user.id, '0891234567']
    );

    expect(driver.license_no).toBe('DRV-001');
    expect(driver.full_name).toBe('สมชาย ใจดี');
  });

  // ── Shops CRUD ─────────────────────────────────────────────

  test('insert and query shops', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const [shop] = await query(
      `INSERT INTO shops (name, address, latitude, longitude)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
      ['ร้านน้ำแข็งสยาม', 'Bangkok', 13.7563, 100.5018]
    );

    expect(shop.name).toBe('ร้านน้ำแข็งสยาม');
    expect(Number(shop.latitude)).toBeCloseTo(13.7563, 3);
  });

  // ── Telemetry ──────────────────────────────────────────────

  test('insert telemetry data points', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const [truck] = await query(
      `INSERT INTO trucks (license_plate, status) VALUES ($1, $2) RETURNING id`,
      ['TELE-TRK', 'active']
    );

    await query(
      `INSERT INTO telemetry (time, truck_id, latitude, longitude, temperature, speed)
             VALUES (NOW(), $1, $2, $3, $4, $5)`,
      [truck.id, 13.756, 100.502, -18.5, 65.3]
    );

    const rows = await query(
      `SELECT truck_id, latitude, longitude, temperature, speed, time
             FROM telemetry
             WHERE truck_id = $1
             ORDER BY time DESC`,
      [truck.id]
    );
    expect(rows.length).toBe(1);
    expect(Number(rows[0].temperature)).toBeCloseTo(-18.5, 1);
  });

  // ── Alerts ─────────────────────────────────────────────────

  test('insert and resolve an alert', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const [truck] = await query(
      `INSERT INTO trucks (license_plate, status) VALUES ($1, $2) RETURNING id`,
      ['ALERT-TRK', 'active']
    );

    const alertMessage = `Temperature exceeds threshold (${randomUUID()})`;

    const [alert] = await query(
      `INSERT INTO alerts (truck_id, alert_type, severity, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
      [truck.id, 'temperature_high', 'critical', alertMessage]
    );

    expect(alert.resolved).toBe(false);

    await query(
      `UPDATE alerts
             SET resolved = TRUE, resolved_at = NOW()
             WHERE truck_id = $1 AND alert_type = $2 AND message = $3`,
      [truck.id, 'temperature_high', alertMessage]
    );

    const resolved = await get(
      `SELECT resolved
             FROM alerts
             WHERE truck_id = $1 AND alert_type = $2 AND message = $3
             ORDER BY time DESC
             LIMIT 1`,
      [truck.id, 'temperature_high', alertMessage]
    );
    expect(resolved.resolved).toBe(true);
  });

  // ── Transactions ───────────────────────────────────────────

  test('transaction commit works', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO shops (name, latitude, longitude) VALUES ($1, $2, $3)`, [
        'Committed Shop',
        13.7,
        100.5
      ]);
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const shop = await get(
      `SELECT id, name FROM shops WHERE name = $1 ORDER BY id DESC LIMIT 1`,
      ['Committed Shop']
    );
    expect(shop).not.toBeNull();
  });

  test('transaction rollback works', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO shops (name, latitude, longitude) VALUES ($1, $2, $3)`, [
        'Rolled Back Shop',
        13.7,
        100.5
      ]);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    const shop = await get(
      `SELECT id, name FROM shops WHERE name = $1 ORDER BY id DESC LIMIT 1`,
      ['Rolled Back Shop']
    );
    expect(shop).toBeNull();
  });

  // ── Parameterised Query Safety ─────────────────────────────

  test('parameterised queries prevent SQL injection', async () => {
    if (!dockerAvailable) {
      console.log('Skipping test: Docker daemon not available');
      return; // Skip this test
    }

    const malicious = "'; DROP TABLE users; --";
    await query(`INSERT INTO shops (name, latitude, longitude) VALUES ($1, $2, $3)`, [
      malicious,
      13.7,
      100.5
    ]);

    const shop = await get(
      `SELECT id, name FROM shops WHERE name = $1 ORDER BY id DESC LIMIT 1`,
      [malicious]
    );
    expect(shop.name).toBe(malicious); // stored as literal string
  });
});
