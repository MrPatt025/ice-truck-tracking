const db = require('../config/database');

class DriverRepository {
  async getAll() {
    return db.query('SELECT * FROM drivers ORDER BY full_name');
  }

  async getById(id) {
    const result = await db.query('SELECT * FROM drivers WHERE id = ?', [id]);
    return result[0] || null;
  }

  async create(driver) {
    const result = await db.query(
      `INSERT INTO drivers (driver_code, full_name, national_id, license_number, username, address, phone, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        driver.driver_code,
        driver.full_name,
        driver.national_id,
        driver.license_number,
        driver.username,
        driver.address,
        driver.phone,
        driver.start_date,
      ]
    );
    return this.getById(result.lastID);
  }
}

module.exports = new DriverRepository();
