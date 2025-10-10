# ฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง (ICE_TRACKINGS)

## ไฟล์ฐานข้อมูล

### `ice_trackings_database.sql`
ไฟล์หลักสำหรับสร้างฐานข้อมูล `ice_trackings` ตามโครงสร้าง routes ทั้งหมดในระบบ

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

## แอดมิน admin001 รหัส 123456 (สำคัญมาก!)

### ข้อมูลแอดมิน
- **Username:** `admin001`
- **Password:** `123456` (เข้ารหัสด้วย bcrypt)
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
SOURCE backend/database/ice_trackings_database.sql;
```

### เข้าสู่ระบบแอดมิน
```
Username: admin001
Password: 123456
```

## ข้อมูลตัวอย่าง

### รถ (3 คัน)
- TRK001 - กข-1234 (ISUZU NPR)
- TRK002 - กข-5678 (HINO 300)
- TRK003 - กข-9012 (MITSUBISHI FUSO)

### ร้านค้า (4 ร้าน)
- SHP001 - ร้านน้ำแข็งปากซอย
- SHP002 - ร้านน้ำแข็งตลาดนัด
- SHP003 - ร้านน้ำแข็งชุมชน
- SHP004 - ร้านน้ำแข็งตลาดสด

### เส้นทาง (3 เส้นทาง)
- เส้นทางส่งน้ำแข็งเขตกรุงเทพ
- เส้นทางส่งน้ำแข็งชานเมือง
- เส้นทางส่งน้ำแข็งตลาดสด

### ข้อมูลการติดตาม
- มีข้อมูลการติดตามตัวอย่าง 3 รายการ
- มีการแจ้งเตือนตัวอย่าง 2 รายการ

## โครงสร้างตาม Routes

### auth.route.js
- ตาราง `users` - สำหรับการยืนยันตัวตน
- ตาราง `drivers` - สำหรับการยืนยันตัวตนพนักงานขับรถ

### driver.route.js
- ตาราง `drivers` - จัดการพนักงานขับรถ
- ฟิลด์: `driver_id`, `full_name`, `national_id`, `license_number`, `username`, `password`, `address`, `phone`, `start_date`

### truck.route.js
- ตาราง `trucks` - จัดการรถ
- ฟิลด์: `truck_id`, `license_plate`, `model`, `color`, `gps_id`

### shop.route.js
- ตาราง `shops` - จัดการร้านค้า
- ฟิลด์: `shop_id`, `shop_name`, `phone`, `address`, `lat`, `lng`

### tracking.route.js
- ตาราง `tracking` - การติดตาม GPS
- ฟิลด์: `shop_id`, `latitude`, `longitude`, `truck_id`, `driver_id`, `gps_code`, `timestamp`

### alert.route.js
- ตาราง `alerts` - การแจ้งเตือน
- ฟิลด์: `truck_code`, `driver_code`, `message`, `alert_time`

### gps.route.js
- ตาราง `trucks` - อัปเดตพิกัด GPS
- ฟิลด์: `latitude`, `longitude`, `updated_at`

### route.route.js
- ตาราง `routes` - เส้นทางหลัก
- ตาราง `route_details` - รายละเอียดเส้นทาง
- ตาราง `route_assignments` - การมอบหมายเส้นทาง

### adminManagement.routes.js
- จัดการข้อมูลทั้งหมด (drivers, trucks, shops)
- ใช้ฟิลด์เดียวกันกับ routes อื่นๆ

## Indexes

ฐานข้อมูลมี indexes สำหรับ:
- การค้นหาตาม truck_id, driver_id
- การเรียงลำดับตาม timestamp
- การค้นหาตามสถานะ (status)
- การค้นหาตามวันที่ (assigned_date)

## หมายเหตุสำคัญ

- **ฐานข้อมูลนี้สร้างตามโครงสร้าง routes ทั้งหมดในระบบ**
- **แอดมิน admin001 สามารถทำงานได้ทุกอย่าง**
- **มีข้อมูลตัวอย่างพร้อมใช้งาน**
- **มี indexes เพื่อเพิ่มประสิทธิภาพ**
- **รหัสผ่านถูกเข้ารหัสด้วย bcrypt**
- **ชื่อฐานข้อมูล: ice_trackings**
- **แอดมินอยู่ในตาราง users และ drivers**

## การเข้าสู่ระบบ

```
Username: admin001
Password: 123456
Role: admin
```

**สำคัญ:** หากไม่มีแอดมิน จะไม่สามารถทำงานได้ เพราะแอดมินเป็นคนเดียวที่สามารถจัดการข้อมูลทั้งหมดในระบบได้
