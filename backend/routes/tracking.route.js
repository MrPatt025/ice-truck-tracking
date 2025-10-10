const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const AlertService = require('../services/alertService');

// ✅ GET - ข้อมูลการติดตามทั้งหมด (admin/owner)
router.get('/', auth(['admin', 'owner']), async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM tracking ORDER BY timestamp DESC`);
    res.json(rows);
  } catch (err) {
    console.error('❌ ดึงข้อมูลการติดตามล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลการติดตามได้', error: err.message });
  }
});

// ✅ POST - บันทึกข้อมูลการติดตาม (driver)
router.post('/', auth(['driver']), async (req, res) => {
  const {
    shop_id,
    latitude,
    longitude,
    truck_id,
    driver_id,
    gps_code
  } = req.body;

  // ตรวจสอบความครบถ้วน
  if (!shop_id || !latitude || !longitude || !truck_id || !driver_id || !gps_code) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  if (isNaN(Number(latitude)) || isNaN(Number(longitude))) {
    return res.status(400).json({ message: 'latitude และ longitude ต้องเป็นตัวเลข' });
  }

  try {
    await db.query(
      `INSERT INTO tracking 
        (shop_id, latitude, longitude, truck_id, driver_id, gps_code, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_id,
        Number(latitude),
        Number(longitude),
        truck_id,
        driver_id,
        gps_code,
        new Date()
      ]
    );

    // อัปเดตตำแหน่งในตาราง trucks
    await db.query(
      'UPDATE trucks SET latitude = ?, longitude = ?, updated_at = NOW() WHERE truck_id = ?',
      [Number(latitude), Number(longitude), truck_id]
    );

    // ดึงข้อมูลรถและเส้นทางสำหรับตรวจสอบแจ้งเตือน
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

      // ดึงข้อมูลการเคลื่อนไหวล่าสุด
      const [lastMovementRows] = await db.query(`
        SELECT timestamp FROM tracking 
        WHERE truck_id = ? AND (latitude != ? OR longitude != ?)
        ORDER BY timestamp DESC LIMIT 1
      `, [truck_id, Number(latitude), Number(longitude)]);

      const lastMovementTime = lastMovementRows.length > 0 ? lastMovementRows[0].timestamp : new Date();

      // คำนวณความเร็ว (ถ้ามีข้อมูลก่อนหน้า)
      const [prevTrackingRows] = await db.query(`
        SELECT latitude, longitude, timestamp FROM tracking 
        WHERE truck_id = ? 
        ORDER BY timestamp DESC LIMIT 2
      `, [truck_id]);

      let currentSpeed = 0;
      if (prevTrackingRows.length >= 2) {
        const prev = prevTrackingRows[1];
        const current = prevTrackingRows[0];
        const distance = AlertService.calculateDistance(
          prev.latitude, prev.longitude,
          current.latitude, current.longitude
        );
        const timeDiff = (new Date(current.timestamp) - new Date(prev.timestamp)) / (1000 * 60 * 60); // ชั่วโมง
        currentSpeed = timeDiff > 0 ? distance / timeDiff : 0;
      }

      // ตรวจสอบแจ้งเตือนอัตโนมัติ
      const trackingData = {
        location: { latitude: Number(latitude), longitude: Number(longitude) },
        route: routeLocations,
        lastMovementTime: lastMovementTime,
        speed: currentSpeed
      };

      await AlertService.runAllChecks(truckCode, trackingData);
    }

    res.json({ message: 'บันทึกการติดตามสำเร็จ' });
  } catch (err) {
    console.error('❌ บันทึก tracking ล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถบันทึกข้อมูลได้', error: err.message });
  }
});

// ✅ GET - ดูตำแหน่งล่าสุดของรถทุกคัน (admin/owner)
router.get('/all', auth(['admin', 'owner']), async (req, res) => {
  try {
    // ดึงข้อมูลจากตาราง trucks ที่มี GPS ล่าสุด (จาก Tracking.js)
    const [rows] = await db.query(`
      SELECT 
        t.truck_id,
        t.latitude,
        t.longitude,
        t.updated_at,
        d.driver_id,
        d.full_name AS driver_name,
        t.license_plate,
        t.model,
        t.color,
        t.gps_id
      FROM trucks t
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      WHERE t.latitude IS NOT NULL 
        AND t.longitude IS NOT NULL
        AND t.updated_at IS NOT NULL
        AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
      ORDER BY t.updated_at DESC
    `);
    
    console.log('📊 ข้อมูลรถที่ใช้งานจริง:', rows.length, 'คัน');
    res.json(rows);
  } catch (err) {
    console.error('❌ ดึงข้อมูลตำแหน่งรถทุกคันล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงตำแหน่งล่าสุดของรถได้', error: err.message });
  }
});

module.exports = router;
