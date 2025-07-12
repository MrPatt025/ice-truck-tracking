const db = require('../config/database');

class TruckRepository {
  async getAll() {
    return db.query('SELECT * FROM trucks ORDER BY truck_code');
  }

  async getById(id) {
    const result = await db.query('SELECT * FROM trucks WHERE id = ?', [id]);
    return result[0] || null;
  }

  async create(truck) {
    const result = await db.query(
      `INSERT INTO trucks (truck_code, plate_number, model, color, gps_code) VALUES (?, ?, ?, ?, ?)`,
      [truck.truck_code, truck.plate_number, truck.model, truck.color, truck.gps_code]
    );
    return this.getById(result.lastID);
  }
}

module.exports = new TruckRepository();
