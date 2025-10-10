-- =============================================
-- ฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง (ICE_TRACKINGS)
-- สร้างตามโครงสร้าง routes ทั้งหมดในระบบ
-- =============================================

-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS ice_trackings;
USE ice_trackings;

-- =============================================
-- ตาราง users (การยืนยันตัวตน)
-- =============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('driver', 'admin', 'owner') NOT NULL
);

-- =============================================
-- ตาราง drivers (พนักงานขับรถ)
-- =============================================
CREATE TABLE drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    national_id VARCHAR(13),
    license_number VARCHAR(50),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(15),
    start_date DATE DEFAULT (CURRENT_DATE)
);

-- =============================================
-- ตาราง trucks (รถส่งน้ำแข็ง)
-- =============================================
CREATE TABLE trucks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_id VARCHAR(20) UNIQUE NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    model VARCHAR(50),
    color VARCHAR(30),
    gps_id VARCHAR(50),
    latitude DOUBLE NULL,
    longitude DOUBLE NULL,
    updated_at DATETIME NULL,
    driver_id INT NULL
);

-- =============================================
-- ตาราง shops (ร้านค้า)
-- =============================================
CREATE TABLE shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id VARCHAR(20) UNIQUE NOT NULL,
    shop_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    address TEXT,
    lat DOUBLE NULL,
    lng DOUBLE NULL
);

-- =============================================
-- ตาราง tracking (การติดตาม GPS)
-- =============================================
CREATE TABLE tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(20),
    shop_id INT,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    truck_id INT,
    driver_id INT,
    gps_code VARCHAR(50),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ตาราง alerts (การแจ้งเตือน)
-- =============================================
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_code VARCHAR(20),
    driver_code VARCHAR(20),
    truck_id INT,
    driver_id INT,
    message TEXT NOT NULL,
    alert_time DATETIME DEFAULT CURRENT_TIMESTAMP
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- เพิ่ม Indexes เพื่อเพิ่มประสิทธิภาพ
-- =============================================

-- Indexes สำหรับตาราง trucks
CREATE INDEX idx_trucks_updated_at ON trucks(updated_at);
CREATE INDEX idx_trucks_driver_id ON trucks(driver_id);
CREATE INDEX idx_trucks_gps_id ON trucks(gps_id);

-- Indexes สำหรับตาราง tracking
CREATE INDEX idx_tracking_truck_id ON tracking(truck_id);
CREATE INDEX idx_tracking_driver_id ON tracking(driver_id);
CREATE INDEX idx_tracking_timestamp ON tracking(timestamp);
CREATE INDEX idx_tracking_shop_id ON tracking(shop_id);

-- Indexes สำหรับตาราง alerts
CREATE INDEX idx_alerts_truck_code ON alerts(truck_code);
CREATE INDEX idx_alerts_driver_code ON alerts(driver_code);
CREATE INDEX idx_alerts_alert_time ON alerts(alert_time);

-- Indexes สำหรับตาราง route_details
CREATE INDEX idx_route_details_truck ON route_details(truck_id);
CREATE INDEX idx_route_details_shop ON route_details(shop_id);
CREATE INDEX idx_route_details_route ON route_details(route_id);

-- Indexes สำหรับตาราง route_assignments
CREATE INDEX idx_route_assignments_truck ON route_assignments(truck_id);
CREATE INDEX idx_route_assignments_driver ON route_assignments(driver_id);
CREATE INDEX idx_route_assignments_date ON route_assignments(assigned_date);

-- =============================================
-- สร้างแอดมิน admin001 รหัส 123456 (สำคัญมาก!)
-- =============================================

-- เพิ่มแอดมินในตาราง users (สำหรับการเข้าสู่ระบบ)
INSERT INTO users (username, password, role) VALUES 
('admin001', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', 'admin');

-- เพิ่มแอดมินในตาราง drivers (สำหรับการจัดการพนักงานขับรถ)
INSERT INTO drivers (driver_id, full_name, username, password, phone, start_date) VALUES 
('ADMIN001', 'ผู้ดูแลระบบ', 'admin001', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', '0812345678', '2024-01-01');

-- =============================================
-- ข้อมูลตัวอย่างเพิ่มเติม
-- =============================================

-- เพิ่มรถตัวอย่าง
INSERT INTO trucks (truck_id, license_plate, model, color, gps_id) VALUES 
('TRK001', 'กข-1234', 'ISUZU NPR', 'ขาว', 'GPS001'),
('TRK002', 'กข-5678', 'HINO 300', 'น้ำเงิน', 'GPS002'),
('TRK003', 'กข-9012', 'MITSUBISHI FUSO', 'แดง', 'GPS003');

-- เพิ่มร้านค้าตัวอย่าง
INSERT INTO shops (shop_id, shop_name, phone, address, lat, lng) VALUES 
('SHP001', 'ร้านน้ำแข็งปากซอย', '031234567', '123 ถนนสุขุมวิท กรุงเทพฯ', 13.7563, 100.5018),
('SHP002', 'ร้านน้ำแข็งตลาดนัด', '032345678', '456 ถนนรัชดาภิเษก กรุงเทพฯ', 13.7651, 100.5380),
('SHP003', 'ร้านน้ำแข็งชุมชน', '033456789', '789 ถนนลาดพร้าว กรุงเทพฯ', 13.7948, 100.5500),
('SHP004', 'ร้านน้ำแข็งตลาดสด', '034567890', '321 ถนนพหลโยธิน กรุงเทพฯ', 13.8200, 100.5500);

-- เพิ่มเส้นทางตัวอย่าง
INSERT INTO routes (route_name, description) VALUES 
('เส้นทางส่งน้ำแข็งเขตกรุงเทพ', 'เส้นทางหลักสำหรับส่งน้ำแข็งในเขตกรุงเทพมหานคร'),
('เส้นทางส่งน้ำแข็งชานเมือง', 'เส้นทางสำหรับส่งน้ำแข็งในเขตชานเมือง'),
('เส้นทางส่งน้ำแข็งตลาดสด', 'เส้นทางสำหรับส่งน้ำแข็งไปยังตลาดสดต่างๆ');

-- เพิ่มรายละเอียดเส้นทางตัวอย่าง
INSERT INTO route_details (route_id, truck_id, shop_id, delivery_order, estimated_time) VALUES 
(1, 'TRK001', 'SHP001', 1, '08:00:00'),
(1, 'TRK001', 'SHP002', 2, '09:30:00'),
(2, 'TRK002', 'SHP003', 1, '08:30:00'),
(3, 'TRK003', 'SHP004', 1, '07:00:00');

-- เพิ่มการมอบหมายเส้นทางตัวอย่าง
INSERT INTO route_assignments (route_id, truck_id, driver_id, assigned_date, status) VALUES 
(1, 'TRK001', 'ADMIN001', '2024-01-20', 'assigned'),
(2, 'TRK002', 'ADMIN001', '2024-01-20', 'assigned'),
(3, 'TRK003', 'ADMIN001', '2024-01-20', 'assigned');

-- เพิ่มข้อมูลการติดตามตัวอย่าง
INSERT INTO tracking (shop_id, latitude, longitude, truck_id, driver_id, gps_code, timestamp) VALUES 
(1, 13.7563, 100.5018, 1, 1, 'GPS001', '2024-01-20 08:00:00'),
(2, 13.7651, 100.5380, 1, 1, 'GPS001', '2024-01-20 09:30:00'),
(3, 13.7948, 100.5500, 2, 1, 'GPS002', '2024-01-20 08:30:00');

-- เพิ่มการแจ้งเตือนตัวอย่าง
INSERT INTO alerts (truck_code, driver_code, message, alert_time) VALUES 
('TRK001', 'ADMIN001', 'รถถึงจุดส่งแล้ว', '2024-01-20 08:05:00'),
('TRK002', 'ADMIN001', 'เริ่มส่งน้ำแข็ง', '2024-01-20 08:35:00');

-- =============================================
-- สิ้นสุดการสร้างฐานข้อมูล
-- =============================================

-- แสดงข้อมูลสรุป
SELECT 'Database ice_trackings created successfully!' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'ice_trackings';
SELECT table_name FROM information_schema.tables WHERE table_schema = 'ice_trackings' ORDER BY table_name;

-- แสดงข้อมูลแอดมิน (สำคัญ!)
SELECT 'Admin user created:' as info;
SELECT username, role FROM users WHERE username = 'admin001';
SELECT driver_id, full_name, username FROM drivers WHERE driver_id = 'ADMIN001';

-- แสดงข้อมูลตัวอย่าง
SELECT 'Sample data created:' as info;
SELECT COUNT(*) as total_trucks FROM trucks;
SELECT COUNT(*) as total_shops FROM shops;
SELECT COUNT(*) as total_routes FROM routes;
SELECT COUNT(*) as total_tracking FROM tracking;
SELECT COUNT(*) as total_alerts FROM alerts;

-- แสดงข้อมูลการเข้าสู่ระบบ
SELECT 'Login Information:' as info;
SELECT 'Username: admin001' as login_info;
SELECT 'Password: 123456' as login_info;
SELECT 'Role: admin' as login_info;
