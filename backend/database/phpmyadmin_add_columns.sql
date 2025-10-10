-- Copy and paste this into phpMyAdmin SQL tab
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
