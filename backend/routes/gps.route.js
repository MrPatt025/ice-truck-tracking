// routes/gps.route.js
const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const AlertService = require('../services/alertService');

// ✅ POST: อัปเดตพิกัด GPS (ใช้ในแอปมือถือโดย driver)
router.post('/update', auth(['driver']), async (req, res) => {
  const { truck_id, lat, lng } = req.body;

  // ✅ ตรวจสอบว่าข้อมูลครบ และ lat/lng เป็นตัวเลข
  if (!truck_id || !lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return res.status(400).json({ message: 'กรุณาส่ง truck_id, lat และ lng ที่ถูกต้อง' });
  }

  try {
    // ดึงข้อมูลตำแหน่งเก่าก่อนอัปเดต
    const [oldPositionRows] = await db.query(
      'SELECT latitude, longitude, updated_at FROM trucks WHERE truck_id = ?',
      [truck_id]
    );

    const [result] = await db.query(
      'UPDATE trucks SET latitude = ?, longitude = ?, updated_at = NOW() WHERE truck_id = ?',
      [Number(lat), Number(lng), truck_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบรถที่ต้องการอัปเดต' });
    }

    // ดึงข้อมูลรถสำหรับตรวจสอบแจ้งเตือน
    const [truckRows] = await db.query(
      'SELECT truck_id, license_plate FROM trucks WHERE truck_id = ?',
      [truck_id]
    );

    if (truckRows.length > 0) {
      const truckCode = truckRows[0].license_plate || truck_id;
      
      // ดึงข้อมูลเส้นทางที่รถคันนี้ต้องไป
      const [routeRows] = await db.query(`
        SELECT s.lat, s.lng 
        FROM route_details rd
        JOIN shops s ON rd.shop_id = s.shop_id
        WHERE rd.truck_id = ? AND rd.status = 'in_progress'
        ORDER BY rd.delivery_order
      `, [truck_id]);

      const routeLocations = routeRows.map(row => ({
        latitude: row.lat,
        longitude: row.lng
      }));

      // คำนวณความเร็วจากตำแหน่งเก่า
      let currentSpeed = 0;
      if (oldPositionRows.length > 0 && oldPositionRows[0].latitude && oldPositionRows[0].longitude) {
        const oldPos = oldPositionRows[0];
        const distance = AlertService.calculateDistance(
          oldPos.latitude, oldPos.longitude,
          Number(lat), Number(lng)
        );
        const timeDiff = (new Date() - new Date(oldPos.updated_at)) / (1000 * 60 * 60); // ชั่วโมง
        currentSpeed = timeDiff > 0 ? distance / timeDiff : 0;
      }

      // ตรวจสอบแจ้งเตือนอัตโนมัติ
      const trackingData = {
        location: { latitude: Number(lat), longitude: Number(lng) },
        route: routeLocations,
        lastMovementTime: oldPositionRows.length > 0 ? oldPositionRows[0].updated_at : new Date(),
        speed: currentSpeed
      };

      await AlertService.runAllChecks(truckCode, trackingData);
    }

    console.log(`✅ อัปเดต GPS สำเร็จ: รถ ${truck_id} ที่ ${lat}, ${lng}`);
    res.json({ message: 'อัปเดตตำแหน่งสำเร็จ' });
  } catch (err) {
    console.error('❌ อัปเดต GPS ผิดพลาด:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตตำแหน่ง', error: err.message });
  }
});

// ✅ GET: ดึงพิกัดล่าสุดจาก truck_id
router.get('/latest/:truck_id', async (req, res) => {
  const { truck_id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT 
        t.latitude AS lat, 
        t.longitude AS lng, 
        t.updated_at,
        d.driver_id,
        d.full_name AS driver_name
      FROM trucks t
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      WHERE t.truck_id = ?
    `, [truck_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรถคันนี้ในระบบ' });
    }

    res.json({
      truck_id,
      lat: rows[0].lat,
      lng: rows[0].lng,
      timestamp: rows[0].updated_at || new Date().toISOString(),
      driver_id: rows[0].driver_id,
      driver_name: rows[0].driver_name
    });
  } catch (err) {
    console.error('❌ ดึง GPS ผิดพลาด:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงตำแหน่ง', error: err.message });
  }
});

module.exports = router;
