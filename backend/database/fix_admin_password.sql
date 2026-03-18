-- =============================================
-- Reset admin credential to runtime-managed value
-- =============================================

USE ice_trackings;

SET @target_username = 'admin001';
-- อัปเดตรหัสผ่านในตาราง users
-- รหัสผ่านถูกจัดการจาก runtime/secret manager
UPDATE users 
SET password = SHA2(
    CONCAT('runtime-reset-', UUID()),
    256
)
WHERE
    username = @target_username;

-- อัปเดตรหัสผ่านในตาราง drivers
UPDATE drivers 
SET password = SHA2(
    CONCAT('runtime-reset-', UUID()),
    256
)
WHERE
    username = @target_username;

-- แสดงข้อมูลที่อัปเดต
SELECT 'Updated admin password successfully!' as status;
SELECT username, role FROM users WHERE username = @target_username;

SELECT username, full_name
FROM drivers
WHERE
    username = @target_username;

-- แสดงข้อมูลการเข้าสู่ระบบ
SELECT 'Login Information:' as info;
SELECT 'Username: admin001' as login_info;
SELECT 'Password managed at runtime' as login_info;
SELECT 'Role: admin' as login_info;



