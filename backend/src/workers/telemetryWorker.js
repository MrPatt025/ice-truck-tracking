'use strict';

const db = require('../config/database');
const logger = require('../config/logger');
const { invalidate } = require('../config/redis');
const websocketService = require('../services/websocketService');
const mqttService = require('../services/mqttService');
const { eventBus, TOPICS } = require('../services/eventBus');
const {
  recordTelemetryDbInsert,
  recordDbQuery,
  recordAlert,
} = require('../middleware/observability');

/**
 * Telemetry Worker — Consumes raw telemetry from Kafka and persists to TimescaleDB.
 * Implements the backend C4 architecture for decoupling high-throughput ingestion.
 */
async function startTelemetryWorker() {
  logger.info('Starting Telemetry Worker...');

  await eventBus.subscribe(
    TOPICS.TELEMETRY_RAW,
    'telemetry-db-writer',
    async (payload, _key, _headers) => {
      const { truckId, telemetry, observedAt } = payload;

      try {
        // Insert into TimescaleDB hypertable
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
          ]
        );
        const insertElapsed = Number(process.hrtime.bigint() - insertStartTime) / 1e9;
        recordDbQuery('insert', insertElapsed);
        recordTelemetryDbInsert(insertElapsed);

        // Update materialized "latest position" cache in Redis
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
          timestamp: observedAt,
        });

        // Check temperature thresholds -> generate alert
        if (telemetry.temperature > -2 || telemetry.temperature < -25) {
          const alertData = {
            truck_id: truckId,
            alert_type: 'temperature',
            message: `Temperature out of range: ${telemetry.temperature}°C`,
            severity: telemetry.temperature > 0 ? 'critical' : 'warning',
          };

          await eventBus.publish(TOPICS.ALERTS, truckId, alertData);

          await db.query(
            `INSERT INTO alerts (truck_id, alert_type, message, severity)
           VALUES ($1, $2, $3, $4)`,
            [alertData.truck_id, alertData.alert_type, alertData.message, alertData.severity]
          );

          websocketService.broadcast('alert', alertData);
          mqttService.publishMessage(`trucks/${truckId}/alerts`, alertData);
          recordAlert(alertData.severity);
        }
      } catch (err) {
        logger.error({ err: err.message, truckId }, 'Error in Telemetry Worker DB Insert');
      }
    }
  );

  await eventBus.subscribe(TOPICS.TRUCK_STATUS, 'truck-status-writer', async payload => {
    const { truckId, status } = payload;
    try {
      await db.query(`UPDATE trucks SET status = $1, updated_at = NOW() WHERE id = $2`, [
        status,
        truckId,
      ]);
      await invalidate(`truck:${truckId}:*`);
      websocketService.broadcast('truck-status', { id: truckId, status });
    } catch (err) {
      logger.error({ err: err.message, truckId }, 'Error in Truck Status Worker');
    }
  });

  logger.info('Telemetry Worker running.');
}

module.exports = { startTelemetryWorker };
