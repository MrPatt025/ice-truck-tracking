-- =============================================
-- เพิ่มแอดมิน admin001 รหัส 123456 ใน phpMyAdmin
-- =============================================

-- ใช้ฐานข้อมูล ice_trackings
USE ice_trackings;

-- เพิ่มแอดมินในตาราง users
INSERT INTO users (username, password, role) VALUES 
('admin001', '__REVOKED_HASH_SET_VIA_APP_RUNTIME__', 'admin');

-- แสดงข้อมูลแอดมินที่เพิ่ม
SELECT 'Admin user added successfully!' as status;
SELECT username, role FROM users WHERE username = 'admin001';


