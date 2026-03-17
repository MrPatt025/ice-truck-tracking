-- =============================================
-- ตรวจสอบแอดมิน admin001 ในฐานข้อมูล
-- =============================================

USE ice_trackings;

-- ตรวจสอบตาราง users
SELECT 'Users table:' as info;
SELECT username, role FROM users WHERE username = 'admin001';

-- ตรวจสอบตาราง drivers
SELECT 'Drivers table:' as info;
SELECT driver_id, full_name, username FROM drivers WHERE username = 'admin001';

-- ตรวจสอบจำนวนผู้ใช้ทั้งหมด
SELECT 'Total users:' as info;
SELECT COUNT(*) as total_users FROM users;

-- ตรวจสอบจำนวนพนักงานขับรถทั้งหมด
SELECT 'Total drivers:' as info;
SELECT COUNT(*) as total_drivers FROM drivers;


