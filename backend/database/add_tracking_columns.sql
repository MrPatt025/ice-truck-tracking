-- เพิ่มคอลัมน์สำหรับการติดตาม GPS
USE ice_tracking;

-- เพิ่มคอลัมน์ในตาราง trucks
ALTER TABLE trucks 
ADD COLUMN latitude DOUBLE NULL,
ADD COLUMN longitude DOUBLE NULL,
ADD COLUMN updated_at DATETIME NULL,
ADD COLUMN driver_id INT NULL;

-- เพิ่ม foreign key constraint
ALTER TABLE trucks 
ADD CONSTRAINT fk_trucks_driver 
FOREIGN KEY (driver_id) REFERENCES drivers(id);

-- เพิ่ม index สำหรับการค้นหา
CREATE INDEX idx_trucks_updated_at ON trucks(updated_at);
CREATE INDEX idx_trucks_driver_id ON trucks(driver_id);

-- อัปเดตข้อมูลตัวอย่าง (ถ้ามี)
-- UPDATE trucks SET updated_at = NOW() WHERE latitude IS NOT NULL AND longitude IS NOT NULL;



