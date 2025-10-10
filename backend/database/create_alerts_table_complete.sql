-- Complete alerts table creation - Run this in phpMyAdmin SQL tab
-- This will create a perfect alerts table that matches the system requirements 100%

-- Drop existing alerts table if it exists (WARNING: This will delete all data!)
DROP TABLE IF EXISTS `alerts`;

-- Create the complete alerts table
CREATE TABLE `alerts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `truck_code` VARCHAR(20) NULL COMMENT 'รหัสรถ (license_plate)',
  `driver_code` VARCHAR(20) NULL COMMENT 'รหัสคนขับ',
  `truck_id` INT(11) NULL COMMENT 'ID รถจากตาราง trucks',
  `driver_id` INT(11) NULL COMMENT 'ID คนขับจากตาราง drivers',
  `type` ENUM('off_route', 'idle_too_long', 'speed_exceeded', 'maintenance_due', 'manual', 'emergency', 'fuel_low') NOT NULL DEFAULT 'manual' COMMENT 'ประเภทการแจ้งเตือน',
  `message` TEXT NOT NULL COMMENT 'ข้อความแจ้งเตือน',
  `alert_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'เวลาที่เกิดการแจ้งเตือน',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'สถานะการอ่าน (0=ยังไม่อ่าน, 1=อ่านแล้ว)',
  `priority` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium' COMMENT 'ระดับความสำคัญ',
  `location_data` JSON NULL COMMENT 'ข้อมูลตำแหน่ง (latitude, longitude, address)',
  `resolved_at` DATETIME NULL COMMENT 'เวลาที่แก้ไขปัญหาแล้ว',
  `resolved_by` INT(11) NULL COMMENT 'ID ผู้แก้ไขปัญหา',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'เวลาที่สร้าง',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'เวลาที่อัปเดตล่าสุด',
  
  PRIMARY KEY (`id`),
  
  -- Foreign key constraints (commented out to avoid errors if referenced tables don't exist)
  -- CONSTRAINT `fk_alerts_truck_id` FOREIGN KEY (`truck_id`) REFERENCES `trucks` (`truck_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  -- CONSTRAINT `fk_alerts_driver_id` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  -- CONSTRAINT `fk_alerts_resolved_by` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  
  -- Indexes for better performance
  INDEX `idx_alerts_truck_code` (`truck_code`),
  INDEX `idx_alerts_driver_code` (`driver_code`),
  INDEX `idx_alerts_type` (`type`),
  INDEX `idx_alerts_alert_time` (`alert_time`),
  INDEX `idx_alerts_is_read` (`is_read`),
  INDEX `idx_alerts_priority` (`priority`),
  INDEX `idx_alerts_truck_id` (`truck_id`),
  INDEX `idx_alerts_driver_id` (`driver_id`),
  INDEX `idx_alerts_resolved_at` (`resolved_at`),
  INDEX `idx_alerts_created_at` (`created_at`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ตารางการแจ้งเตือนระบบติดตามรถ';

-- Insert sample data for testing (without foreign key references)
INSERT INTO `alerts` (`truck_code`, `driver_code`, `type`, `message`, `priority`, `location_data`) VALUES
('กข-1234', 'DRV001', 'off_route', 'รถออกนอกเส้นทางที่กำหนด', 'high', '{"latitude": 13.7563, "longitude": 100.5018, "address": "กรุงเทพมหานคร"}'),
('กข-5678', 'DRV002', 'idle_too_long', 'รถจอดอยู่นานเกิน 30 นาที', 'medium', '{"latitude": 13.7563, "longitude": 100.5018, "address": "กรุงเทพมหานคร"}'),
('กข-9012', 'DRV003', 'speed_exceeded', 'รถขับเร็วเกิน 80 กม./ชม.', 'high', '{"latitude": 13.7563, "longitude": 100.5018, "address": "กรุงเทพมหานคร"}');

-- Show the final table structure
DESCRIBE `alerts`;

-- Show sample data
SELECT * FROM `alerts` LIMIT 5;
