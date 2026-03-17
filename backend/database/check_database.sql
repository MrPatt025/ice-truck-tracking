-- =============================================
-- ตรวจสอบฐานข้อมูล ice_trackings
-- =============================================

-- ตรวจสอบฐานข้อมูล
SHOW DATABASES LIKE 'ice_trackings';

-- ใช้ฐานข้อมูล ice_trackings
USE ice_trackings;

-- ตรวจสอบตารางทั้งหมด
SHOW TABLES;

-- ตรวจสอบโครงสร้างตาราง users
DESCRIBE users;

-- ตรวจสอบโครงสร้างตาราง drivers
DESCRIBE drivers;

-- ตรวจสอบข้อมูลในตาราง users
SELECT username, role FROM users;

-- ตรวจสอบข้อมูลในตาราง drivers
SELECT driver_id, full_name, username FROM drivers;

-- ตรวจสอบแอดมิน admin001
SELECT username, role FROM users WHERE username = 'admin001';
SELECT driver_id, full_name, username FROM drivers WHERE username = 'admin001';


