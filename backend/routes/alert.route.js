// routes/alert.route.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ✅ GET /api/alerts - admin/owner/driver สามารถดูได้
router.get('/', auth(), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM alerts ORDER BY alert_time DESC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching alerts:', err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแจ้งเตือน', error: err.message });
  }
});

// ✅ POST /api/alerts - เฉพาะ driver ส่งแจ้งเตือนได้
router.post('/', auth(['driver']), async (req, res) => {
  const { truck_code, driver_code, message } = req.body;

  // ตรวจสอบข้อมูล
  if (!truck_code || !driver_code || !message) {
    return res.status(400).json({ message: 'กรุณากรอก truck_code, driver_code และ message' });
  }

  try {
    await db.query(
      'INSERT INTO alerts (truck_code, driver_code, message, alert_time) VALUES (?, ?, ?, ?)',
      [truck_code, driver_code, message, new Date()]
    );
    res.json({ message: 'แจ้งเตือนถูกบันทึกเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('❌ Error inserting alert:', err.message);
    res.status(500).json({ message: 'ไม่สามารถบันทึกแจ้งเตือนได้', error: err.message });
  }
});

module.exports = router;
