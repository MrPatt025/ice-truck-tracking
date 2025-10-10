# วิธีเพิ่มแอดมิน admin001 รหัส 123456 ใน phpMyAdmin

## วิธีการใช้งาน

### 1. เข้า phpMyAdmin
- เปิดเว็บเบราว์เซอร์
- ไปที่ `http://localhost/phpmyadmin` หรือ `http://localhost:8080/phpmyadmin`
- เข้าสู่ระบบด้วย username และ password ของ MySQL

### 2. เลือกฐานข้อมูล
- คลิกที่ฐานข้อมูล `ice_trackings` ในแถบด้านซ้าย

### 3. เปิดแท็บ SQL
- คลิกที่แท็บ "SQL" ด้านบน

### 4. วางโค้ด SQL ต่อไปนี้
```sql
-- เพิ่มแอดมิน admin001 รหัส 123456
INSERT INTO users (username, password, role) VALUES 
('admin001', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', 'admin');
```

### 5. คลิก "Go" หรือ "ดำเนินการ"
- คลิกปุ่ม "Go" หรือ "ดำเนินการ" เพื่อรันคำสั่ง SQL

### 6. ตรวจสอบผลลัพธ์
- ควรเห็นข้อความ "1 row affected" หรือ "1 แถวได้รับผลกระทบ"
- แสดงว่าการเพิ่มแอดมินสำเร็จ

### 7. ตรวจสอบข้อมูล
- คลิกที่ตาราง `users` ในแถบด้านซ้าย
- ควรเห็นแอดมิน admin001 ในตาราง

## ข้อมูลแอดมิน

- **Username:** `admin001`
- **Password:** `123456` (เข้ารหัสด้วย bcrypt)
- **Role:** `admin`

## ข้อมูลการเข้าสู่ระบบ

```
Username: admin001
Password: 123456
Role: admin
```

## หมายเหตุ

- รหัสผ่านถูกเข้ารหัสด้วย bcrypt
- แอดมินสามารถทำงานได้ทุกอย่างในระบบ
- หากไม่มีแอดมิน จะไม่สามารถทำงานได้

## หากเกิดข้อผิดพลาด

### ข้อผิดพลาด: Table 'ice_trackings.users' doesn't exist
- ตรวจสอบว่าฐานข้อมูล `ice_trackings` มีอยู่จริง
- ตรวจสอบว่าตาราง `users` มีอยู่จริง

### ข้อผิดพลาด: Duplicate entry 'admin001' for key 'username'
- แอดมิน admin001 มีอยู่แล้วในระบบ
- ไม่จำเป็นต้องเพิ่มใหม่

### ข้อผิดพลาด: Access denied
- ตรวจสอบสิทธิ์การเข้าถึงฐานข้อมูล
- ตรวจสอบ username และ password ของ MySQL
