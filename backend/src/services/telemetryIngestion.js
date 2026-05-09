// MQTT → TimescaleDB telemetry ingestion handler
const { z } = require('zod');
const logger = require('../config/logger');
const { eventBus, TOPICS } = require('./eventBus');
const {
    recordTelemetryIngestion,
    recordMqttMessage,
} = require('../middleware/observability');

function isSafeTopicTruckId(value) {
    if (typeof value !== 'string') {
        return false;
    }

    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 64) {
        return false;
    }

    for (const character of trimmed) {
        const code = character.codePointAt(0);
        const isDigit = code >= 48 && code <= 57;
        const isUppercase = code >= 65 && code <= 90;
        const isLowercase = code >= 97 && code <= 122;
        const isAllowedSymbol = character === '_' || character === '-';

        if (!isDigit && !isUppercase && !isLowercase && !isAllowedSymbol) {
            return false;
        }
    }

    return true;
}

const topicTruckIdSchema = z.string().trim().min(1).max(64).refine(isSafeTopicTruckId, {
    message: 'Truck topic IDs may only contain letters, numbers, hyphens, and underscores',
});

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
            // Publish raw telemetry to Kafka for processing by workers
            await eventBus.publish(TOPICS.TELEMETRY_RAW, truckId, {
                truckId,
                telemetry,
                observedAt,
            });

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
            await eventBus.publish(TOPICS.TRUCK_STATUS, truckId, {
                truckId,
                status: data.status,
            });
        } catch (err) {
            logger.error({ truckId, err: err.message }, 'Status update error');
        }
    });

    logger.info('MQTT telemetry handlers registered');
};

module.exports = { registerHandlers };
