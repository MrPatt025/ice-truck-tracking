const db = require('../config/database');

class AlertRepository {
    async getAll() {
        return db.query(`
      SELECT a.*, d.full_name as driver_name, t.plate_number
      FROM alerts a
      LEFT JOIN drivers d ON a.driver_id = d.id
      LEFT JOIN trucks t ON a.truck_id = t.id
      ORDER BY a.alert_time DESC
    `);
    }

    async create(alert) {
        const result = await db.query(
            `INSERT INTO alerts (truck_id, driver_id, message, alert_type, alert_time) VALUES (?, ?, ?, ?, datetime('now'))`,
            [alert.truck_id, alert.driver_id, alert.message, alert.alert_type]
        );
        const newAlert = await db.query('SELECT * FROM alerts WHERE id = ?', [result.lastID]);
        return newAlert[0] || null;
    }
}

module.exports = new AlertRepository(); 
