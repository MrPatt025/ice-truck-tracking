const db = require('../config/database');

class DriverRepository {
  async getAll() {
    return db.query(
      'SELECT id, driver_code, full_name, national_id, license_number, username, address, phone, start_date FROM drivers ORDER BY full_name'
    );
  }

  async getById(id) {
    return db.get(
      'SELECT id, driver_code, full_name, national_id, license_number, username, address, phone, start_date FROM drivers WHERE id = $1 ORDER BY id DESC LIMIT 1',
      [id]
    );
  }

  async create(driver) {
    const rows = await db.query(
      `INSERT INTO drivers (driver_code, full_name, national_id, license_number, username, address, phone, start_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        driver.driver_code, driver.full_name, driver.national_id,
        driver.license_number, driver.username, driver.address,
        driver.phone, driver.start_date,
      ],
    );
    return rows[0];
  }
}

module.exports = new DriverRepository();
