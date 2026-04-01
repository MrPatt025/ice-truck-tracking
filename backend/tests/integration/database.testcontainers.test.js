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

// ─── Container + Pool Setup ────────────────────────────────────

let container;
let pool;

/**
 * Wait until the pool can actually execute a query (PostgreSQL fully ready).
 * Retries SELECT 1 every 500 ms for up to `maxAttempts` attempts.
 */
async function waitForPostgres(pg, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await pg.query('SELECT 1');
            return; // connected
        } catch {
            await new Promise((r) => setTimeout(r, 500));
        }
    }
    throw new Error(`PostgreSQL did not become ready after ${maxAttempts * 500} ms`);
}

/**
 * Split a SQL file on semicolons and execute each non-empty statement
 * individually.  Running them one-by-one avoids the pg driver dropping the
 * connection mid-batch on large multi-statement strings.
 */
async function runMigration(pg, sql) {
    const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    for (const stmt of statements) {
        await pg.query(stmt);
    }
}

beforeAll(async () => {
    // Start PostgreSQL 16 container.
    // Use pg_isready health-check so the wait strategy tracks actual
    // client-facing readiness, not just the first log message (which can
    // fire before the target database exists).
    container = await new GenericContainer('postgres:16-alpine')
        .withEnvironment({
            POSTGRES_USER: 'test',
            POSTGRES_PASSWORD: 'test', // NOSONAR — test-only container credentials
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
        password: 'test', // NOSONAR — test-only container credentials
        database: 'ice_tracking_test',
        max: 5,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 30_000,
    });

    // Extra safeguard: retry SELECT 1 until the pg client can connect
    await waitForPostgres(pool);

    // Apply migration (skip TimescaleDB-specific parts)
    const migrationPath = path.resolve(__dirname, '../../database/migrations/001_init.sql');
    let sql = fs.readFileSync(migrationPath, 'utf8');

    // Remove TimescaleDB-specific statements (not available in plain postgres)
    sql = sql
        .replaceAll(/CREATE EXTENSION IF NOT EXISTS timescaledb[^;]*;/gi, '')
        .replaceAll(/SELECT\s+create_hypertable\s*\([^;]*;/gi, '')
        .replaceAll(/CREATE MATERIALIZED VIEW.*?;/gis, '')
        .replaceAll(/SELECT\s+add_continuous_aggregate_policy\s*\([^;]*;/gi, '')
        .replaceAll(/SELECT\s+add_retention_policy\s*\([^;]*;/gi, '')
        .replaceAll(/WITH\s*\(timescaledb\.continuous\)\s*AS/gi, 'AS');

    // Execute statements one at a time to avoid mid-batch connection drops
    await runMigration(pool, sql);
}, 120_000);

afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
}, 30_000);

// ─── Helper ────────────────────────────────────────────────────

const query = async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows;
};

const get = async (text, params) => {
    const rows = await query(text, params);
    return rows[0] || null;
};

// ═══════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════

describe('Testcontainers — PostgreSQL Integration', () => {
    // ── Schema Verification ────────────────────────────────────

    test('core tables exist after migration', async () => {
        const tables = await query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        const names = tables.map((t) => t.table_name);

        expect(names).toContain('users');
        expect(names).toContain('trucks');
        expect(names).toContain('drivers');
        expect(names).toContain('shops');
        expect(names).toContain('telemetry');
        expect(names).toContain('alerts');
    });

    // ── Users CRUD ─────────────────────────────────────────────

    test('insert and select a user', async () => {
        const [user] = await query(
            `INSERT INTO users (username, password, role, email, full_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            ['testuser', 'hashed_pw_abc123', 'admin', 'test@example.com', 'Test User'],
        );

        expect(user.username).toBe('testuser');
        expect(user.role).toBe('admin');
        expect(user.is_active).toBe(true);

        const fetched = await get(
            'SELECT id, username, email, role, is_active FROM users WHERE id = $1 ORDER BY id DESC LIMIT 1',
            [user.id],
        );
        expect(fetched.email).toBe('test@example.com');
    });

    test('unique username constraint enforced', async () => {
        await query(
            `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)`,
            ['unique_check', 'pw', 'driver'],
        );

        await expect(
            query(
                `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)`,
                ['unique_check', 'pw2', 'viewer'],
            ),
        ).rejects.toThrow(/unique/i);
    });

    test('role check constraint enforced', async () => {
        await expect(
            query(
                `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)`,
                ['bad_role', 'pw', 'superadmin'],
            ),
        ).rejects.toThrow(/check/i);
    });

    // ── Trucks CRUD ────────────────────────────────────────────

    test('insert and query trucks', async () => {
        const [truck] = await query(
            `INSERT INTO trucks (truck_code, plate_number, model, status, capacity_kg)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            ['TRK-001', 'กท-1234', 'Isuzu NLR', 'active', 5000],
        );

        expect(truck.truck_code).toBe('TRK-001');
        expect(truck.status).toBe('active');
        expect(Number(truck.capacity_kg)).toBe(5000);
    });

    test('truck status constraint enforced', async () => {
        await expect(
            query(
                `INSERT INTO trucks (truck_code, plate_number, status) VALUES ($1, $2, $3)`,
                ['TRK-BAD', 'XX-0000', 'flying'],
            ),
        ).rejects.toThrow(/check/i);
    });

    // ── Drivers CRUD ───────────────────────────────────────────

    test('insert driver linked to user', async () => {
        // Create user first
        await query(
            `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            ['driver_user1', 'pw', 'driver'],
        );

        const [driver] = await query(
            `INSERT INTO drivers (driver_code, full_name, username, phone)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            ['DRV-001', 'สมชาย ใจดี', 'driver_user1', '0891234567'],
        );

        expect(driver.driver_code).toBe('DRV-001');
        expect(driver.full_name).toBe('สมชาย ใจดี');
    });

    // ── Shops CRUD ─────────────────────────────────────────────

    test('insert and query shops', async () => {
        const [shop] = await query(
            `INSERT INTO shops (shop_code, shop_name, latitude, longitude)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            ['SHOP-001', 'ร้านน้ำแข็งสยาม', 13.7563, 100.5018],
        );

        expect(shop.shop_name).toBe('ร้านน้ำแข็งสยาม');
        expect(Number(shop.latitude)).toBeCloseTo(13.7563, 3);
    });

    // ── Telemetry ──────────────────────────────────────────────

    test('insert telemetry data points', async () => {
        await query(
            `INSERT INTO telemetry (truck_id, latitude, longitude, temperature, speed)
             VALUES ($1, $2, $3, $4, $5)`,
            ['TRK-001', 13.756, 100.502, -18.5, 65.3],
        );

        const rows = await query(
            `SELECT truck_id, latitude, longitude, temperature, speed, time
             FROM telemetry
             WHERE truck_id = $1
             ORDER BY time DESC`,
            ['TRK-001'],
        );
        expect(rows.length).toBe(1);
        expect(Number(rows[0].temperature)).toBeCloseTo(-18.5, 1);
    });

    // ── Alerts ─────────────────────────────────────────────────

    test('insert and resolve an alert', async () => {
        const alertMessage = `Temperature exceeds threshold (${randomUUID()})`;

        const [alert] = await query(
            `INSERT INTO alerts (truck_id, alert_type, severity, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            ['TRK-001', 'temperature_high', 'critical', alertMessage],
        );

        expect(alert.resolved).toBe(false);

        await query(
            `UPDATE alerts
             SET resolved = TRUE, resolved_at = NOW()
             WHERE truck_id = $1 AND alert_type = $2 AND message = $3`,
            ['TRK-001', 'temperature_high', alertMessage],
        );

        const resolved = await get(
            `SELECT resolved
             FROM alerts
             WHERE truck_id = $1 AND alert_type = $2 AND message = $3
             ORDER BY time DESC
             LIMIT 1`,
            ['TRK-001', 'temperature_high', alertMessage],
        );
        expect(resolved.resolved).toBe(true);
    });

    // ── Transactions ───────────────────────────────────────────

    test('transaction commit works', async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `INSERT INTO shops (shop_code, shop_name) VALUES ($1, $2)`,
                ['TX-OK', 'Committed Shop'],
            );
            await client.query('COMMIT');
        } finally {
            client.release();
        }

        const shop = await get(
            `SELECT id, shop_code, shop_name FROM shops WHERE shop_code = $1 ORDER BY id DESC LIMIT 1`,
            ['TX-OK'],
        );
        expect(shop).not.toBeNull();
    });

    test('transaction rollback works', async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `INSERT INTO shops (shop_code, shop_name) VALUES ($1, $2)`,
                ['TX-FAIL', 'Rolled Back Shop'],
            );
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }

        const shop = await get(
            `SELECT id, shop_code, shop_name FROM shops WHERE shop_code = $1 ORDER BY id DESC LIMIT 1`,
            ['TX-FAIL'],
        );
        expect(shop).toBeNull();
    });

    // ── Parameterised Query Safety ─────────────────────────────

    test('parameterised queries prevent SQL injection', async () => {
        const malicious = "'; DROP TABLE users; --";
        await query(
            `INSERT INTO shops (shop_code, shop_name) VALUES ($1, $2)`,
            ['SAFE-001', malicious],
        );

        const shop = await get(
            `SELECT id, shop_code, shop_name FROM shops WHERE shop_code = $1 ORDER BY id DESC LIMIT 1`,
            ['SAFE-001'],
        );
        expect(shop.shop_name).toBe(malicious); // stored as literal string
    });
});
