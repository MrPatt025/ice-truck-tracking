// middleware/auth.js
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || '123456';

module.exports = (roles = []) => {
  // ถ้า roles เป็น string เช่น 'admin' ให้แปลงเป็น array ['admin']
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log('🔍 Auth Debug - URL:', req.url);
    console.log('🔍 Auth Debug - Auth Header:', authHeader);
    console.log('🔍 Auth Debug - Required Roles:', roles);

    // รองรับทั้ง Bearer token และ token ธรรมดา
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    console.log('🔍 Auth Debug - Extracted Token:', token ? 'มี' : 'ไม่มี');

    if (!token) {
      console.log('❌ Auth Debug - ไม่มี Token');
      return res.status(401).json({ message: '⚠️ ไม่ได้รับ Token ในคำขอ' });
    }

    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      console.log('✅ Auth Debug - Decoded Token:', decoded);
      req.user = {
        id: decoded.id,
        role: decoded.role,
        username: decoded.username || null
      };
      console.log('✅ Auth Debug - User Object:', req.user);

      // ตรวจสอบสิทธิ์ (role) ถ้ากำหนดไว้
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        console.log('❌ Auth Debug - Role ไม่ตรงกัน:', decoded.role, 'ไม่ใช่ใน', roles);
        return res.status(403).json({ message: '⛔ ไม่มีสิทธิ์เข้าถึง (Forbidden)' });
      }

      console.log('✅ Auth Debug - ผ่านการตรวจสอบแล้ว');
      next(); // ผ่าน token และ role -> ไป middleware ถัดไป
    } catch (err) {
      console.error('❌ Auth Debug - Token verification failed:', err.message);
      return res.status(401).json({ message: '❌ Token ไม่ถูกต้อง หรือหมดอายุ' });
    }
  };
};
