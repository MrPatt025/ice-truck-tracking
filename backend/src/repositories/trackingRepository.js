const db = require('../config/database');

class TrackingRepository {
    async create(data) {
        const result = await db.query(
            `INSERT INTO tracking (truck_id, latitude, longitude, speed, heading, time)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
            [data.truck_id, data.latitude, data.longitude, data.speed || 0, data.heading || 0]
        );
        return result[0];
    }

    async findByTruckId(truckId, options = {}) {
        const { limit = 100, offset = 0 } = options;
        return db.query(
            `SELECT id, truck_id, latitude, longitude, speed, heading, time FROM tracking
       WHERE truck_id = $1
       ORDER BY time DESC
       LIMIT $2 OFFSET $3`,
            [truckId, limit, offset]
        );
    }

    async findLatestByTruckId(truckId) {
        const rows = await db.query(
            `SELECT id, truck_id, latitude, longitude, speed, heading, time FROM tracking
       WHERE truck_id = $1
       ORDER BY time DESC
       LIMIT 1`,
            [truckId]
        );
        return rows[0] || null;
    }

    async findLatestAll() {
        return db.query(
            `SELECT DISTINCT ON (truck_id) id, truck_id, latitude, longitude, speed, heading, time
       FROM tracking
       ORDER BY truck_id, time DESC`
        );
    }

    async findInTimeRange(truckId, startTime, endTime) {
        return db.query(
            `SELECT id, truck_id, latitude, longitude, speed, heading, time FROM tracking
       WHERE truck_id = $1 AND time BETWEEN $2 AND $3
       ORDER BY time ASC`,
            [truckId, startTime, endTime]
        );
    }

    async getAggregated(truckId, intervalMinutes = 5) {
        return db.query(
            `SELECT
         time_bucket($1::interval, time) AS bucket,
         truck_id,
         AVG(speed) AS avg_speed,
         AVG(latitude) AS avg_lat,
         AVG(longitude) AS avg_lng,
         COUNT(*) AS point_count
       FROM tracking
       WHERE truck_id = $2
       GROUP BY bucket, truck_id
       ORDER BY bucket DESC
       LIMIT 288`,
            [`${intervalMinutes} minutes`, truckId]
        );
    }

    async deleteOlderThan(days = 90) {
        const result = await db.query(
            `DELETE FROM tracking WHERE time < NOW() - $1::interval RETURNING id`,
            [`${days} days`]
        );
        return result.length;
    }
}

module.exports = new TrackingRepository();
