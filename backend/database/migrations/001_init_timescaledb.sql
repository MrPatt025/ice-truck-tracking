-- ============================================================================
-- Ice Truck Tracking — TimescaleDB Schema (Production-Grade)
-- PostgreSQL 16 + TimescaleDB 2.x
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'dispatcher', 'driver', 'viewer');

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;

DO $$ BEGIN
  CREATE TYPE truck_status AS ENUM ('active', 'idle', 'maintenance', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM (
    'temperature_high', 'temperature_low', 'speed_exceeded', 'geofence_breach',
    'route_deviation', 'idle_too_long', 'maintenance_due', 'connection_lost',
    'battery_low', 'door_opened'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users (with RBAC support)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    full_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens (JWT rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    family UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family);

-- Trucks
CREATE TABLE IF NOT EXISTS trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(50),
    capacity_kg DECIMAL(10, 2),
    status truck_status NOT NULL DEFAULT 'offline',
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    current_speed DECIMAL(5, 2) DEFAULT 0,
    current_temp DECIMAL(5, 2),
    firmware_ver VARCHAR(20),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    license_no VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    assigned_truck UUID REFERENCES trucks (id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shops (delivery destinations)
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(100) NOT NULL,
    truck_id UUID REFERENCES trucks (id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers (id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Route stops (ordered shop visits)
CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    route_id UUID NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops (id),
    stop_order SMALLINT NOT NULL,
    arrived_at TIMESTAMPTZ,
    departed_at TIMESTAMPTZ,
    UNIQUE (route_id, stop_order)
);

-- ============================================================================
-- TIMESCALEDB HYPERTABLES — Time-Series Data
-- ============================================================================

-- Telemetry (high-frequency truck position + sensor data)
CREATE TABLE IF NOT EXISTS telemetry (
    time TIMESTAMPTZ NOT NULL,
    truck_id UUID NOT NULL REFERENCES trucks (id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DECIMAL(5, 2) DEFAULT 0,
    heading SMALLINT,
    temperature DECIMAL(5, 2),
    humidity DECIMAL(5, 2),
    battery DECIMAL(5, 2),
    door_open BOOLEAN DEFAULT false,
    payload JSONB,
    CONSTRAINT telemetry_pkey PRIMARY KEY (time, truck_id)
);

-- Convert to hypertable (partitioned by time, 1-day chunks)
SELECT create_hypertable (
        'telemetry', 'time', chunk_time_interval = > INTERVAL '1 day', if_not_exists = > TRUE
    );

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    truck_id UUID REFERENCES trucks (id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers (id) ON DELETE SET NULL,
    alert_type alert_type NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'warning',
    message TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    metadata JSONB,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES users (id),
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ
);

SELECT create_hypertable (
        'alerts', 'time', chunk_time_interval = > INTERVAL '7 days', if_not_exists = > TRUE
    );

-- Audit log (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    old_value JSONB,
    new_value JSONB
);

SELECT create_hypertable (
        'audit_log', 'time', chunk_time_interval = > INTERVAL '30 days', if_not_exists = > TRUE
    );

-- ============================================================================
-- INDEXES (B-tree, GIN for JSONB)
-- ============================================================================

-- Telemetry indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_truck_time ON telemetry (truck_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_payload ON telemetry USING GIN (payload);

-- Alert indexes
CREATE INDEX IF NOT EXISTS idx_alerts_truck_time ON alerts (truck_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity, time DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts (resolved, time DESC)
WHERE
    resolved = false;

CREATE INDEX IF NOT EXISTS idx_alerts_metadata ON alerts USING GIN (metadata);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log (
    resource,
    resource_id,
    time DESC
);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Truck indexes
CREATE INDEX IF NOT EXISTS idx_trucks_status ON trucks (status);

CREATE INDEX IF NOT EXISTS idx_trucks_plate ON trucks (license_plate);

-- Driver indexes
CREATE INDEX IF NOT EXISTS idx_drivers_truck ON drivers (assigned_truck);

-- ============================================================================
-- CONTINUOUS AGGREGATES (Real-time dashboards)
-- ============================================================================

-- Hourly telemetry summary per truck
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  truck_id,
  AVG(speed)::DECIMAL(5,2)         AS avg_speed,
  MAX(speed)::DECIMAL(5,2)         AS max_speed,
  AVG(temperature)::DECIMAL(5,2)   AS avg_temp,
  MIN(temperature)::DECIMAL(5,2)   AS min_temp,
  MAX(temperature)::DECIMAL(5,2)   AS max_temp,
  COUNT(*)                         AS sample_count,
  FIRST(latitude, time)            AS start_lat,
  FIRST(longitude, time)           AS start_lng,
  LAST(latitude, time)             AS end_lat,
  LAST(longitude, time)            AS end_lng
FROM telemetry
GROUP BY bucket, truck_id
WITH NO DATA;

-- Daily alert summary
CREATE MATERIALIZED VIEW IF NOT EXISTS alerts_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket ('1 day', time) AS bucket,
    truck_id,
    severity,
    COUNT(*) AS alert_count
FROM alerts
GROUP BY
    bucket,
    truck_id,
    severity
WITH
    NO DATA;

-- ============================================================================
-- CONTINUOUS AGGREGATE POLICIES (auto-refresh)
-- ============================================================================

SELECT
    add_continuous_aggregate_policy (
        'telemetry_hourly',
        start_offset = > INTERVAL '3 hours',
        end_offset = > INTERVAL '1 hour',
        schedule_interval = > INTERVAL '1 hour',
        if_not_exists = > TRUE
    );

SELECT
    add_continuous_aggregate_policy (
        'alerts_daily',
        start_offset = > INTERVAL '3 days',
        end_offset = > INTERVAL '1 day',
        schedule_interval = > INTERVAL '1 day',
        if_not_exists = > TRUE
    );

-- ============================================================================
-- COMPRESSION POLICIES
-- ============================================================================

ALTER TABLE telemetry SET(
    timescaledb.compress,
    timescaledb.compress_segmentby = 'truck_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy (
        'telemetry', compress_after = > INTERVAL '7 days', if_not_exists = > TRUE
    );

ALTER TABLE alerts SET(
    timescaledb.compress,
    timescaledb.compress_segmentby = 'truck_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy (
        'alerts', compress_after = > INTERVAL '30 days', if_not_exists = > TRUE
    );

ALTER TABLE audit_log SET(
    timescaledb.compress,
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy (
        'audit_log', compress_after = > INTERVAL '90 days', if_not_exists = > TRUE
    );

-- ============================================================================
-- DATA RETENTION POLICIES
-- ============================================================================

-- Telemetry: keep raw data for 90 days
SELECT add_retention_policy (
        'telemetry', drop_after = > INTERVAL '90 days', if_not_exists = > TRUE
    );

-- Alerts: keep for 1 year
SELECT add_retention_policy (
        'alerts', drop_after = > INTERVAL '365 days', if_not_exists = > TRUE
    );

-- Audit log: keep for 2 years (compliance)
SELECT add_retention_policy (
        'audit_log', drop_after = > INTERVAL '730 days', if_not_exists = > TRUE
    );

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_trucks_updated_at
    BEFORE UPDATE ON trucks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SEED: Default admin user (password: ChangeMeImmediately!)
-- password hash provided at runtime
-- ============================================================================
INSERT INTO
    users (
        username,
        email,
        password_hash,
        role,
        full_name
    )
VALUES (
        'admin',
        'admin@ice-truck.local',
        '__REVOKED_HASH_SET_VIA_APP_RUNTIME__',
        'admin',
        'System Administrator'
    ) ON CONFLICT (username) DO NOTHING;


