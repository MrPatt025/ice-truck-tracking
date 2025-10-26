# ฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง (ICE TRUCK TRACKING SYSTEM)

## 📋 ภาพรวม

ฐานข้อมูลนี้ถูกออกแบบมาเพื่อรองรับระบบติดตามรถส่งน้ำแข็งที่สมบูรณ์ ทั้งเว็บแอปพลิเคชันและแอปมือถือ โดยครอบคลุมทุกฟีเจอร์ที่จำเป็นสำหรับการจัดการธุรกิจส่งน้ำแข็ง

## 🗂️ โครงสร้างตาราง

### 1. ตารางหลัก (Core Tables)

#### `users` - ผู้ใช้ระบบ

- **วัตถุประสงค์**: จัดการการยืนยันตัวตน
- **ฟิลด์สำคัญ**: username, password, role (admin/owner/driver)
- **ความสัมพันธ์**: เชื่อมโยงกับตารางอื่นๆ ผ่าน foreign key

#### `drivers` - พนักงานขับรถ

- **วัตถุประสงค์**: ข้อมูลพนักงานขับรถ
- **ฟิลด์สำคัญ**: driver_id, full_name, username, password, phone, status
- **ความสัมพันธ์**: เชื่อมโยงกับ trucks, tracking, alerts

#### `trucks` - รถส่งน้ำแข็ง

- **วัตถุประสงค์**: ข้อมูลรถและตำแหน่ง GPS ล่าสุด
- **ฟิลด์สำคัญ**: truck_id, license_plate, model, gps_id, latitude, longitude
- **ความสัมพันธ์**: เชื่อมโยงกับ drivers, tracking, routes

#### `shops` - ร้านค้า

- **วัตถุประสงค์**: ข้อมูลร้านค้าที่รับส่งน้ำแข็ง
- **ฟิลด์สำคัญ**: shop_id, shop_name, address, lat, lng, contact_person
- **ความสัมพันธ์**: เชื่อมโยงกับ routes, deliveries

### 2. ตารางการติดตาม (Tracking Tables)

#### `tracking` - การติดตาม GPS

- **วัตถุประสงค์**: บันทึกการติดตามตำแหน่งรถ
- **ฟิลด์สำคัญ**: truck_id, driver_id, latitude, longitude, timestamp
- **ความสัมพันธ์**: เชื่อมโยงกับ trucks, drivers, shops

#### `gps_logs` - บันทึก GPS

- **วัตถุประสงค์**: บันทึกข้อมูล GPS แบบละเอียด
- **ฟิลด์สำคัญ**: truck_id, latitude, longitude, speed, direction, battery_level
- **ความสัมพันธ์**: เชื่อมโยงกับ trucks

### 3. ตารางเส้นทาง (Route Tables)

#### `routes` - เส้นทางหลัก

- **วัตถุประสงค์**: จัดการเส้นทางส่งน้ำแข็ง
- **ฟิลด์สำคัญ**: route_name, description, status
- **ความสัมพันธ์**: เชื่อมโยงกับ route_details, route_assignments

#### `route_details` - รายละเอียดเส้นทาง

- **วัตถุประสงค์**: รายละเอียดการส่งสินค้าในแต่ละเส้นทาง
- **ฟิลด์สำคัญ**: route_id, truck_id, shop_id, delivery_order, estimated_time
- **ความสัมพันธ์**: เชื่อมโยงกับ routes, trucks, shops

#### `route_assignments` - การมอบหมายเส้นทาง

- **วัตถุประสงค์**: มอบหมายเส้นทางให้รถและคนขับ
- **ฟิลด์สำคัญ**: route_id, truck_id, driver_id, assigned_date, status
- **ความสัมพันธ์**: เชื่อมโยงกับ routes, trucks, drivers

### 4. ตารางการส่งสินค้า (Delivery Tables)

#### `deliveries` - การส่งสินค้า

- **วัตถุประสงค์**: ติดตามการส่งสินค้าแต่ละครั้ง
- **ฟิลด์สำคัญ**: delivery_code, truck_id, driver_id, shop_id, status, quantity
- **ความสัมพันธ์**: เชื่อมโยงกับ trucks, drivers, shops, route_details

### 5. ตารางการบำรุงรักษา (Maintenance Tables)

#### `maintenance` - การบำรุงรักษา

- **วัตถุประสงค์**: จัดการการบำรุงรักษารถ
- **ฟิลด์สำคัญ**: truck_id, maintenance_type, scheduled_date, cost, status
- **ความสัมพันธ์**: เชื่อมโยงกับ trucks

#### `fuel_logs` - บันทึกน้ำมัน

- **วัตถุประสงค์**: ติดตามการใช้น้ำมัน
- **ฟิลด์สำคัญ**: truck_id, driver_id, fuel_amount, fuel_cost, odometer_reading
- **ความสัมพันธ์**: เชื่อมโยงกับ trucks, drivers

### 6. ตารางการแจ้งเตือน (Alert Tables)

#### `alerts` - การแจ้งเตือน

- **วัตถุประสงค์**: จัดการการแจ้งเตือนต่างๆ
- **ฟิลด์สำคัญ**: truck_id, driver_id, type, message, priority, is_read
- **ความสัมพันธ์**: เชื่อมโยงกับ trucks, drivers

#### `notifications` - การแจ้งเตือนระบบ

- **วัตถุประสงค์**: แจ้งเตือนผู้ใช้ระบบ
- **ฟิลด์สำคัญ**: user_id, title, message, type, is_read
- **ความสัมพันธ์**: เชื่อมโยงกับ users

### 7. ตารางการตั้งค่า (Settings Tables)

#### `system_settings` - การตั้งค่าระบบ

- **วัตถุประสงค์**: เก็บการตั้งค่าระบบ
- **ฟิลด์สำคัญ**: setting_key, setting_value, description, category
- **ความสัมพันธ์**: เชื่อมโยงกับ users

## 🔗 ความสัมพันธ์ระหว่างตาราง

### ความสัมพันธ์หลัก

- `drivers` ←→ `trucks` (One-to-One)
- `trucks` ←→ `tracking` (One-to-Many)
- `trucks` ←→ `gps_logs` (One-to-Many)
- `routes` ←→ `route_details` (One-to-Many)
- `routes` ←→ `route_assignments` (One-to-Many)
- `trucks` ←→ `deliveries` (One-to-Many)
- `trucks` ←→ `maintenance` (One-to-Many)
- `trucks` ←→ `fuel_logs` (One-to-Many)
- `trucks` ←→ `alerts` (One-to-Many)

### ความสัมพันธ์รอง

- `shops` ←→ `route_details` (One-to-Many)
- `shops` ←→ `deliveries` (One-to-Many)
- `drivers` ←→ `tracking` (One-to-Many)
- `drivers` ←→ `deliveries` (One-to-Many)
- `drivers` ←→ `fuel_logs` (One-to-Many)
- `users` ←→ `notifications` (One-to-Many)

## 📊 Indexes และ Performance

### Indexes หลัก

- **Primary Keys**: ทุกตารางมี primary key
- **Foreign Keys**: ทุก foreign key มี index
- **Timestamp Indexes**: สำหรับการค้นหาตามเวลา
- **Status Indexes**: สำหรับการกรองตามสถานะ
- **GPS Indexes**: สำหรับการค้นหาตำแหน่ง

### Indexes เพิ่มเติม

- `idx_trucks_updated_at`: สำหรับการค้นหารถที่อัปเดตล่าสุด
- `idx_tracking_timestamp`: สำหรับการค้นหาการติดตามตามเวลา
- `idx_alerts_priority`: สำหรับการเรียงลำดับการแจ้งเตือน
- `idx_deliveries_status`: สำหรับการกรองการส่งสินค้าตามสถานะ

## 🚀 การใช้งาน

### 1. การติดตั้งฐานข้อมูล

```sql
-- รันไฟล์หลัก
SOURCE complete_ice_tracking_system.sql;

-- รันไฟล์ข้อมูลตัวอย่าง
SOURCE sample_data_extended.sql;
```

### 2. การเข้าถึงข้อมูล

#### ดึงข้อมูลรถทั้งหมด

```sql
SELECT * FROM trucks WHERE status = 'active';
```

#### ดึงตำแหน่งล่าสุดของรถ

```sql
SELECT t.*, d.full_name as driver_name
FROM trucks t
LEFT JOIN drivers d ON t.driver_id = d.id
WHERE t.latitude IS NOT NULL
ORDER BY t.updated_at DESC;
```

#### ดึงการแจ้งเตือนที่ยังไม่อ่าน

```sql
SELECT * FROM alerts
WHERE is_read = FALSE
ORDER BY priority DESC, alert_time DESC;
```

#### ดึงเส้นทางของรถคันใดคันหนึ่ง

```sql
SELECT rd.*, r.route_name, s.shop_name, s.address
FROM route_details rd
JOIN routes r ON rd.route_id = r.id
JOIN shops s ON rd.shop_id = s.shop_id
WHERE rd.truck_id = 'TRK001'
ORDER BY rd.delivery_order;
```

## 🔧 การบำรุงรักษา

### 1. การสำรองข้อมูล

- สำรองข้อมูลทุกวัน
- เก็บข้อมูลสำรองไว้ 30 วัน
- ทดสอบการกู้คืนข้อมูลเป็นประจำ

### 2. การทำความสะอาดข้อมูล

- ลบข้อมูล GPS logs เก่า (มากกว่า 90 วัน)
- ลบข้อมูล tracking เก่า (มากกว่า 180 วัน)
- อัปเดตสถิติตารางเป็นประจำ

### 3. การตรวจสอบประสิทธิภาพ

- ตรวจสอบ slow queries เป็นประจำ
- วิเคราะห์การใช้ indexes
- ปรับปรุงโครงสร้างตารางตามความจำเป็น

## 📈 การขยายระบบ

### 1. การเพิ่มฟีเจอร์ใหม่

- เพิ่มตารางใหม่ตามความต้องการ
- อัปเดต indexes และ constraints
- ทดสอบความเข้ากันได้กับระบบเดิม

### 2. การปรับปรุงประสิทธิภาพ

- เพิ่ม indexes ตามความจำเป็น
- ปรับปรุงโครงสร้างตาราง
- ใช้ partitioning สำหรับตารางขนาดใหญ่

### 3. การเพิ่มข้อมูล

- เพิ่มข้อมูลตัวอย่างใหม่
- อัปเดตข้อมูลการตั้งค่า
- เพิ่มข้อมูลการทดสอบ

## 🛡️ ความปลอดภัย

### 1. การควบคุมการเข้าถึง

- ใช้ role-based access control
- จำกัดการเข้าถึงข้อมูลตามสิทธิ์
- บันทึกการเข้าถึงข้อมูล

### 2. การป้องกันข้อมูล

- เข้ารหัสรหัสผ่าน
- ใช้ HTTPS สำหรับการเชื่อมต่อ
- ตรวจสอบข้อมูลที่รับเข้า

### 3. การสำรองข้อมูล

- สำรองข้อมูลเป็นประจำ
- เก็บข้อมูลสำรองในที่ปลอดภัย
- ทดสอบการกู้คืนข้อมูล

## 📞 การสนับสนุน

หากมีปัญหาหรือข้อสงสัยเกี่ยวกับฐานข้อมูล กรุณาติดต่อทีมพัฒนา หรือดูเอกสารเพิ่มเติมในโฟลเดอร์ `database/`

---

**หมายเหตุ**: ฐานข้อมูลนี้ถูกออกแบบมาเพื่อรองรับระบบติดตามรถส่งน้ำแข็งที่สมบูรณ์ และสามารถปรับปรุงได้ตามความต้องการของธุรกิจ
