-- =============================================
-- แก้ไขปัญหาแอดมิน admin001 รหัส 123456
-- =============================================

USE ice_trackings;

-- ลบแอดมินเก่า (ถ้ามี)
DELETE FROM users WHERE username = 'admin001';
DELETE FROM drivers WHERE username = 'admin001';

-- เพิ่มแอดมินใหม่ด้วยรหัสผ่านที่ถูกต้อง
-- รหัสผ่าน 123456 เข้ารหัสด้วย bcrypt
INSERT INTO users (username, password, role) VALUES 
('admin001', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- เพิ่มแอดมินในตาราง drivers
INSERT INTO drivers (driver_id, full_name, username, password, phone, start_date) VALUES 
('ADMIN001', 'ผู้ดูแลระบบ', 'admin001', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0812345678', '2024-01-01');

-- แสดงข้อมูลแอดมินที่เพิ่ม
SELECT 'Admin user fixed successfully!' as status;
SELECT username, role FROM users WHERE username = 'admin001';
SELECT driver_id, full_name, username FROM drivers WHERE driver_id = 'ADMIN001';

-- แสดงข้อมูลการเข้าสู่ระบบ
SELECT 'Login Information:' as info;
SELECT 'Username: admin001' as login_info;
SELECT 'Password: 123456' as login_info;
SELECT 'Role: admin' as login_info;
