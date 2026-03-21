// MQTT → TimescaleDB telemetry ingestion handler
const { z } = require('zod');
const db = require('../config/database');
const logger = require('../config/logger');
const { invalidate } = require('../config/redis');
const websocketService = require('./websocketService');
const {
    recordTelemetryIngestion,
    recordAlert,
    recordDbQuery,
    recordTelemetryDbInsert,
    recordMqttMessage,
} = require('../middleware/observability');

const topicTruckIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

const telemetryMessageSchema = z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    temperature: z.coerce.number().min(-80).max(120),
    speed: z.coerce.number().min(0).max(300).default(0),
    battery: z.coerce.number().min(0).max(100).nullable().optional(),
    humidity: z.coerce.number().min(0).max(100).nullable().optional(),
    heading: z.coerce.number().min(0).max(360).nullable().optional(),
    timestamp: z.union([z.coerce.date(), z.coerce.number().int().positive()]).optional(),
}).passthrough();

function toObservedAt(timestamp) {
    if (timestamp === undefined || timestamp === null) {
        return new Date();
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    return new Date(timestamp);
}

/**
 * Register MQTT topic handlers on the mqttService instance.
 * Called once during bootstrap.
 */
const registerHandlers = (mqttService) => {
    // ── trucks/{truckId}/telemetry ──────────────────────────
    mqttService.on('trucks/+/telemetry', async (data, params) => {
        recordMqttMessage('trucks/+/telemetry', 'received');

        const truckIdResult = topicTruckIdSchema.safeParse(params.p1);
        if (!truckIdResult.success) {
            logger.warn({ topicValue: params.p1 }, 'Invalid truckId in telemetry topic');
            recordMqttMessage('trucks/+/telemetry', 'rejected');
            return;
        }

        const parsedTelemetry = telemetryMessageSchema.safeParse(data);
        if (!parsedTelemetry.success) {
            logger.warn(
                {
                    truckId: params.p1,
                    issues: parsedTelemetry.error.issues,
                },
                'Rejected telemetry payload from MQTT',
            );
            recordMqttMessage('trucks/+/telemetry', 'rejected');
            return;
        }

        const truckId = truckIdResult.data;
        const telemetry = parsedTelemetry.data;
        const observedAt = toObservedAt(telemetry.timestamp);

        const ingestionStartTime = process.hrtime.bigint();
        try {
            // Insert into TimescaleDB hypertable (auto-partitioned by time)
            const insertStartTime = process.hrtime.bigint();
            await db.query(
                `INSERT INTO telemetry (
           time,
           truck_id,
           latitude,
           longitude,
           temperature,
           speed,
           battery,
           humidity,
           heading
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    observedAt,
                    truckId,
                    telemetry.latitude,
                    telemetry.longitude,
                    telemetry.temperature,
                    telemetry.speed,
                    telemetry.battery ?? null,
                    telemetry.humidity ?? null,
                    telemetry.heading ?? null,
                ],
            );
            const insertElapsed = Number(process.hrtime.bigint() - insertStartTime) / 1e9;
            recordDbQuery('insert', insertElapsed);
            recordTelemetryDbInsert(insertElapsed);

            // Update materialised "latest position" cache in Redis
            await invalidate(`truck:${truckId}:latest`);

            // Fan-out to WebSocket clients
            websocketService.broadcast('truck-update', {
                id: truckId,
                truckId,
                latitude: telemetry.latitude,
                longitude: telemetry.longitude,
                lat: telemetry.latitude,
                lng: telemetry.longitude,
                temperature: telemetry.temperature,
                speed: telemetry.speed,
                heading: telemetry.heading ?? 0,
                battery: telemetry.battery ?? null,
                humidity: telemetry.humidity ?? null,
                timestamp: observedAt.toISOString(),
            });

            // Check temperature thresholds → generate alert
            if (telemetry.temperature > -2 || telemetry.temperature < -25) {
                const alertData = {
                    truck_id: truckId,
                    alert_type: 'temperature',
                    message: `Temperature out of range: ${telemetry.temperature}°C`,
                    severity: telemetry.temperature > 0 ? 'critical' : 'warning',
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
            const elapsed = Number(process.hrtime.bigint() - ingestionStartTime) / 1e9;
            recordTelemetryIngestion('mqtt', 1, elapsed);
            recordMqttMessage('trucks/+/telemetry', 'processed');
        } catch (err) {
            recordMqttMessage('trucks/+/telemetry', 'error');
            logger.error({ truckId, err: err.message }, 'Telemetry ingestion error');
        }
    }, { schema: mqttService.telemetryPayloadSchema });

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
