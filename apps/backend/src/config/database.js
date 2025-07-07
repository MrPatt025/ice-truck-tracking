const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../database.sqlite');
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('Query error:', err, 'SQL:', sql);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) {
            console.error('Query error:', err, 'SQL:', sql);
            reject(err);
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      }
    });
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('driver', 'admin', 'owner')) DEFAULT 'driver',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_code TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        national_id TEXT UNIQUE,
        license_number TEXT UNIQUE NOT NULL,
        username TEXT,
        address TEXT,
        phone TEXT,
        start_date DATE,
        status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username)
      )`,
      `CREATE TABLE IF NOT EXISTS trucks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_code TEXT UNIQUE NOT NULL,
        plate_number TEXT UNIQUE NOT NULL,
        model TEXT NOT NULL,
        color TEXT,
        gps_code TEXT UNIQUE,
        status TEXT CHECK(status IN ('active', 'maintenance', 'inactive')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS shops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_code TEXT UNIQUE NOT NULL,
        shop_name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_code TEXT,
        shop_id INTEGER,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        truck_id INTEGER,
        driver_id INTEGER,
        gps_code TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        accuracy REAL,
        speed REAL,
        FOREIGN KEY (shop_id) REFERENCES shops(id),
        FOREIGN KEY (truck_id) REFERENCES trucks(id),
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_id INTEGER,
        driver_id INTEGER,
        message TEXT NOT NULL,
        alert_type TEXT CHECK(alert_type IN ('info', 'warning', 'error', 'emergency')) DEFAULT 'info',
        status TEXT CHECK(status IN ('active', 'resolved', 'dismissed')) DEFAULT 'active',
        alert_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (truck_id) REFERENCES trucks(id),
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )`
    ];

    for (const sql of tables) {
      await this.query(sql);
    }
    console.log('✅ Database tables created/verified');
  }

  async seedData() {
    try {
      const bcrypt = require('bcrypt');
      
      // Check if users exist
      const users = await this.query('SELECT COUNT(*) as count FROM users');
      
      if (users[0].count === 0) {
        // Create test users
        const adminPass = await bcrypt.hash('admin123', 12);
        const driverPass = await bcrypt.hash('driver123', 12);
        const ownerPass = await bcrypt.hash('owner123', 12);
        
        await this.query(`
          INSERT INTO users (username, password, role) VALUES 
          ('admin', ?, 'admin'),
          ('driver1', ?, 'driver'),
          ('driver2', ?, 'driver'),
          ('owner', ?, 'owner')
        `, [adminPass, driverPass, driverPass, ownerPass]);
        
        console.log('✅ Test users created');
      }

      // Check if test data exists
      const drivers = await this.query('SELECT COUNT(*) as count FROM drivers');
      
      if (drivers[0].count === 0) {
        // Insert comprehensive test data
        await this.query(`
          INSERT INTO drivers (driver_code, full_name, national_id, license_number, username, address, phone, start_date) VALUES 
          ('D001', 'สมชาย ใจดี', '1234567890123', 'DL001', 'driver1', '123 ถ.สุขุมวิท กรุงเทพฯ', '081-234-5678', '2024-01-01'),
          ('D002', 'สมหญิง รักงาน', '1234567890124', 'DL002', 'driver2', '456 ถ.พหลโยธิน กรุงเทพฯ', '082-345-6789', '2024-01-15'),
          ('D003', 'วิชัย ขยัน', '1234567890125', 'DL003', NULL, '789 ถ.รัชดา กรุงเทพฯ', '083-456-7890', '2024-02-01'),
          ('D004', 'มาลี สุภาพ', '1234567890126', 'DL004', NULL, '321 ถ.ลาดพร้าว กรุงเทพฯ', '084-567-8901', '2024-02-15')
        `);

        await this.query(`
          INSERT INTO trucks (truck_code, plate_number, model, color, gps_code) VALUES 
          ('T001', 'กข-1234', 'Isuzu D-Max', 'ขาว', 'GPS001'),
          ('T002', 'กข-5678', 'Toyota Hilux', 'น้ำเงิน', 'GPS002'),
          ('T003', 'กข-9012', 'Ford Ranger', 'แดง', 'GPS003'),
          ('T004', 'กข-3456', 'Mitsubishi Triton', 'เงิน', 'GPS004')
        `);

        await this.query(`
          INSERT INTO shops (shop_code, shop_name, phone, address, latitude, longitude) VALUES 
          ('S001', 'ร้านน้ำแข็งสมชาย', '02-123-4567', '789 ถ.ลาดพร้าว กรุงเทพฯ', 13.7563, 100.5018),
          ('S002', 'ร้านน้ำแข็งสมหญิง', '02-234-5678', '321 ถ.รัชดา กรุงเทพฯ', 13.7650, 100.5380),
          ('S003', 'ร้านน้ำแข็งวิชัย', '02-345-6789', '654 ถ.พระราม 4 กรุงเทพฯ', 13.7307, 100.5418),
          ('S004', 'ร้านน้ำแข็งมาลี', '02-456-7890', '987 ถ.สีลม กรุงเทพฯ', 13.7244, 100.5343)
        `);

        // Insert sample tracking data
        await this.query(`
          INSERT INTO tracking (shop_id, latitude, longitude, truck_id, driver_id, gps_code, timestamp) VALUES 
          (1, 13.7563, 100.5018, 1, 1, 'GPS001', datetime('now', '-1 hour')),
          (2, 13.7650, 100.5380, 2, 2, 'GPS002', datetime('now', '-30 minutes')),
          (3, 13.7307, 100.5418, 3, 3, 'GPS003', datetime('now', '-15 minutes')),
          (4, 13.7244, 100.5343, 4, 4, 'GPS004', datetime('now', '-5 minutes'))
        `);

        // Insert sample alerts
        await this.query(`
          INSERT INTO alerts (truck_id, driver_id, message, alert_type, alert_time) VALUES 
          (1, 1, 'รถเสียที่ถนนสุขุมวิท', 'warning', datetime('now', '-2 hours')),
          (2, 2, 'ส่งของเสร็จแล้ว', 'info', datetime('now', '-1 hour')),
          (3, 3, 'น้ำมันใกล้หมด', 'warning', datetime('now', '-30 minutes'))
        `);

        console.log('✅ Comprehensive test data inserted');
      }
    } catch (error) {
      console.error('❌ Seed data error:', error);
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('📴 Database connection closed');
    }
  }
}

const database = new Database();

module.exports = {
  query: (sql, params) => database.query(sql, params),
  connect: () => database.connect(),
  createTables: () => database.createTables(),
  seedData: () => database.seedData(),
  close: () => database.close()
};