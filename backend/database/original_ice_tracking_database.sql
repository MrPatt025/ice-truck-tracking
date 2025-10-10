    -- =============================================
-- ฐานข้อมูลเดิมระบบติดตามรถส่งน้ำแข็ง (ICE TRUCK TRACKING)
-- สร้างตามโครงสร้าง backend ที่มีอยู่
-- =============================================

-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS ice_tracking;
USE ice_tracking;

-- =============================================
-- ตาราง users (การยืนยันตัวตน)
-- =============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    role ENUM('driver', 'admin', 'owner')
);

-- =============================================
-- ตาราง drivers (พนักงานขับรถ)
-- =============================================
CREATE TABLE drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_code VARCHAR(20),
    full_name VARCHAR(100),
    national_id VARCHAR(13),
    license_number VARCHAR(50),
    username VARCHAR(50),
    address TEXT,
    phone VARCHAR(15),
    start_date DATE
);

-- =============================================
-- ตาราง trucks (รถส่งน้ำแข็ง)
-- =============================================
CREATE TABLE trucks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_code VARCHAR(20),
    plate_number VARCHAR(20),
    model VARCHAR(50),
    color VARCHAR(30),
    gps_code VARCHAR(50)
);

-- =============================================
-- ตาราง shops (ร้านค้า)
-- =============================================
CREATE TABLE shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_code VARCHAR(20),
    shop_name VARCHAR(100),
    phone VARCHAR(15),
    address TEXT,
    latitude DOUBLE,
    longitude DOUBLE
);

-- =============================================
-- ตาราง tracking (การติดตาม GPS)
-- =============================================
CREATE TABLE tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(20),
    shop_id INT,
    latitude DOUBLE,
    longitude DOUBLE,
    truck_id INT,
    driver_id INT,
    gps_code VARCHAR(50),
    timestamp DATETIME
);

-- =============================================
-- ตาราง alerts (การแจ้งเตือน)
-- =============================================
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_id INT,
    driver_id INT,
    message TEXT,
    alert_time DATETIME
);

-- =============================================
-- ตาราง routes (เส้นทางหลัก)
-- =============================================
CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- ตาราง route_details (รายละเอียดเส้นทาง)
-- =============================================
CREATE TABLE route_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    truck_id VARCHAR(20) NOT NULL,
    shop_id VARCHAR(20) NOT NULL,
    delivery_order INT NOT NULL,
    estimated_time TIME,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_route_truck_shop (route_id, truck_id, shop_id)
);

-- =============================================
-- ตาราง route_assignments (การมอบหมายเส้นทาง)
-- =============================================
CREATE TABLE route_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    truck_id VARCHAR(20) NOT NULL,
    driver_id VARCHAR(20),
    assigned_date DATE NOT NULL,
    status ENUM('assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'assigned',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_route_truck_date (route_id, truck_id, assigned_date)
);

-- =============================================
-- เพิ่ม Indexes เพื่อเพิ่มประสิทธิภาพ
-- =============================================
CREATE INDEX idx_route_details_truck ON route_details(truck_id);
CREATE INDEX idx_route_details_shop ON route_details(shop_id);
CREATE INDEX idx_route_assignments_truck ON route_assignments(truck_id);
CREATE INDEX idx_route_assignments_driver ON route_assignments(driver_id);
CREATE INDEX idx_route_assignments_date ON route_assignments(assigned_date);

-- =============================================
-- เพิ่มแอดมิน 1 คนสำหรับทำงานทุกระบบ
-- =============================================

-- เพิ่มแอดมินในตาราง users
INSERT INTO users (username, password, role) VALUES 
('admin', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', 'admin');

-- เพิ่มแอดมินในตาราง drivers (สำหรับการจัดการพนักงานขับรถ)
INSERT INTO drivers (driver_code, full_name, username, phone, start_date) VALUES 
('ADMIN001', 'ผู้ดูแลระบบ', 'admin', '0812345678', '2024-01-01');

-- =============================================
-- ข้อมูลตัวอย่างเพิ่มเติม
-- =============================================

-- เพิ่มรถตัวอย่าง
INSERT INTO trucks (truck_code, plate_number, model, color, gps_code) VALUES 
('TRK001', 'กข-1234', 'ISUZU NPR', 'ขาว', 'GPS001'),
('TRK002', 'กข-5678', 'HINO 300', 'น้ำเงิน', 'GPS002');

-- เพิ่มร้านค้าตัวอย่าง
INSERT INTO shops (shop_code, shop_name, phone, address, latitude, longitude) VALUES 
('SHP001', 'ร้านน้ำแข็งปากซอย', '031234567', '123 ถนนสุขุมวิท กรุงเทพฯ', 13.7563, 100.5018),
('SHP002', 'ร้านน้ำแข็งตลาดนัด', '032345678', '456 ถนนรัชดาภิเษก กรุงเทพฯ', 13.7651, 100.5380),
('SHP003', 'ร้านน้ำแข็งชุมชน', '033456789', '789 ถนนลาดพร้าว กรุงเทพฯ', 13.7948, 100.5500);

-- เพิ่มเส้นทางตัวอย่าง
INSERT INTO routes (route_name, description) VALUES 
('เส้นทางส่งน้ำแข็งเขตกรุงเทพ', 'เส้นทางหลักสำหรับส่งน้ำแข็งในเขตกรุงเทพมหานคร'),
('เส้นทางส่งน้ำแข็งชานเมือง', 'เส้นทางสำหรับส่งน้ำแข็งในเขตชานเมือง');

-- เพิ่มรายละเอียดเส้นทางตัวอย่าง
INSERT INTO route_details (route_id, truck_id, shop_id, delivery_order, estimated_time) VALUES 
(1, 'TRK001', 'SHP001', 1, '08:00:00'),
(1, 'TRK001', 'SHP002', 2, '09:30:00'),
(2, 'TRK002', 'SHP003', 1, '08:30:00');

-- เพิ่มการมอบหมายเส้นทางตัวอย่าง
INSERT INTO route_assignments (route_id, truck_id, driver_id, assigned_date, status) VALUES 
(1, 'TRK001', 'ADMIN001', '2024-01-20', 'assigned'),
(2, 'TRK002', 'ADMIN001', '2024-01-20', 'assigned');

-- =============================================
-- สิ้นสุดการสร้างฐานข้อมูล
-- =============================================

-- แสดงข้อมูลสรุป
SELECT 'Database created successfully!' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'ice_tracking';
SELECT table_name FROM information_schema.tables WHERE table_schema = 'ice_tracking' ORDER BY table_name;

-- แสดงข้อมูลแอดมิน
SELECT 'Admin user created:' as info;
SELECT username, role FROM users WHERE role = 'admin';
SELECT driver_code, full_name, username FROM drivers WHERE driver_code = 'ADMIN001';
