const db = require('../config/database');

class TruckRepository {
  async getAll() {
    return db.query('SELECT * FROM trucks ORDER BY truck_code');
  }

  async getById(id) {
    return db.get('SELECT * FROM trucks WHERE id = $1', [id]);
  }

  async create(truck) {
    const rows = await db.query(
      `INSERT INTO trucks (truck_code, plate_number, model, color, gps_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [truck.truck_code, truck.plate_number, truck.model, truck.color, truck.gps_code],
    );
    return rows[0];
  }

  async updateStatus(truckCode, status) {
    await db.query(
      'UPDATE trucks SET status = $1, updated_at = NOW() WHERE truck_code = $2',
      [status, truckCode],
    );
  }
}

module.exports = new TruckRepository();
