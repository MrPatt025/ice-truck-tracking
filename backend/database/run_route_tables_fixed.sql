-- ใช้ไฟล์นี้เพื่อสร้างตารางสำหรับจัดการเส้นทาง (แก้ไขแล้ว)
-- รันคำสั่งนี้ใน phpMyAdmin

USE ice_tracking;

-- สร้างตารางเส้นทางหลัก (routes)
CREATE TABLE IF NOT EXISTS routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- สร้างตารางรายละเอียดเส้นทาง (route_details) - ไม่มี Foreign Key ก่อน
CREATE TABLE IF NOT EXISTS route_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    truck_id VARCHAR(20) NOT NULL,
    shop_id VARCHAR(20) NOT NULL,
    delivery_order INT NOT NULL, -- ลำดับการส่ง (1, 2, 3, ...)
    estimated_time TIME, -- เวลาที่คาดว่าจะถึง
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_route_truck_shop (route_id, truck_id, shop_id)
);

-- สร้างตารางการมอบหมายเส้นทางให้รถ (route_assignments) - ไม่มี Foreign Key ก่อน
CREATE TABLE IF NOT EXISTS route_assignments (
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

-- เพิ่ม index เพื่อเพิ่มประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_route_details_truck ON route_details(truck_id);
CREATE INDEX IF NOT EXISTS idx_route_details_shop ON route_details(shop_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_truck ON route_assignments(truck_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_driver ON route_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_date ON route_assignments(assigned_date);

-- เพิ่ม Foreign Key constraints หลังจากสร้างตารางแล้ว
-- (ถ้าต้องการความสมบูรณ์ของข้อมูล)
-- ALTER TABLE route_details ADD CONSTRAINT fk_route_details_route 
--     FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE;
-- ALTER TABLE route_details ADD CONSTRAINT fk_route_details_truck 
--     FOREIGN KEY (truck_id) REFERENCES trucks(truck_code) ON DELETE CASCADE;
-- ALTER TABLE route_details ADD CONSTRAINT fk_route_details_shop 
--     FOREIGN KEY (shop_id) REFERENCES shops(shop_code) ON DELETE CASCADE;
-- ALTER TABLE route_assignments ADD CONSTRAINT fk_route_assignments_route 
--     FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE;
-- ALTER TABLE route_assignments ADD CONSTRAINT fk_route_assignments_truck 
--     FOREIGN KEY (truck_id) REFERENCES trucks(truck_code) ON DELETE CASCADE;
-- ALTER TABLE route_assignments ADD CONSTRAINT fk_route_assignments_driver 
--     FOREIGN KEY (driver_id) REFERENCES drivers(driver_code) ON DELETE SET NULL;

-- แสดงข้อความสำเร็จ
SELECT 'ตารางสำหรับจัดการเส้นทางถูกสร้างเรียบร้อยแล้ว!' as message;
