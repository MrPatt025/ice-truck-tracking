-- =============================================
-- ฐานข้อมูลระบบติดตามรถส่งน้ำแข็ง (ICE TRUCK TRACKING SYSTEM)
-- สร้างจากโค้ดในระบบทั้งหมด - เวอร์ชันสมบูรณ์
-- =============================================

-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS ice_tracking;
USE ice_tracking;

-- =============================================
-- ตาราง users (การยืนยันตัวตน)
-- =============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('driver', 'admin', 'owner') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    start_date DATE DEFAULT (CURRENT_DATE),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    driver_id INT NULL,
    status ENUM('active', 'maintenance', 'inactive') DEFAULT 'active',
    fuel_capacity DECIMAL(5,2),
    max_load DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
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
    lng DOUBLE NULL,
    contact_person VARCHAR(100),
    delivery_instructions TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    speed DECIMAL(5,2),
    direction DECIMAL(5,2),
    altitude DECIMAL(8,2),
    accuracy DECIMAL(8,2),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL,
    FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
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
    type ENUM('off_route', 'idle_too_long', 'speed_exceeded', 'maintenance_due', 'manual', 'emergency', 'fuel_low') DEFAULT 'manual',
    message TEXT NOT NULL,
    alert_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    location_data JSON,
    resolved_at DATETIME NULL,
    resolved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- ตาราง routes (เส้นทางหลัก)
-- =============================================
CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
    estimated_duration INT, -- นาที
    distance DECIMAL(8,2), -- กิโลเมตร
    status ENUM('pending', 'in_progress', 'completed', 'cancelled', 'delayed') DEFAULT 'pending',
    actual_start_time DATETIME NULL,
    actual_end_time DATETIME NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (truck_id) REFERENCES trucks(truck_id) ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
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
    status ENUM('assigned', 'in_progress', 'completed', 'cancelled', 'delayed') DEFAULT 'assigned',
    notes TEXT,
    assigned_by INT,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (truck_id) REFERENCES trucks(truck_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_route_truck_date (route_id, truck_id, assigned_date)
);

-- =============================================
-- ตาราง gps_logs (บันทึก GPS)
-- =============================================
CREATE TABLE gps_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_id VARCHAR(20) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    speed DECIMAL(5,2),
    direction DECIMAL(5,2),
    altitude DECIMAL(8,2),
    accuracy DECIMAL(8,2),
    battery_level INT,
    signal_strength INT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (truck_id) REFERENCES trucks(truck_id) ON DELETE CASCADE
);

-- =============================================
-- ตาราง deliveries (การส่งสินค้า)
-- =============================================
CREATE TABLE deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delivery_code VARCHAR(20) UNIQUE NOT NULL,
    route_detail_id INT NOT NULL,
    truck_id VARCHAR(20) NOT NULL,
    driver_id VARCHAR(20) NOT NULL,
    shop_id VARCHAR(20) NOT NULL,
    delivery_date DATE NOT NULL,
    scheduled_time TIME,
    actual_start_time DATETIME NULL,
    actual_end_time DATETIME NULL,
    status ENUM('scheduled', 'in_transit', 'delivered', 'failed', 'cancelled') DEFAULT 'scheduled',
    quantity INT,
    unit VARCHAR(20) DEFAULT 'kg',
    notes TEXT,
    signature_path VARCHAR(255),
    photo_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (route_detail_id) REFERENCES route_details(id) ON DELETE CASCADE,
    FOREIGN KEY (truck_id) REFERENCES trucks(truck_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- =============================================
-- ตาราง maintenance (การบำรุงรักษา)
-- =============================================
CREATE TABLE maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_id VARCHAR(20) NOT NULL,
    maintenance_type ENUM('routine', 'repair', 'inspection', 'emergency') NOT NULL,
    description TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    actual_date DATE NULL,
    cost DECIMAL(10,2),
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    service_provider VARCHAR(100),
    next_maintenance_date DATE NULL,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (truck_id) REFERENCES trucks(truck_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- ตาราง fuel_logs (บันทึกน้ำมัน)
-- =============================================
CREATE TABLE fuel_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_id VARCHAR(20) NOT NULL,
    driver_id VARCHAR(20) NOT NULL,
    fuel_amount DECIMAL(8,2) NOT NULL,
    fuel_cost DECIMAL(10,2) NOT NULL,
    odometer_reading INT,
    fuel_station VARCHAR(100),
    receipt_number VARCHAR(50),
    fuel_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (truck_id) REFERENCES trucks(truck_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE
);

-- =============================================
-- ตาราง notifications (การแจ้งเตือนระบบ)
-- =============================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_table VARCHAR(50),
    related_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- ตาราง system_settings (การตั้งค่าระบบ)
-- =============================================
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    category VARCHAR(50),
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- สร้าง Indexes เพื่อเพิ่มประสิทธิภาพ
-- =============================================

-- Indexes สำหรับตาราง trucks
CREATE INDEX idx_trucks_updated_at ON trucks(updated_at);
CREATE INDEX idx_trucks_driver_id ON trucks(driver_id);
CREATE INDEX idx_trucks_gps_id ON trucks(gps_id);
CREATE INDEX idx_trucks_status ON trucks(status);

-- Indexes สำหรับตาราง tracking
CREATE INDEX idx_tracking_truck_id ON tracking(truck_id);
CREATE INDEX idx_tracking_driver_id ON tracking(driver_id);
CREATE INDEX idx_tracking_timestamp ON tracking(timestamp);
CREATE INDEX idx_tracking_shop_id ON tracking(shop_id);

-- Indexes สำหรับตาราง alerts
CREATE INDEX idx_alerts_truck_code ON alerts(truck_code);
CREATE INDEX idx_alerts_driver_code ON alerts(driver_code);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_alert_time ON alerts(alert_time);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_priority ON alerts(priority);

-- Indexes สำหรับตาราง route_details
CREATE INDEX idx_route_details_truck ON route_details(truck_id);
CREATE INDEX idx_route_details_shop ON route_details(shop_id);
CREATE INDEX idx_route_details_route ON route_details(route_id);
CREATE INDEX idx_route_details_status ON route_details(status);

-- Indexes สำหรับตาราง route_assignments
CREATE INDEX idx_route_assignments_truck ON route_assignments(truck_id);
CREATE INDEX idx_route_assignments_driver ON route_assignments(driver_id);
CREATE INDEX idx_route_assignments_date ON route_assignments(assigned_date);
CREATE INDEX idx_route_assignments_status ON route_assignments(status);

-- Indexes สำหรับตาราง gps_logs
CREATE INDEX idx_gps_logs_truck_id ON gps_logs(truck_id);
CREATE INDEX idx_gps_logs_timestamp ON gps_logs(timestamp);

-- Indexes สำหรับตาราง deliveries
CREATE INDEX idx_deliveries_truck_id ON deliveries(truck_id);
CREATE INDEX idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX idx_deliveries_shop_id ON deliveries(shop_id);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- Indexes สำหรับตาราง maintenance
CREATE INDEX idx_maintenance_truck_id ON maintenance(truck_id);
CREATE INDEX idx_maintenance_date ON maintenance(scheduled_date);
CREATE INDEX idx_maintenance_status ON maintenance(status);

-- Indexes สำหรับตาราง fuel_logs
CREATE INDEX idx_fuel_logs_truck_id ON fuel_logs(truck_id);
CREATE INDEX idx_fuel_logs_driver_id ON fuel_logs(driver_id);
CREATE INDEX idx_fuel_logs_date ON fuel_logs(fuel_date);

-- Indexes สำหรับตาราง notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =============================================
-- ข้อมูลตัวอย่าง (Sample Data)
-- =============================================

-- เพิ่มผู้ใช้ admin และ owner
INSERT INTO users (username, password, role) VALUES 
('admin', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', 'admin'),
('owner', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', 'owner'),
('admin001', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- เพิ่มพนักงานขับรถตัวอย่าง
INSERT INTO drivers (driver_id, full_name, username, password, phone, start_date, status) VALUES 
('DRV001', 'สมชาย ใจดี', 'driver1', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', '0812345678', '2024-01-01', 'active'),
('DRV002', 'สมหญิง รักงาน', 'driver2', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', '0823456789', '2024-01-15', 'active'),
('DRV003', 'วิชัย ขยันขันแข็ง', 'driver3', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', '0834567890', '2024-02-01', 'active'),
('DRV004', 'มาลี สุขใส', 'driver4', '$2b$10$rQZ8K9mN2pL3oI4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA', '0845678901', '2024-02-15', 'active');

-- เพิ่มรถตัวอย่าง
INSERT INTO trucks (truck_id, license_plate, model, color, gps_id, driver_id, status, fuel_capacity, max_load) VALUES 
('TRK001', 'กข-1234', 'ISUZU NPR', 'ขาว', 'GPS001', 1, 'active', 100.00, 3500.00),
('TRK002', 'กข-5678', 'HINO 300', 'น้ำเงิน', 'GPS002', 2, 'active', 120.00, 4000.00),
('TRK003', 'กข-9012', 'MITSUBISHI FUSO', 'แดง', 'GPS003', 3, 'active', 110.00, 3800.00),
('TRK004', 'กข-3456', 'ISUZU ELF', 'เหลือง', 'GPS004', 4, 'active', 80.00, 2500.00);

-- เพิ่มร้านค้าตัวอย่าง
INSERT INTO shops (shop_id, shop_name, phone, address, lat, lng, contact_person, status) VALUES 
('SHP001', 'ร้านน้ำแข็งปากซอย', '031234567', '123 ถนนสุขุมวิท กรุงเทพฯ', 13.7563, 100.5018, 'คุณสมศรี', 'active'),
('SHP002', 'ร้านน้ำแข็งตลาดนัด', '032345678', '456 ถนนรัชดาภิเษก กรุงเทพฯ', 13.7651, 100.5380, 'คุณสมชาย', 'active'),
('SHP003', 'ร้านน้ำแข็งชุมชน', '033456789', '789 ถนนลาดพร้าว กรุงเทพฯ', 13.7948, 100.5500, 'คุณสมหญิง', 'active'),
('SHP004', 'ร้านน้ำแข็งตลาดสด', '034567890', '321 ถนนพหลโยธิน กรุงเทพฯ', 13.8200, 100.5140, 'คุณวิชัย', 'active'),
('SHP005', 'ร้านน้ำแข็งซุปเปอร์มาร์เก็ต', '035678901', '654 ถนนวิภาวดีรังสิต กรุงเทพฯ', 13.8500, 100.5300, 'คุณมาลี', 'active'),
('SHP006', 'ร้านน้ำแข็งห้างสรรพสินค้า', '036789012', '987 ถนนบางนา กรุงเทพฯ', 13.8700, 100.5500, 'คุณสมพร', 'active');

-- เพิ่มเส้นทางตัวอย่าง
INSERT INTO routes (route_name, description, status, created_by) VALUES 
('เส้นทางส่งน้ำแข็งเขตกรุงเทพ', 'เส้นทางหลักสำหรับส่งน้ำแข็งในเขตกรุงเทพมหานคร', 'active', 1),
('เส้นทางส่งน้ำแข็งชานเมือง', 'เส้นทางสำหรับส่งน้ำแข็งในเขตชานเมือง', 'active', 1),
('เส้นทางส่งน้ำแข็งตลาดสด', 'เส้นทางสำหรับส่งน้ำแข็งไปยังตลาดสดต่างๆ', 'active', 1),
('เส้นทางส่งน้ำแข็งห้างสรรพสินค้า', 'เส้นทางสำหรับส่งน้ำแข็งไปยังห้างสรรพสินค้า', 'active', 1);

-- เพิ่มรายละเอียดเส้นทางตัวอย่าง
INSERT INTO route_details (route_id, truck_id, shop_id, delivery_order, estimated_time, estimated_duration, distance, status) VALUES 
(1, 'TRK001', 'SHP001', 1, '08:00:00', 30, 5.5, 'pending'),
(1, 'TRK001', 'SHP002', 2, '09:30:00', 45, 8.2, 'pending'),
(1, 'TRK001', 'SHP003', 3, '11:00:00', 60, 12.8, 'pending'),
(2, 'TRK002', 'SHP004', 1, '08:30:00', 40, 6.8, 'pending'),
(2, 'TRK002', 'SHP005', 2, '10:00:00', 50, 9.5, 'pending'),
(3, 'TRK003', 'SHP006', 1, '09:00:00', 35, 7.2, 'pending'),
(4, 'TRK004', 'SHP001', 1, '08:15:00', 25, 4.8, 'pending'),
(4, 'TRK004', 'SHP003', 2, '09:45:00', 40, 6.9, 'pending');

-- เพิ่มการมอบหมายเส้นทางตัวอย่าง
INSERT INTO route_assignments (route_id, truck_id, driver_id, assigned_date, status, assigned_by) VALUES 
(1, 'TRK001', 'DRV001', '2024-01-20', 'assigned', 1),
(2, 'TRK002', 'DRV002', '2024-01-20', 'assigned', 1),
(3, 'TRK003', 'DRV003', '2024-01-20', 'assigned', 1),
(4, 'TRK004', 'DRV004', '2024-01-20', 'assigned', 1);

-- เพิ่มข้อมูลการส่งสินค้าตัวอย่าง
INSERT INTO deliveries (delivery_code, route_detail_id, truck_id, driver_id, shop_id, delivery_date, scheduled_time, status, quantity, unit) VALUES 
('DEL001', 1, 'TRK001', 'DRV001', 'SHP001', '2024-01-20', '08:00:00', 'scheduled', 100, 'kg'),
('DEL002', 2, 'TRK001', 'DRV001', 'SHP002', '2024-01-20', '09:30:00', 'scheduled', 150, 'kg'),
('DEL003', 3, 'TRK001', 'DRV001', 'SHP003', '2024-01-20', '11:00:00', 'scheduled', 200, 'kg'),
('DEL004', 4, 'TRK002', 'DRV002', 'SHP004', '2024-01-20', '08:30:00', 'scheduled', 120, 'kg'),
('DEL005', 5, 'TRK002', 'DRV002', 'SHP005', '2024-01-20', '10:00:00', 'scheduled', 180, 'kg');

-- เพิ่มข้อมูลการบำรุงรักษาตัวอย่าง
INSERT INTO maintenance (truck_id, maintenance_type, description, scheduled_date, cost, status, service_provider, created_by) VALUES 
('TRK001', 'routine', 'เปลี่ยนน้ำมันเครื่องและกรองอากาศ', '2024-02-01', 2500.00, 'scheduled', 'ศูนย์บริการ ISUZU', 1),
('TRK002', 'inspection', 'ตรวจสอบระบบเบรกและยาง', '2024-02-05', 1500.00, 'scheduled', 'ศูนย์บริการ HINO', 1),
('TRK003', 'repair', 'ซ่อมแซมระบบแอร์', '2024-01-25', 3500.00, 'scheduled', 'อู่ซ่อมรถยนต์', 1);

-- เพิ่มข้อมูลน้ำมันตัวอย่าง
INSERT INTO fuel_logs (truck_id, driver_id, fuel_amount, fuel_cost, odometer_reading, fuel_station, receipt_number, fuel_date) VALUES 
('TRK001', 'DRV001', 80.50, 2400.00, 15000, 'ปตท. สาขาสุขุมวิท', 'R001234', '2024-01-15'),
('TRK002', 'DRV002', 95.20, 2850.00, 18000, 'เชลล์ สาขารัชดาภิเษก', 'R001235', '2024-01-16'),
('TRK003', 'DRV003', 75.80, 2270.00, 12000, 'เอสโซ่ สาขาลาดพร้าว', 'R001236', '2024-01-17');

-- เพิ่มการตั้งค่าระบบตัวอย่าง
INSERT INTO system_settings (setting_key, setting_value, description, category, updated_by) VALUES 
('gps_update_interval', '30', 'ช่วงเวลาอัปเดต GPS (วินาที)', 'gps', 1),
('alert_speed_limit', '80', 'ความเร็วสูงสุดที่อนุญาต (กม./ชม.)', 'alerts', 1),
('fuel_warning_threshold', '20', 'ระดับน้ำมันเตือน (เปอร์เซ็นต์)', 'fuel', 1),
('maintenance_reminder_days', '7', 'เตือนการบำรุงรักษาล่วงหน้า (วัน)', 'maintenance', 1),
('delivery_timeout_minutes', '60', 'เวลารอการส่งสินค้าสูงสุด (นาที)', 'delivery', 1);

-- เพิ่มการแจ้งเตือนตัวอย่าง
INSERT INTO alerts (truck_code, driver_code, truck_id, driver_id, type, message, priority, is_read) VALUES 
('TRK001', 'DRV001', 1, 1, 'speed_exceeded', 'รถ TRK001 ขับเกินความเร็วที่กำหนด', 'high', FALSE),
('TRK002', 'DRV002', 2, 2, 'fuel_low', 'รถ TRK002 น้ำมันใกล้หมด', 'medium', FALSE),
('TRK003', 'DRV003', 3, 3, 'maintenance_due', 'รถ TRK003 ถึงกำหนดบำรุงรักษา', 'medium', FALSE);

-- เพิ่มการแจ้งเตือนระบบตัวอย่าง
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES 
(1, 'ระบบอัปเดต', 'ระบบได้รับการอัปเดตเป็นเวอร์ชันใหม่', 'info', FALSE),
(2, 'การแจ้งเตือน', 'มีรถ 2 คันที่ต้องตรวจสอบ', 'warning', FALSE);

-- =============================================
-- สิ้นสุดการสร้างฐานข้อมูล
-- =============================================

-- แสดงข้อมูลสรุป
SELECT 'Database created successfully!' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'ice_tracking';
SELECT table_name FROM information_schema.tables WHERE table_schema = 'ice_tracking' ORDER BY table_name;

-- แสดงข้อมูลตัวอย่าง
SELECT 'Sample data inserted:' as info;
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Drivers:', COUNT(*) FROM drivers
UNION ALL
SELECT 'Trucks:', COUNT(*) FROM trucks
UNION ALL
SELECT 'Shops:', COUNT(*) FROM shops
UNION ALL
SELECT 'Routes:', COUNT(*) FROM routes
UNION ALL
SELECT 'Route Details:', COUNT(*) FROM route_details
UNION ALL
SELECT 'Route Assignments:', COUNT(*) FROM route_assignments
UNION ALL
SELECT 'Deliveries:', COUNT(*) FROM deliveries
UNION ALL
SELECT 'Maintenance:', COUNT(*) FROM maintenance
UNION ALL
SELECT 'Fuel Logs:', COUNT(*) FROM fuel_logs
UNION ALL
SELECT 'Alerts:', COUNT(*) FROM alerts
UNION ALL
SELECT 'Notifications:', COUNT(*) FROM notifications
UNION ALL
SELECT 'System Settings:', COUNT(*) FROM system_settings;
