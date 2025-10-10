// routes/auth.route.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db'); // ✅ ใช้ config/db.js

const SECRET_KEY = process.env.JWT_SECRET || '123456';

/**
 * ✅ Login (รองรับ users และ drivers)
 * POST /api/login
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1️⃣ ตรวจสอบในตาราง users
    const [userRows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (userRows.length > 0) {
      const user = userRows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        SECRET_KEY,
        { expiresIn: '7d' }
      );

      return res.json({
        user: { id: user.id, username: user.username, role: user.role },
        token
      });
    }

    // 2️⃣ ตรวจสอบในตาราง drivers
    const [driverRows] = await db.execute('SELECT * FROM drivers WHERE username = ?', [username]);
    if (driverRows.length > 0) {
      const driver = driverRows[0];
      const match = await bcrypt.compare(password, driver.password);
      if (!match) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

      const token = jwt.sign(
        { id: driver.id, username: driver.username, role: 'driver' },
        SECRET_KEY,
        { expiresIn: '7d' }
      );

      return res.json({
        user: { id: driver.id, username: driver.username, role: 'driver' },
        token
      });
    }

    return res.status(401).json({ message: 'ไม่พบผู้ใช้ในระบบ' });

  } catch (err) {
    console.error('❌ LOGIN ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

/**
 * ✅ Middleware ตรวจสอบ token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) return res.status(401).json({ message: 'ไม่ได้รับ token' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'token ไม่ถูกต้อง' });
  }
};

/**
 * ✅ Register ผู้ใช้ใหม่ (admin เท่านั้น)
 * POST /api/register
 */
router.post('/register', authenticateToken, async (req, res) => {
  const { username, password, role, full_name, email, phone } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเพิ่มผู้ใช้ใหม่ได้' });
  }

  if (!username || !password || !role || !full_name || !email || !phone) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    // ตรวจสอบ username ซ้ำ
    const [existUsername] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (existUsername.length > 0) {
      return res.status(409).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
    }

    // ตรวจสอบ email ซ้ำ
    const [existEmail] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existEmail.length > 0) {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
    }

    // ตรวจสอบ phone ซ้ำ
    const [existPhone] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existPhone.length > 0) {
      return res.status(409).json({ message: 'เบอร์โทรศัพท์นี้ถูกใช้แล้ว' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (username, password, role, full_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashed, role, full_name, email, phone]
    );

    res.json({ message: 'ลงทะเบียนผู้ใช้ใหม่สำเร็จ' });
  } catch (err) {
    console.error('❌ REGISTER ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});

module.exports = router;
