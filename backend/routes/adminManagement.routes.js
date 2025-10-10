// routes/adminManagement.routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const authorize = require('../middleware/auth');

// ✅ Middleware: ต้องเป็น admin เท่านั้น
const onlyAdmin = authorize('admin');

// ---------------------- พนักงานขับรถ ----------------------

// GET ดึงข้อมูลพนักงานขับรถทั้งหมด
router.get('/drivers', onlyAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM drivers ORDER BY driver_id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.post('/drivers', onlyAdmin, async (req, res) => {
  const { driver_id, full_name, national_id, license_number, username, password, address, phone, start_date } = req.body;
  if (!driver_id || !username || !password) {
    return res.status(400).json({ message: 'กรุณากรอก driver_id, username และ password' });
  }

  try {
    // ตรวจสอบ username ซ้ำ
    const [exist] = await db.execute('SELECT * FROM drivers WHERE username = ?', [username]);
    if (exist.length > 0) {
      return res.status(409).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
    }

    const hashed = await bcrypt.hash(password, 10);
    // ใช้ชื่อคอลัมน์ที่ถูกต้องและจัดการ start_date
    const formattedStartDate = start_date ? new Date(start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    await db.execute(`INSERT INTO drivers (driver_id, full_name, national_id, license_number, username, password, address, phone, start_date)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [driver_id, full_name, national_id, license_number, username, hashed, address, phone, formattedStartDate]);
    res.json({ message: 'เพิ่มพนักงานสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.put('/drivers/:id', onlyAdmin, async (req, res) => {
  const { full_name, national_id, license_number, username, password, address, phone, start_date } = req.body;
  
  try {
    // ตรวจสอบว่ามี driver_id นี้อยู่หรือไม่
    const [exist] = await db.execute('SELECT * FROM drivers WHERE driver_id = ?', [req.params.id]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'ไม่พบพนักงานขับรถที่ต้องการแก้ไข' });
    }

    // ถ้ามีการเปลี่ยน username ให้ตรวจสอบซ้ำ
    if (username && username !== exist[0].username) {
      const [usernameExist] = await db.execute('SELECT * FROM drivers WHERE username = ? AND driver_id != ?', [username, req.params.id]);
      if (usernameExist.length > 0) {
        return res.status(409).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
      }
    }

    // จัดการ start_date ให้เป็นรูปแบบที่ถูกต้อง
    const formattedStartDate = start_date ? new Date(start_date).toISOString().split('T')[0] : exist[0].start_date;

    let updateQuery = 'UPDATE drivers SET full_name=?, national_id=?, license_number=?, username=?, address=?, phone=?, start_date=?';
    let updateParams = [full_name, national_id, license_number, username, address, phone, formattedStartDate];

    // ถ้ามีการเปลี่ยน password ให้ hash password ใหม่
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password=?';
      updateParams.push(hashedPassword);
    }

    updateQuery += ' WHERE driver_id=?';
    updateParams.push(req.params.id);

    await db.execute(updateQuery, updateParams);
    res.json({ message: 'แก้ไขข้อมูลพนักงานสำเร็จ' });
  } catch (err) {
    console.error('PUT /drivers/:id error:', err);
    res.status(500).json({ message: 'ผิดพลาดในการอัปเดต', error: err.message });
  }
});

router.delete('/drivers/:id', onlyAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM drivers WHERE driver_id = ?', [req.params.id]);
    res.json({ message: 'ลบพนักงานสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'ลบไม่สำเร็จ', error: err.message });
  }
});

// ---------------------- รถ ----------------------

router.post('/trucks', onlyAdmin, async (req, res) => {
  const { truck_id, license_plate, model, color, gps_id } = req.body;
  if (!truck_id || !license_plate) {
    return res.status(400).json({ message: 'กรุณากรอก truck_id และทะเบียนรถ' });
  }

  try {
    const [exist] = await db.execute('SELECT * FROM trucks WHERE truck_id = ?', [truck_id]);
    if (exist.length > 0) {
      return res.status(409).json({ message: 'รหัสรถนี้มีอยู่แล้ว' });
    }

    await db.execute(`INSERT INTO trucks (truck_id, license_plate, model, color, gps_id)
                      VALUES (?, ?, ?, ?, ?)`,
      [truck_id, license_plate, model, color, gps_id]);
    res.json({ message: 'เพิ่มรถสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.put('/trucks/:id', onlyAdmin, async (req, res) => {
  const { license_plate, model, color, gps_id } = req.body;
  try {
    await db.execute(`UPDATE trucks SET license_plate=?, model=?, color=?, gps_id=? WHERE truck_id=?`,
      [license_plate, model, color, gps_id, req.params.id]);
    res.json({ message: 'อัปเดตรถสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'ผิดพลาดในการอัปเดต', error: err.message });
  }
});

router.delete('/trucks/:id', onlyAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM trucks WHERE truck_id = ?', [req.params.id]);
    res.json({ message: 'ลบรถสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'ลบไม่สำเร็จ', error: err.message });
  }
});

// ---------------------- ร้านค้า ----------------------

router.post('/shops', onlyAdmin, async (req, res) => {
  const { shop_id, shop_name, phone, address, lat, lng } = req.body;
  if (!shop_id || !shop_name) {
    return res.status(400).json({ message: 'กรุณากรอก shop_id และชื่อร้านค้า' });
  }

  try {
    const [exist] = await db.execute('SELECT * FROM shops WHERE shop_id = ?', [shop_id]);
    if (exist.length > 0) {
      return res.status(409).json({ message: 'รหัสร้านค้านี้มีอยู่แล้ว' });
    }

    await db.execute(`INSERT INTO shops (shop_id, shop_name, phone, address, lat, lng)
                      VALUES (?, ?, ?, ?, ?, ?)`,
      [shop_id, shop_name, phone, address, lat, lng]);
    res.json({ message: 'เพิ่มร้านค้าสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.put('/shops/:id', onlyAdmin, async (req, res) => {
  const { shop_name, phone, address, lat, lng } = req.body;
  try {
    await db.execute(`UPDATE shops SET shop_name=?, phone=?, address=?, lat=?, lng=? WHERE shop_id=?`,
      [shop_name, phone, address, lat, lng, req.params.id]);
    res.json({ message: 'อัปเดตร้านค้าสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'ผิดพลาดในการอัปเดต', error: err.message });
  }
});

router.delete('/shops/:id', onlyAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM shops WHERE shop_id = ?', [req.params.id]);
    res.json({ message: 'ลบร้านค้าสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'ลบไม่สำเร็จ', error: err.message });
  }
});

module.exports = router;
