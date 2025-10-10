-- สร้างตารางสำหรับจัดการเส้นทางส่งของ
-- ใช้สำหรับกำหนดว่ารถคันไหนต้องไปส่งร้านไหน

-- ตารางเส้นทางหลัก (routes)
CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ตารางรายละเอียดเส้นทาง (route_details)
-- เชื่อมโยงรถกับร้านค้าที่ต้องไปส่ง
CREATE TABLE route_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    truck_id VARCHAR(20) NOT NULL,
    shop_id VARCHAR(20) NOT NULL,
    delivery_order INT NOT NULL, -- ลำดับการส่ง (1, 2, 3, ...)
    estimated_time TIME, -- เวลาที่คาดว่าจะถึง
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (truck_id) REFERENCES trucks(truck_code) ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_code) ON DELETE CASCADE,
    UNIQUE KEY unique_route_truck_shop (route_id, truck_id, shop_id)
);

-- ตารางการมอบหมายเส้นทางให้รถ (route_assignments)
-- กำหนดว่ารถคันไหนได้รับมอบหมายให้ทำเส้นทางไหน
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
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (truck_id) REFERENCES trucks(truck_code) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_code) ON DELETE SET NULL,
    UNIQUE KEY unique_route_truck_date (route_id, truck_id, assigned_date)
);

-- เพิ่ม index เพื่อเพิ่มประสิทธิภาพ
CREATE INDEX idx_route_details_truck ON route_details(truck_id);
CREATE INDEX idx_route_details_shop ON route_details(shop_id);
CREATE INDEX idx_route_assignments_truck ON route_assignments(truck_id);
CREATE INDEX idx_route_assignments_driver ON route_assignments(driver_id);
CREATE INDEX idx_route_assignments_date ON route_assignments(assigned_date);
