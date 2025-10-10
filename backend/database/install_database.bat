@echo off
echo =============================================
echo สคริปต์ติดตั้งฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง
echo =============================================
echo.

echo กำลังติดตั้งฐานข้อมูล...
echo.

REM ตรวจสอบว่า MySQL ทำงานอยู่หรือไม่
echo ตรวจสอบการเชื่อมต่อ MySQL...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ไม่พบ MySQL หรือ MySQL ไม่ได้ติดตั้ง
    echo กรุณาติดตั้ง MySQL ก่อน
    pause
    exit /b 1
)

echo ✅ พบ MySQL
echo.

REM รันสคริปต์สร้างฐานข้อมูล
echo กำลังสร้างฐานข้อมูลและตาราง...
mysql -u root -p < setup_database.sql

if %errorlevel% equ 0 (
    echo.
    echo ✅ ติดตั้งฐานข้อมูลสำเร็จ!
    echo.
    echo ข้อมูลการเข้าสู่ระบบ:
    echo Username: admin001
    echo Password: 123456
    echo.
    echo ฐานข้อมูล: ice_tracking
    echo Host: localhost
    echo Port: 3306
    echo.
) else (
    echo.
    echo ❌ การติดตั้งฐานข้อมูลล้มเหลว
    echo กรุณาตรวจสอบการตั้งค่า MySQL
    echo.
)

echo กด Enter เพื่อปิดหน้าต่าง...
pause >nul
