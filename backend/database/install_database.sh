#!/bin/bash

echo "============================================="
echo "สคริปต์ติดตั้งฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง"
echo "============================================="
echo

echo "กำลังติดตั้งฐานข้อมูล..."
echo

# ตรวจสอบว่า MySQL ทำงานอยู่หรือไม่
echo "ตรวจสอบการเชื่อมต่อ MySQL..."
if ! command -v mysql &> /dev/null; then
    echo "❌ ไม่พบ MySQL หรือ MySQL ไม่ได้ติดตั้ง"
    echo "กรุณาติดตั้ง MySQL ก่อน"
    exit 1
fi

echo "✅ พบ MySQL"
echo

# รันสคริปต์สร้างฐานข้อมูล
echo "กำลังสร้างฐานข้อมูลและตาราง..."
mysql -u root -p < setup_database.sql

if [ $? -eq 0 ]; then
    echo
    echo "✅ ติดตั้งฐานข้อมูลสำเร็จ!"
    echo
    echo "ข้อมูลการเข้าสู่ระบบ:"
    echo "Username: admin001"
    echo "Password: 123456"
    echo
    echo "ฐานข้อมูล: ice_tracking"
    echo "Host: localhost"
    echo "Port: 3306"
    echo
else
    echo
    echo "❌ การติดตั้งฐานข้อมูลล้มเหลว"
    echo "กรุณาตรวจสอบการตั้งค่า MySQL"
    echo
fi

echo "กด Enter เพื่อปิดหน้าต่าง..."
read
