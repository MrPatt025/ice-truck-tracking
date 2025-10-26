# คู่มือการติดตั้งฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง

## 📋 ข้อมูลการเข้าสู่ระบบ Admin

- **Username**: `admin001`
- **Password**: `123456`
- **Role**: `admin`

## 🚀 วิธีติดตั้งฐานข้อมูล

### วิธีที่ 1: ใช้สคริปต์อัตโนมัติ (แนะนำ)

#### สำหรับ Windows:

```bash
# ดับเบิลคลิกไฟล์
install_database.bat
```

#### สำหรับ Linux/Mac:

```bash
# ให้สิทธิ์การรัน
chmod +x install_database.sh

# รันสคริปต์
./install_database.sh
```

### วิธีที่ 2: รันด้วยตนเอง

#### 1. เปิด MySQL Command Line

```bash
mysql -u root -p
```

#### 2. รันสคริปต์สร้างฐานข้อมูล

```sql
SOURCE setup_database.sql;
```

#### 3. ตรวจสอบการติดตั้ง

```sql
USE ice_tracking;
SHOW TABLES;
SELECT * FROM users WHERE username = 'admin001';
```

## 📊 ข้อมูลฐานข้อมูล

### การตั้งค่า

- **Database Name**: `ice_tracking`
- **Host**: `localhost`
- **Port**: `3306`
- **User**: `root`
- **Password**: (ตามที่ตั้งไว้)

### ตารางที่สร้าง

1. `users` - ผู้ใช้ระบบ
2. `drivers` - พนักงานขับรถ
3. `trucks` - รถส่งน้ำแข็ง
4. `shops` - ร้านค้า
5. `tracking` - การติดตาม GPS
6. `alerts` - การแจ้งเตือน
7. `routes` - เส้นทางหลัก
8. `route_details` - รายละเอียดเส้นทาง
9. `route_assignments` - การมอบหมายเส้นทาง
10. `gps_logs` - บันทึก GPS
11. `deliveries` - การส่งสินค้า
12. `maintenance` - การบำรุงรักษา
13. `fuel_logs` - บันทึกน้ำมัน
14. `notifications` - การแจ้งเตือนระบบ
15. `system_settings` - การตั้งค่าระบบ

### ข้อมูลตัวอย่าง

- **ผู้ใช้**: 1 คน (admin001)
- **พนักงานขับรถ**: 4 คน
- **รถ**: 4 คัน
- **ร้านค้า**: 6 ร้าน
- **เส้นทาง**: 4 เส้นทาง
- **การส่งสินค้า**: 5 รายการ
- **การบำรุงรักษา**: 3 รายการ
- **บันทึกน้ำมัน**: 3 รายการ
- **การแจ้งเตือน**: 3 รายการ

## 🔧 การตั้งค่า Backend

### 1. ตรวจสอบไฟล์ .env

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ice_tracking

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here_123456

# Server Configuration
PORT=5000
```

### 2. ติดตั้ง Dependencies

```bash
cd backend
npm install
```

### 3. เริ่มต้น Server

```bash
npm start
```

## 🧪 การทดสอบ

### 1. ทดสอบการเชื่อมต่อฐานข้อมูล

```bash
# เปิด MySQL
mysql -u root -p

# เลือกฐานข้อมูล
USE ice_tracking;

# ตรวจสอบตาราง
SHOW TABLES;

# ตรวจสอบผู้ใช้ admin
SELECT * FROM users WHERE username = 'admin001';
```

### 2. ทดสอบ API

```bash
# ทดสอบการเข้าสู่ระบบ
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin001","password":"123456"}'
```

### 3. ทดสอบ Frontend

- เปิดเว็บแอปพลิเคชัน
- เข้าสู่ระบบด้วย admin001 / 123456
- ตรวจสอบฟีเจอร์ต่างๆ

## 🛠️ การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

#### 1. MySQL ไม่ทำงาน

```bash
# เริ่มต้น MySQL service
# Windows
net start mysql

# Linux/Mac
sudo systemctl start mysql
# หรือ
sudo service mysql start
```

#### 2. ไม่สามารถเชื่อมต่อฐานข้อมูลได้

- ตรวจสอบการตั้งค่าในไฟล์ `.env`
- ตรวจสอบว่า MySQL ทำงานอยู่
- ตรวจสอบ username และ password

#### 3. ตารางไม่ถูกสร้าง

- ตรวจสอบสิทธิ์ของ MySQL user
- รันสคริปต์ใหม่
- ตรวจสอบ error log

#### 4. ไม่สามารถเข้าสู่ระบบได้

- ตรวจสอบ username และ password
- ตรวจสอบการ hash password
- ตรวจสอบ JWT secret

## 📞 การสนับสนุน

หากมีปัญหาหรือข้อสงสัย:

1. ตรวจสอบ log ของ MySQL
2. ตรวจสอบ log ของ Node.js
3. ดูเอกสารเพิ่มเติมในโฟลเดอร์ `database/`

## 🔄 การอัปเดต

### อัปเดตฐานข้อมูล

```sql
-- รันสคริปต์ใหม่
SOURCE setup_database.sql;
```

### อัปเดตข้อมูลตัวอย่าง

```sql
-- เพิ่มข้อมูลใหม่
SOURCE sample_data_extended.sql;
```

---

**หมายเหตุ**: ฐานข้อมูลนี้ถูกออกแบบมาเพื่อรองรับระบบติดตามรถส่งน้ำแข็งที่สมบูรณ์ และสามารถปรับปรุงได้ตามความต้องการของธุรกิจ
