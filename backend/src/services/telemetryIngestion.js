// MQTT → TimescaleDB telemetry ingestion handler
const db = require('../config/database');
const logger = require('../config/logger');
const { invalidate } = require('../config/redis');
const websocketService = require('./websocketService');
const { recordTelemetryIngestion, recordAlert } = require('../middleware/observability');

/**
 * Register MQTT topic handlers on the mqttService instance.
 * Called once during bootstrap.
 */
const registerHandlers = (mqttService) => {
    // ── trucks/{truckId}/telemetry ──────────────────────────
    mqttService.on('trucks/+/telemetry', async (data, params) => {
        const truckId = params.p1;
        const {
            latitude,
            longitude,
            temperature,
            speed = 0,
            battery = null,
            humidity = null,
        } = data;

        const startTime = process.hrtime.bigint();
        try {
            // Insert into TimescaleDB hypertable (auto-partitioned by time)
            await db.query(
                `INSERT INTO telemetry (truck_id, latitude, longitude, temperature, speed, battery, humidity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [truckId, latitude, longitude, temperature, speed, battery, humidity],
            );

            // Update materialised "latest position" cache in Redis
            await invalidate(`truck:${truckId}:latest`);

            // Fan-out to WebSocket clients
            websocketService.broadcast('truck-update', {
                id: truckId,
                latitude,
                longitude,
                temperature,
                speed,
                timestamp: new Date().toISOString(),
            });

            // Check temperature thresholds → generate alert
            if (temperature > -2 || temperature < -25) {
                const alertData = {
                    truck_id: truckId,
                    alert_type: 'temperature',
                    message: `Temperature out of range: ${temperature}°C`,
                    severity: temperature > 0 ? 'critical' : 'warning',
                };
                await db.query(
                    `INSERT INTO alerts (truck_id, alert_type, message, severity)
           VALUES ($1, $2, $3, $4)`,
                    [alertData.truck_id, alertData.alert_type, alertData.message, alertData.severity],
                );
                websocketService.broadcast('alert', alertData);
                mqttService.publishMessage(`trucks/${truckId}/alerts`, alertData);
                recordAlert(alertData.severity);
            }

            // Record ingestion metrics
            const elapsed = Number(process.hrtime.bigint() - startTime) / 1e9;
            recordTelemetryIngestion('mqtt', 1, elapsed);
        } catch (err) {
            logger.error({ truckId, err: err.message }, 'Telemetry ingestion error');
        }
    });

    // ── trucks/{truckId}/status ─────────────────────────────
    mqttService.on('trucks/+/status', async (data, params) => {
        const truckId = params.p1;
        try {
            await db.query(
                `UPDATE trucks SET status = $1, updated_at = NOW() WHERE truck_code = $2`,
                [data.status, truckId],
            );
            await invalidate(`truck:${truckId}:*`);
            websocketService.broadcast('truck-status', { id: truckId, ...data });
        } catch (err) {
            logger.error({ truckId, err: err.message }, 'Status update error');
        }
    });

    logger.info('MQTT telemetry handlers registered');
};

module.exports = { registerHandlers };
