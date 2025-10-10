-- Final fixes for alerts table - Run this in phpMyAdmin SQL tab
-- This will fix the remaining issues with ENUM values, data types, and nullability

-- 1. Fix 'type' column: Correct ENUM values and set to NOT NULL
ALTER TABLE `alerts`
MODIFY COLUMN `type` ENUM('off_route', 'idle_too_long', 'speed_exceeded', 'maintenance_due', 'manual', 'emergency', 'fuel_low') NOT NULL DEFAULT 'manual';

-- 2. Fix 'location_data' column: Change type from LONGTEXT to JSON
-- WARNING: If existing data in 'location_data' is NOT valid JSON, this will fail
-- Make sure existing data is NULL or valid JSON before running this
ALTER TABLE `alerts`
MODIFY COLUMN `location_data` JSON NULL;

-- 3. Fix 'alert_time' column: Set to NOT NULL
ALTER TABLE `alerts`
MODIFY COLUMN `alert_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. Fix 'is_read' column: Set to NOT NULL
ALTER TABLE `alerts`
MODIFY COLUMN `is_read` TINYINT(1) NOT NULL DEFAULT 0;

-- 5. Fix 'priority' column: Set to NOT NULL
ALTER TABLE `alerts`
MODIFY COLUMN `priority` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium';

-- 6. Show the final table structure
DESCRIBE `alerts`;
