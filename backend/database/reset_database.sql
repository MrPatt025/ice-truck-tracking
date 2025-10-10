-- =============================================
-- สคริปต์รีเซ็ตฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง
-- ใช้สำหรับลบข้อมูลทั้งหมดและสร้างใหม่
-- =============================================

-- ใช้ฐานข้อมูล
USE ice_tracking;

-- ปิดการตรวจสอบ foreign key ชั่วคราว
SET FOREIGN_KEY_CHECKS = 0;

-- ลบตารางทั้งหมด (เรียงลำดับตาม foreign key dependencies)
DROP TABLE IF EXISTS gps_logs;
DROP TABLE IF EXISTS route_assignments;
DROP TABLE IF EXISTS route_details;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS tracking;
DROP TABLE IF EXISTS trucks;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS shops;
DROP TABLE IF EXISTS users;

-- เปิดการตรวจสอบ foreign key กลับมา
SET FOREIGN_KEY_CHECKS = 1;

-- แสดงข้อความสำเร็จ
SELECT 'Database reset completed successfully!' as status;
SELECT 'All tables have been dropped. You can now run the complete_ice_tracking_database.sql to recreate the database.' as message;
