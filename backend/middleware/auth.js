// middleware/auth.js
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  throw new Error('JWT_SECRET must be set for middleware/auth.js');
}

module.exports = function authorize(roles = []) {
  // ถ้า roles เป็น string เช่น 'admin' ให้แปลงเป็น array ['admin']
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    // รองรับทั้ง Bearer token และ token ธรรมดา
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: '⚠️ ไม่ได้รับ Token ในคำขอ' });
    }

    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      req.user = {
        id: decoded.id,
        role: decoded.role,
        username: decoded.username || null
      };

      // ตรวจสอบสิทธิ์ (role) ถ้ากำหนดไว้
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: '⛔ ไม่มีสิทธิ์เข้าถึง (Forbidden)' });
      }

      next(); // ผ่าน token และ role -> ไป middleware ถัดไป
    } catch {
      return res.status(401).json({ message: '❌ Token ไม่ถูกต้อง หรือหมดอายุ' });
    }
  };
};
