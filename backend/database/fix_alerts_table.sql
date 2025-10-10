-- Fix alerts table to match the code
-- Run this script to update the alerts table structure

USE ice_trackings;

-- Add missing columns
ALTER TABLE alerts 
ADD COLUMN truck_code VARCHAR(20) AFTER id,
ADD COLUMN driver_code VARCHAR(20) AFTER truck_code,
ADD COLUMN type ENUM('off_route', 'idle_too_long', 'speed_exceeded', 'maintenance_due', 'manual', 'emergency', 'fuel_low') DEFAULT 'manual' AFTER driver_id,
ADD COLUMN priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium' AFTER is_read,
ADD COLUMN location_data JSON AFTER priority,
ADD COLUMN resolved_at DATETIME NULL AFTER location_data,
ADD COLUMN resolved_by INT NULL AFTER resolved_at,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER resolved_by,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Change data types
ALTER TABLE alerts 
MODIFY COLUMN truck_id INT,
MODIFY COLUMN driver_id INT;

-- Add foreign key constraints
ALTER TABLE alerts 
ADD CONSTRAINT fk_alerts_truck_id FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_alerts_driver_id FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_alerts_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_alerts_truck_code ON alerts(truck_code);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_alert_time ON alerts(alert_time);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_priority ON alerts(priority);

-- Update existing records to have default values
UPDATE alerts SET type = 'manual' WHERE type IS NULL;
UPDATE alerts SET priority = 'medium' WHERE priority IS NULL;
UPDATE alerts SET is_read = FALSE WHERE is_read IS NULL;

-- Show the updated table structure
DESCRIBE alerts;
