# ฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง (ICE TRUCK TRACKING DATABASE)

## ไฟล์ฐานข้อมูล

### 1. `complete_ice_tracking_database.sql`
ไฟล์หลักสำหรับสร้างฐานข้อมูลทั้งหมด ประกอบด้วย:
- สร้างฐานข้อมูล `ice_tracking`
- สร้างตารางทั้งหมด 10 ตาราง
- สร้าง indexes เพื่อเพิ่มประสิทธิภาพ
- เพิ่มข้อมูลตัวอย่าง (sample data)

### 2. `reset_database.sql`
ไฟล์สำหรับรีเซ็ตฐานข้อมูล:
- ลบตารางทั้งหมด
- ใช้สำหรับเริ่มต้นใหม่

### 3. ไฟล์อื่นๆ
- `ice_tracking.sql` - ไฟล์เดิม (พื้นฐาน)
- `route_management.sql` - ตารางจัดการเส้นทาง
- `add_tracking_columns.sql` - เพิ่มคอลัมน์ GPS
- `migration_update_alerts.sql` - อัปเดตตารางแจ้งเตือน

## โครงสร้างตาราง

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
10. **gps_logs** - บันทึก GPS

## วิธีการใช้งาน

### สร้างฐานข้อมูลใหม่
```sql
-- รันไฟล์หลัก
SOURCE backend/database/complete_ice_tracking_database.sql;
```

### รีเซ็ตฐานข้อมูล
```sql
-- รีเซ็ตฐานข้อมูล
SOURCE backend/database/reset_database.sql;

-- สร้างใหม่
SOURCE backend/database/complete_ice_tracking_database.sql;
```

### ตรวจสอบฐานข้อมูล
```sql
-- ดูตารางทั้งหมด
SHOW TABLES;

-- ดูโครงสร้างตาราง
DESCRIBE users;
DESCRIBE drivers;
DESCRIBE trucks;
-- ... ฯลฯ
```

## ข้อมูลตัวอย่าง

### ผู้ใช้
- **admin** / password: admin123
- **owner** / password: owner123
- **driver1** / password: driver123
- **driver2** / password: driver123

### รถ
- TRK001 - กข-1234 (ISUZU NPR)
- TRK002 - กข-5678 (HINO 300)

### ร้านค้า
- SHP001 - ร้านน้ำแข็งปากซอย
- SHP002 - ร้านน้ำแข็งตลาดนัด
- SHP003 - ร้านน้ำแข็งชุมชน

## Foreign Key Relationships

```
users (1) ←→ (1) drivers
drivers (1) ←→ (N) trucks
trucks (1) ←→ (N) tracking
shops (1) ←→ (N) tracking
routes (1) ←→ (N) route_details
routes (1) ←→ (N) route_assignments
trucks (1) ←→ (N) route_details
shops (1) ←→ (N) route_details
drivers (1) ←→ (N) route_assignments
```

## Indexes

ฐานข้อมูลมี indexes สำหรับ:
- การค้นหาตาม truck_id, driver_id
- การเรียงลำดับตาม timestamp
- การค้นหาตามสถานะ (status)
- การค้นหาตามวันที่ (assigned_date)

## หมายเหตุ

- ฐานข้อมูลใช้ charset `utf8mb4` และ collation `utf8mb4_general_ci`
- รหัสผ่านถูกเข้ารหัสด้วย bcrypt
- มีการบันทึก created_at และ updated_at อัตโนมัติ
- ใช้ foreign key constraints เพื่อความถูกต้องของข้อมูล
