-- สคริปต์ลบข้อมูล route_details ที่ไม่มี routes อยู่แล้ว
-- ใช้เมื่อมีการลบ routes แต่ route_details ยังคงอยู่

-- ตรวจสอบข้อมูล route_details ที่ไม่มี routes อยู่แล้ว
SELECT rd.*, r.id as route_exists
FROM route_details rd
LEFT JOIN routes r ON rd.route_id = r.id
WHERE r.id IS NULL;

-- ลบข้อมูล route_details ที่ไม่มี routes อยู่แล้ว
DELETE rd FROM route_details rd
LEFT JOIN routes r ON rd.route_id = r.id
WHERE r.id IS NULL;

-- ตรวจสอบผลลัพธ์
SELECT COUNT(*) as remaining_route_details FROM route_details;
SELECT COUNT(*) as remaining_routes FROM routes;

