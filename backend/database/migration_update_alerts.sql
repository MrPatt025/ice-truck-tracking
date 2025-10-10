-- Migration script to update alerts table for enhanced alert system
-- Run this script to update existing alerts table

USE ice_tracking;

-- Add new columns to existing alerts table
ALTER TABLE alerts 
ADD COLUMN type ENUM('off_route', 'idle_too_long', 'speed_exceeded', 'maintenance_due', 'manual') DEFAULT 'manual' AFTER driver_id,
ADD COLUMN is_read BOOLEAN DEFAULT FALSE AFTER alert_time,
ADD COLUMN location_data JSON AFTER is_read,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER location_data,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Add truck_code and driver_code columns if they don't exist
ALTER TABLE alerts 
ADD COLUMN truck_code VARCHAR(20) AFTER id,
ADD COLUMN driver_code VARCHAR(20) AFTER truck_code;

-- Update existing records to have default values
UPDATE alerts SET type = 'manual' WHERE type IS NULL;
UPDATE alerts SET is_read = FALSE WHERE is_read IS NULL;

-- Add indexes for better performance
CREATE INDEX idx_alerts_truck_code ON alerts(truck_code);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_alert_time ON alerts(alert_time);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
