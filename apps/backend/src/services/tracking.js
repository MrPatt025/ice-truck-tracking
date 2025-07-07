const db = require('../config/db');

class TrackingService {
  static async createTracking(data) {
    const { shop_code, latitude, longitude, truck_code, driver_code, gps_code } = data;
    const [result] = await db.query(
      'INSERT INTO tracking (shop_code, latitude, longitude, truck_code, driver_code, gps_code, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [shop_code, latitude, longitude, truck_code, driver_code, gps_code, new Date()]
    );
    return result;
  }

  static async getTrackingHistory(filters = {}) {
    let query = 'SELECT * FROM tracking';
    const params = [];
    const conditions = [];

    if (filters.truck_code) {
      conditions.push('truck_code = ?');
      params.push(filters.truck_code);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  static async getLatestPosition(truck_code) {
    const [rows] = await db.query(
      'SELECT * FROM tracking WHERE truck_code = ? ORDER BY timestamp DESC LIMIT 1',
      [truck_code]
    );
    return rows[0] || null;
  }
}

module.exports = TrackingService;
