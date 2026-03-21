// MQTT Service — Eclipse Mosquitto IoT message broker integration
const mqtt = require('mqtt');
const { z } = require('zod');
const config = require('../config/env');
const logger = require('../config/logger');

class MqttService {
    client = null;
    handlers = new Map();

    telemetryPayloadSchema = z.object({
        latitude: z.coerce.number().min(-90).max(90),
        longitude: z.coerce.number().min(-180).max(180),
        temperature: z.coerce.number().min(-80).max(120),
        speed: z.coerce.number().min(0).max(300).default(0),
        battery: z.coerce.number().min(0).max(100).nullable().optional(),
        humidity: z.coerce.number().min(0).max(100).nullable().optional(),
        heading: z.coerce.number().min(0).max(360).nullable().optional(),
        timestamp: z.union([z.coerce.date(), z.coerce.number().int().positive()]).optional(),
    }).passthrough();

    /**
     * Connect to MQTT broker and subscribe to truck telemetry topics
     */
    connect() {
        const brokerUrl = config.MQTT_BROKER_URL;
        logger.info({ brokerUrl }, 'Connecting to MQTT broker');

        this.client = mqtt.connect(brokerUrl, {
            clientId: `ice-truck-backend-${process.pid}`,
            clean: true,
            connectTimeout: 10000,
            reconnectPeriod: 5000,
            username: config.MQTT_USERNAME || undefined,
            password: config.MQTT_PASSWORD || undefined,
        });

        this.client.on('connect', () => {
            logger.info('MQTT broker connected');
            this._subscribeAll();
        });

        this.client.on('error', (err) => {
            logger.error({ err: err.message }, 'MQTT error');
        });

        this.client.on('reconnect', () => {
            logger.warn('MQTT reconnecting…');
        });

        this.client.on('message', (topic, payload) => {
            this._handleMessage(topic, payload);
        });

        return this;
    }

    /** Subscribe to default IoT topics */
    _subscribeAll() {
        const topics = [
            'trucks/+/telemetry',   // temperature, GPS, speed
            'trucks/+/status',      // online / offline / maintenance
            'trucks/+/alerts',      // threshold violations (temp, geofence)
            'system/broadcast',     // system-wide announcements
        ];

        topics.forEach((topic) => {
            this.client.subscribe(topic, { qos: 1 }, (err) => {
                if (err) logger.error({ topic, err: err.message }, 'MQTT subscribe error');
                else logger.info({ topic }, 'MQTT subscribed');
            });
        });
    }

    /**
     * Register a handler function for a topic pattern.
     * @param {string} topicPattern - MQTT topic (supports + and # wildcards)
     * @param {Function} handler - (parsedPayload, params, topic) => void
     * @param {{schema?: import('zod').ZodTypeAny}} [options]
     */
    on(topicPattern, handler, options = {}) {
        this.handlers.set(topicPattern, {
            handler,
            schema: options.schema,
        });
        return this;
    }

    /** Internal dispatcher */
    _handleMessage(topic, payload) {
        let data;
        try {
            data = JSON.parse(payload.toString());
        } catch {
            logger.warn({ topic }, 'MQTT non-JSON payload');
            return;
        }

        for (const [pattern, entry] of this.handlers) {
            const params = this._matchTopic(pattern, topic);
            if (params) {
                try {
                    if (entry.schema) {
                        const parsed = entry.schema.safeParse(data);
                        if (!parsed.success) {
                            logger.warn(
                                {
                                    topic,
                                    issues: parsed.error.issues,
                                },
                                'MQTT payload validation failed',
                            );
                            continue;
                        }
                        entry.handler(parsed.data, params, topic);
                        continue;
                    }

                    entry.handler(data, params, topic);
                } catch (err) {
                    logger.error({ topic, err: err.message }, 'MQTT handler error');
                }
            }
        }
    }

    /**
     * Simple MQTT topic matcher supporting + (single-level) wildcard
     * Returns an object mapping positional wildcards to values, or null
     */
    _matchTopic(pattern, topic) {
        const patternParts = pattern.split('/');
        const topicParts = topic.split('/');
        if (patternParts.length !== topicParts.length) return null;

        const params = {};
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i] === '+') {
                params[`p${i}`] = topicParts[i];
            } else if (patternParts[i] !== topicParts[i]) {
                return null;
            }
        }
        return params;
    }

    /**
     * Publish a message to an MQTT topic
     * @param {string} topic
     * @param {object} payload
     * @param {object} [opts]
     */
    publishMessage(topic, payload, opts) {
        const publishOpts = { qos: 1, ...opts };
        if (!this.client?.connected) {
            logger.warn('MQTT client not connected — message dropped');
            return;
        }
        this.client.publish(topic, JSON.stringify(payload), publishOpts);
    }

    /** Graceful shutdown */
    async close() {
        return new Promise((resolve) => {
            if (this.client) {
                this.client.end(false, {}, resolve);
            } else {
                resolve();
            }
        });
    }
}

module.exports = new MqttService();
