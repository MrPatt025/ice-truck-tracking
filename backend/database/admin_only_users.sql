-- =============================================
-- เพิ่มแอดมิน admin001 รหัส 123456 เฉพาะในตาราง users
-- =============================================

USE ice_trackings;

-- ลบแอดมินเก่า (ถ้ามี)
DELETE FROM users WHERE username = 'admin001';

-- เพิ่มแอดมินใหม่ในตาราง users เท่านั้น
-- รหัสผ่าน 123456 เข้ารหัสด้วย bcrypt
INSERT INTO users (username, password, role) VALUES 
('admin001', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- แสดงข้อมูลแอดมินที่เพิ่ม
SELECT 'Admin user added successfully!' as status;
SELECT * FROM users WHERE username = 'admin001';

-- แสดงข้อมูลการเข้าสู่ระบบ
SELECT 'Login Information:' as info;
SELECT 'Username: admin001' as login_info;
SELECT 'Password: 123456' as login_info;
SELECT 'Role: admin' as login_info;
