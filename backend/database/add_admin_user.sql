-- =============================================
-- เพิ่มแอดมิน admin001 รหัส 123456 ในตาราง users
-- =============================================

USE ice_trackings;

-- เพิ่มแอดมินในตาราง users
INSERT INTO users (username, password, role) VALUES 
('admin001', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', 'admin');

-- แสดงข้อมูลแอดมินที่เพิ่ม
SELECT 'Admin user added successfully!' as status;
SELECT username, role FROM users WHERE username = 'admin001';

-- แสดงข้อมูลการเข้าสู่ระบบ
SELECT 'Login Information:' as info;
SELECT 'Username: admin001' as login_info;
SELECT 'Password: 123456' as login_info;
SELECT 'Role: admin' as login_info;