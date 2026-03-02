const db = require('../config/database');

class AlertRepository {
  async getAll() {
    return db.query(`
      SELECT a.*, d.full_name AS driver_name, t.plate_number
      FROM alerts a
      LEFT JOIN drivers d ON a.driver_id = d.id
      LEFT JOIN trucks  t ON a.truck_id  = t.truck_code
      ORDER BY a.time DESC
      LIMIT 200
    `);
  }

  async create(alert) {
    const rows = await db.query(
      `INSERT INTO alerts (truck_id, driver_id, alert_type, message, severity)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [alert.truck_id, alert.driver_id, alert.alert_type, alert.message, alert.severity || 'warning'],
    );
    return rows[0];
  }

  async resolve(alertTime, truckId, userId) {
    await db.query(
      `UPDATE alerts SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1
       WHERE time = $2 AND truck_id = $3`,
      [userId, alertTime, truckId],
    );
  }
}

module.exports = new AlertRepository();
