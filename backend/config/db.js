// config/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// ✅ สร้าง pool การเชื่อมต่อกับฐานข้อมูล MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ice_trackings',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ✅ ทดสอบการเชื่อมต่อเมื่อเริ่มต้น (แสดงชื่อฐานข้อมูล)
(async () => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT DATABASE() AS db;');
    console.log(`✅ MySQL Database Connected [${rows[0].db}]`);
    connection.release();
  } catch (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
    
  }
})();

module.exports = db;
