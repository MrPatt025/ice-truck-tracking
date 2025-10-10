// db.js

const mysql = require('mysql2');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ice_trackings',
});

module.exports = pool.promise(); // ✅ ต้องใช้ .promise()
