# ฐานข้อมูลเดิมระบบติดตามรถส่งน้ำแข็ง (ORIGINAL DATABASE)

## ไฟล์ฐานข้อมูล

### `original_ice_tracking_database.sql`
ไฟล์หลักสำหรับสร้างฐานข้อมูลเดิมตามโครงสร้าง backend ที่มีอยู่

## โครงสร้างตาราง (9 ตาราง)

### ตารางหลัก
1. **users** - ผู้ใช้ระบบ (admin, owner, driver)
2. **drivers** - พนักงานขับรถ
3. **trucks** - รถส่งน้ำแข็ง
4. **shops** - ร้านค้า
5. **tracking** - การติดตาม GPS
6. **alerts** - การแจ้งเตือน
7. **routes** - เส้นทางหลัก
8. **route_details** - รายละเอียดเส้นทาง
9. **route_assignments** - การมอบหมายเส้นทาง

## แอดมิน 1 คนสำหรับทำงานทุกระบบ

### ข้อมูลแอดมิน
- **Username:** `admin`
- **Password:** `admin123` (เข้ารหัสด้วย bcrypt)
- **Role:** `admin`
- **Driver Code:** `ADMIN001`
- **Full Name:** `ผู้ดูแลระบบ`
- **Phone:** `0812345678`

### สิทธิ์การทำงาน
แอดมินสามารถทำงานได้ทุกอย่างในระบบ:
- จัดการผู้ใช้ (users)
- จัดการพนักงานขับรถ (drivers)
- จัดการรถ (trucks)
- จัดการร้านค้า (shops)
- ดูข้อมูลการติดตาม (tracking)
- จัดการการแจ้งเตือน (alerts)
- จัดการเส้นทาง (routes)
- มอบหมายงาน (route_assignments)

## วิธีการใช้งาน

### สร้างฐานข้อมูลใหม่
```sql
-- รันไฟล์หลัก
SOURCE backend/database/original_ice_tracking_database.sql;
```

### เข้าสู่ระบบแอดมิน
```
Username: admin
Password: admin123
```

## ข้อมูลตัวอย่าง

### รถ
- TRK001 - กข-1234 (ISUZU NPR)
- TRK002 - กข-5678 (HINO 300)

### ร้านค้า
- SHP001 - ร้านน้ำแข็งปากซอย
- SHP002 - ร้านน้ำแข็งตลาดนัด
- SHP003 - ร้านน้ำแข็งชุมชน

### เส้นทาง
- เส้นทางส่งน้ำแข็งเขตกรุงเทพ
- เส้นทางส่งน้ำแข็งชานเมือง

## ความแตกต่างจากฐานข้อมูลใหม่

### โครงสร้างเดิม
- ใช้ `truck_code` แทน `truck_id`
- ใช้ `shop_code` แทน `shop_id`
- ใช้ `driver_code` แทน `driver_id`
- ใช้ `plate_number` แทน `license_plate`
- ใช้ `latitude/longitude` แทน `lat/lng`

### ไม่มี Foreign Key Constraints
- ไม่มี foreign key relationships
- ใช้ UNIQUE KEY แทน
- เหมาะสำหรับการพัฒนาและทดสอบ

## หมายเหตุ

- ฐานข้อมูลนี้สร้างตามโครงสร้าง backend ที่มีอยู่
- แอดมิน 1 คนสามารถทำงานได้ทุกอย่าง
- มีข้อมูลตัวอย่างพร้อมใช้งาน
- ไม่มี foreign key constraints เพื่อความยืดหยุ่น
