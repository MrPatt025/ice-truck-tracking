// routes/truck.route.js
const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ✅ GET: ดึงข้อมูลรถทั้งหมด (admin, owner, driver)
router.get('/', auth(['admin', 'owner', 'driver']), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM trucks ORDER BY truck_id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'โหลดข้อมูลล้มเหลว', error: err.message });
  }
});

// ✅ POST: เพิ่มรถใหม่ (admin เท่านั้น)
router.post('/', auth(['admin']), async (req, res) => {
  const truck = req.body;

  // ตรวจสอบข้อมูล
  if (!truck.truck_id || !truck.license_plate || !truck.model || !truck.color || !truck.gps_id) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    const [exist] = await db.query('SELECT * FROM trucks WHERE truck_id = ?', [truck.truck_id]);
    if (exist.length > 0) {
      return res.status(409).json({ message: 'รหัสรถนี้มีอยู่แล้ว' });
    }

    await db.query(
      'INSERT INTO trucks (truck_id, license_plate, model, color, gps_id) VALUES (?, ?, ?, ?, ?)',
      [truck.truck_id, truck.license_plate, truck.model, truck.color, truck.gps_id]
    );
    res.json({ message: 'เพิ่มรถสำเร็จ' });
  } catch (err) {
    console.error('❌ Insert truck error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ✅ PUT: แก้ไขข้อมูลรถ (admin เท่านั้น)
router.put('/:id', auth(['admin']), async (req, res) => {
  const truck = req.body;

  try {
    const [exist] = await db.query('SELECT * FROM trucks WHERE truck_id = ?', [req.params.id]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรถที่ต้องการแก้ไข' });
    }

    await db.query(
      'UPDATE trucks SET license_plate=?, model=?, color=?, gps_id=? WHERE truck_id=?',
      [truck.license_plate, truck.model, truck.color, truck.gps_id, req.params.id]
    );
    res.json({ message: 'แก้ไขข้อมูลเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถแก้ไขได้', error: err.message });
  }
});

// ✅ DELETE: ลบรถ (admin เท่านั้น)
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const [exist] = await db.query('SELECT * FROM trucks WHERE truck_id = ?', [req.params.id]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรถที่ต้องการลบ' });
    }

    await db.query('DELETE FROM trucks WHERE truck_id = ?', [req.params.id]);
    res.json({ message: 'ลบข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถลบได้', error: err.message });
  }
});

module.exports = router;
