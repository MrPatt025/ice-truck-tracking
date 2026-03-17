-- =============================================
-- แก้ไขรหัสผ่าน admin001 ให้เป็น 123456
-- =============================================

USE ice_trackings;

-- อัปเดตรหัสผ่านในตาราง users
-- รหัสผ่านถูกจัดการจาก runtime/secret manager
UPDATE users 
SET password = '__REVOKED_HASH_SET_VIA_APP_RUNTIME__'
WHERE username = 'admin001';

-- อัปเดตรหัสผ่านในตาราง drivers
UPDATE drivers 
SET password = '__REVOKED_HASH_SET_VIA_APP_RUNTIME__'
WHERE username = 'admin001';

-- แสดงข้อมูลที่อัปเดต
SELECT 'Updated admin password successfully!' as status;
SELECT username, role FROM users WHERE username = 'admin001';
SELECT username, full_name FROM drivers WHERE username = 'admin001';

-- แสดงข้อมูลการเข้าสู่ระบบ
SELECT 'Login Information:' as info;
SELECT 'Username: admin001' as login_info;
SELECT 'Password managed at runtime' as login_info;
SELECT 'Role: admin' as login_info;



