-- =============================================
-- แก้ไขปัญหาแอดมิน admin001 รหัส 123456 อย่างสมบูรณ์
-- =============================================

-- ใช้ฐานข้อมูล ice_trackings
USE ice_trackings;

-- ลบแอดมินเก่า (ถ้ามี)
DELETE FROM users WHERE username = 'admin001';
DELETE FROM drivers WHERE username = 'admin001';

-- เพิ่มแอดมินใหม่ในตาราง users
-- รหัสผ่านถูกจัดการจาก runtime/secret manager
INSERT INTO users (username, password, role) VALUES 
('admin001', '__REVOKED_HASH_SET_VIA_APP_RUNTIME__', 'admin');

-- เพิ่มแอดมินในตาราง drivers
INSERT INTO drivers (driver_id, full_name, username, password, phone, start_date) VALUES 
('ADMIN001', 'ผู้ดูแลระบบ', 'admin001', '__REVOKED_HASH_SET_VIA_APP_RUNTIME__', '0812345678', '2024-01-01');

-- แสดงข้อมูลแอดมินที่เพิ่ม
SELECT 'Admin user added successfully!' as status;
SELECT username, role FROM users WHERE username = 'admin001';
SELECT driver_id, full_name, username FROM drivers WHERE username = 'admin001';

-- แสดงข้อมูลการเข้าสู่ระบบ
SELECT 'Login Information:' as info;
SELECT 'Username: admin001' as login_info;
SELECT 'Password managed at runtime' as login_info;
SELECT 'Role: admin' as login_info;


