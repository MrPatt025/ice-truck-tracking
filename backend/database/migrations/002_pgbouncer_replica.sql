-- ============================================================================
-- Migration 002: PgBouncer-compatible settings + Read Replica user
-- ============================================================================

-- Create read-only replica user
DO $$ BEGIN
  CREATE ROLE reader WITH LOGIN PASSWORD 'CHANGE_ME_READER_PASSWORD';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT CONNECT ON DATABASE ice_tracking TO reader;

GRANT USAGE ON SCHEMA public TO reader;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT
SELECT ON TABLES TO reader;

-- Create application user with limited privileges (principle of least privilege)
DO $$ BEGIN
CREATE ROLE app_user
WITH
    LOGIN PASSWORD 'CHANGE_ME_APP_PASSWORD';

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;

GRANT CONNECT ON DATABASE ice_tracking TO app_user;

GRANT USAGE ON SCHEMA public TO app_user;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON ALL TABLES IN SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON TABLES TO app_user;

GRANT USAGE,
SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE,
SELECT ON SEQUENCES TO app_user;

-- ============================================================================
-- Prepared statement-friendly indexes (PgBouncer transaction mode)
-- ============================================================================
-- For the most frequent lookup: latest telemetry per truck
CREATE INDEX IF NOT EXISTS idx_telemetry_truck_latest ON telemetry (truck_id, time DESC) INCLUDE (
    latitude,
    longitude,
    speed,
    temperature
);

-- For dashboard: unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_alerts_unacked ON alerts (time DESC)
WHERE
    acknowledged = false;

-- For auth: user login
CREATE INDEX IF NOT EXISTS idx_users_username_active ON users (username)
WHERE
    is_active = true;
