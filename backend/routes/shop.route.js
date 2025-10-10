// routes/shop.route.js
const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ✅ GET - ดูร้านค้าทั้งหมด
router.get('/', auth(), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM shops ORDER BY shop_name ASC');
    res.json(rows);
  } catch (err) {
    console.error('❌ ดึงข้อมูลร้านค้าล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลร้านค้าได้', error: err.message });
  }
});

// ✅ POST - เพิ่มร้านค้า (admin เท่านั้น)
router.post('/', auth(['admin']), async (req, res) => {
  const shop = req.body;

  // ตรวจสอบข้อมูล
  if (!shop.shop_id || !shop.shop_name) {
    return res.status(400).json({ message: 'กรุณาระบุ shop_id และ shop_name' });
  }

  try {
    const [exist] = await db.query('SELECT * FROM shops WHERE shop_id = ?', [shop.shop_id]);
    if (exist.length > 0) {
      return res.status(409).json({ message: 'shop_id นี้ถูกใช้แล้ว' });
    }

    await db.query(
      'INSERT INTO shops (shop_id, shop_name, phone, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
      [shop.shop_id, shop.shop_name, shop.phone || null, shop.address || null, shop.lat || null, shop.lng || null]
    );

    res.json({ message: 'เพิ่มร้านค้าสำเร็จ' });
  } catch (err) {
    console.error('❌ เพิ่มร้านค้าไม่สำเร็จ:', err);
    res.status(500).json({ message: 'ไม่สามารถเพิ่มร้านค้าได้', error: err.message });
  }
});

// ✅ PUT - แก้ไขร้านค้า (admin)
router.put('/:id', auth(['admin']), async (req, res) => {
  const shop = req.body;

  try {
    const [exist] = await db.query('SELECT * FROM shops WHERE shop_id = ?', [req.params.id]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'ไม่พบร้านค้าที่ต้องการแก้ไข' });
    }

    await db.query(
      'UPDATE shops SET shop_name=?, phone=?, address=?, lat=?, lng=? WHERE shop_id=?',
      [shop.shop_name, shop.phone, shop.address, shop.lat, shop.lng, req.params.id]
    );

    res.json({ message: 'อัปเดตร้านค้าสำเร็จ' });
  } catch (err) {
    console.error('❌ แก้ไขร้านค้าไม่สำเร็จ:', err);
    res.status(500).json({ message: 'ไม่สามารถแก้ไขร้านค้าได้', error: err.message });
  }
});

// ✅ DELETE - ลบร้านค้า (admin)
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const [exist] = await db.query('SELECT * FROM shops WHERE shop_id = ?', [req.params.id]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'ไม่พบร้านค้าที่ต้องการลบ' });
    }

    await db.query('DELETE FROM shops WHERE shop_id=?', [req.params.id]);
    res.json({ message: 'ลบร้านค้าสำเร็จ' });
  } catch (err) {
    console.error('❌ ลบร้านค้าไม่สำเร็จ:', err);
    res.status(500).json({ message: 'ไม่สามารถลบร้านค้าได้', error: err.message });
  }
});

module.exports = router;
