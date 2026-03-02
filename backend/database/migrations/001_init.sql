-- ============================================================
-- Ice Truck Tracking — PostgreSQL + TimescaleDB Schema
-- Run once: psql -U postgres -d ice_tracking -f 001_init.sql
-- ============================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ────────────────────────────────────────────────────────────
-- Core tables
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'driver' CHECK (
        role IN (
            'admin',
            'manager',
            'dispatcher',
            'driver',
            'viewer'
        )
    ),
    email VARCHAR(255),
    full_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trucks (
    id SERIAL PRIMARY KEY,
    truck_code VARCHAR(50) UNIQUE NOT NULL,
    plate_number VARCHAR(30) NOT NULL,
    model VARCHAR(100),
    color VARCHAR(30),
    gps_code VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'inactive' CHECK (
        status IN (
            'active',
            'inactive',
            'maintenance',
            'offline'
        )
    ),
    capacity_kg NUMERIC(10, 2),
    year INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    driver_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(20),
    license_number VARCHAR(50),
    username VARCHAR(100) REFERENCES users (username),
    phone VARCHAR(20),
    address TEXT,
    start_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    shop_code VARCHAR(50) UNIQUE NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TimescaleDB Hypertables — time-series data
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemetry (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    truck_id VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION,
    speed DOUBLE PRECISION DEFAULT 0,
    battery DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    heading DOUBLE PRECISION
);

-- Convert to hypertable (partitioned by time — 1-day chunks)
SELECT create_hypertable (
        'telemetry', 'time', if_not_exists = > TRUE, chunk_time_interval = > INTERVAL '1 day'
    );

-- Continuous aggregate: 5-min downsampled averages
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_5min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket ('5 minutes', time) AS bucket,
    truck_id,
    AVG(temperature) AS avg_temp,
    AVG(speed) AS avg_speed,
    AVG(latitude) AS avg_lat,
    AVG(longitude) AS avg_lon,
    MIN(temperature) AS min_temp,
    MAX(temperature) AS max_temp,
    COUNT(*) AS sample_count
FROM telemetry
GROUP BY
    bucket,
    truck_id;

-- Refresh policy: materialise every 5 min, looking back 30 min
SELECT
    add_continuous_aggregate_policy (
        'telemetry_5min',
        start_offset = > INTERVAL '30 minutes',
        end_offset = > INTERVAL '5 minutes',
        schedule_interval = > INTERVAL '5 minutes',
        if_not_exists = > TRUE
    );

-- Auto-drop raw telemetry older than 90 days
SELECT add_retention_policy (
        'telemetry', INTERVAL '90 days', if_not_exists = > TRUE
    );

-- ────────────────────────────────────────────────────────────
-- Alerts hypertable
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alerts (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    truck_id VARCHAR(50),
    driver_id INT,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (
        severity IN ('info', 'warning', 'critical')
    ),
    message TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by INT
);

SELECT create_hypertable (
        'alerts', 'time', if_not_exists = > TRUE, chunk_time_interval = > INTERVAL '7 days'
    );

-- ────────────────────────────────────────────────────────────
-- Tracking (delivery route checkpoints)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tracking (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shop_code VARCHAR(50),
    truck_code VARCHAR(50),
    driver_code VARCHAR(50),
    gps_code VARCHAR(100),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    event_type VARCHAR(30) DEFAULT 'checkpoint'
);

SELECT create_hypertable (
        'tracking', 'time', if_not_exists = > TRUE, chunk_time_interval = > INTERVAL '1 day'
    );

-- ────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_telemetry_truck ON telemetry (truck_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_truck ON alerts (truck_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity, time DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_truck ON tracking (truck_code, time DESC);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE INDEX IF NOT EXISTS idx_drivers_username ON drivers (username);

-- ────────────────────────────────────────────────────────────
-- Seed admin user  (password: admin123 — bcryptjs hash)
-- ────────────────────────────────────────────────────────────

INSERT INTO
    users (
        username,
        password,
        role,
        full_name
    )
VALUES (
        'admin',
        '$2a$12$LJ3m4ys3Gz9h5g0z3f5.o.xTd/EY0RJ3KBDxHXqKjSIqI4VfSiZPi',
        'admin',
        'System Admin'
    ) ON CONFLICT (username) DO NOTHING;
