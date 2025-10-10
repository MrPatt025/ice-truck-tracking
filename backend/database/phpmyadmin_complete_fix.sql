-- Complete fix for alerts table - Run this in phpMyAdmin SQL tab
-- This will add all missing columns, fix data types, add indexes, and update data

-- Step 1: Add missing columns
ALTER TABLE `alerts` 
ADD COLUMN `truck_code` VARCHAR(20) NULL AFTER `id`,
ADD COLUMN `driver_code` VARCHAR(20) NULL AFTER `truck_code`,
ADD COLUMN `type` ENUM('off_route', 'idle_too_long', 'speed_exceeded', 'maintenance_due', 'manual', 'emergency', 'fuel_low') DEFAULT 'manual' AFTER `driver_id`,
ADD COLUMN `priority` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium' AFTER `is_read`,
ADD COLUMN `location_data` JSON NULL AFTER `priority`,
ADD COLUMN `resolved_at` DATETIME NULL AFTER `location_data`,
ADD COLUMN `resolved_by` INT NULL AFTER `resolved_at`,
ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `resolved_by`,
ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Step 2: Fix data types
ALTER TABLE `alerts` 
MODIFY COLUMN `truck_id` INT NULL,
MODIFY COLUMN `driver_id` INT NULL;

-- Step 3: Add indexes for better performance (only if they don't exist)
-- Check and create indexes safely
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'alerts' 
     AND index_name = 'idx_alerts_truck_code') = 0,
    'CREATE INDEX `idx_alerts_truck_code` ON `alerts`(`truck_code`)',
    'SELECT "Index idx_alerts_truck_code already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'alerts' 
     AND index_name = 'idx_alerts_type') = 0,
    'CREATE INDEX `idx_alerts_type` ON `alerts`(`type`)',
    'SELECT "Index idx_alerts_type already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'alerts' 
     AND index_name = 'idx_alerts_alert_time') = 0,
    'CREATE INDEX `idx_alerts_alert_time` ON `alerts`(`alert_time`)',
    'SELECT "Index idx_alerts_alert_time already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'alerts' 
     AND index_name = 'idx_alerts_is_read') = 0,
    'CREATE INDEX `idx_alerts_is_read` ON `alerts`(`is_read`)',
    'SELECT "Index idx_alerts_is_read already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'alerts' 
     AND index_name = 'idx_alerts_priority') = 0,
    'CREATE INDEX `idx_alerts_priority` ON `alerts`(`priority`)',
    'SELECT "Index idx_alerts_priority already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Update existing data with default values
UPDATE `alerts` SET `type` = 'manual' WHERE `type` IS NULL;
UPDATE `alerts` SET `priority` = 'medium' WHERE `priority` IS NULL;
UPDATE `alerts` SET `is_read` = 0 WHERE `is_read` IS NULL;

-- Step 5: Show the updated table structure
DESCRIBE `alerts`;