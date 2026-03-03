/**
 * Event Bus — Apache Kafka integration for event-driven microservices.
 * Provides producer/consumer abstraction for domain events.
 */
'use strict';

const { EventEmitter } = require('node:events');
const logger = require('../config/logger');

// Topic definitions
const TOPICS = {
    TELEMETRY_RAW: 'ice-truck.telemetry.raw',
    TELEMETRY_PROCESSED: 'ice-truck.telemetry.processed',
    ALERTS: 'ice-truck.alerts',
    TRUCK_STATUS: 'ice-truck.truck.status',
    DRIVER_EVENTS: 'ice-truck.driver.events',
    AUDIT: 'ice-truck.audit',
    NOTIFICATIONS: 'ice-truck.notifications',
    ANOMALY_DETECTION: 'ice-truck.ml.anomaly',
};

/**
 * Kafka Event Bus — wraps kafkajs for the telemetry/alert pipeline.
 * Falls back to in-process EventEmitter when Kafka is unavailable.
 */
class EventBus {
    kafka = null;
    producer = null;
    consumers = new Map();
    connected = false;
    _fallback = new EventEmitter();

    constructor() { } // eslint-disable-line no-useless-constructor

    async connect() {
        const brokers = (process.env.KAFKA_BROKERS || '').split(',').filter(Boolean);
        if (brokers.length === 0) {
            logger.warn('KAFKA_BROKERS not set — using in-process event bus fallback');
            return;
        }

        try {
            const { Kafka, logLevel } = require('kafkajs');
            this.kafka = new Kafka({
                clientId: process.env.KAFKA_CLIENT_ID || 'ice-truck-api',
                brokers,
                logLevel: logLevel.WARN,
                retry: { initialRetryTime: 300, retries: 10 },
                ...(process.env.KAFKA_SASL_USERNAME && {
                    sasl: {
                        mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
                        username: process.env.KAFKA_SASL_USERNAME,
                        password: process.env.KAFKA_SASL_PASSWORD,
                    },
                    ssl: true,
                }),
            });

            this.producer = this.kafka.producer({
                allowAutoTopicCreation: true,
                idempotent: true,
            });

            await this.producer.connect();
            this.connected = true;
            logger.info('Kafka producer connected');
        } catch (err) {
            logger.warn({ err }, 'Kafka connection failed — falling back to in-process events');
        }
    }

    /**
     * Publish an event to a topic.
     */
    async publish(topic, key, value, headers = {}) {
        const message = {
            key: String(key),
            value: JSON.stringify(value),
            headers: {
                'content-type': 'application/json',
                timestamp: String(Date.now()),
                ...headers,
            },
        };

        if (this.connected && this.producer) {
            await this.producer.send({ topic, messages: [message] });
        } else {
            // Fallback: in-process
            this._fallback.emit(topic, { ...message, value });
        }
    }

    /**
     * Subscribe to a topic with a handler.
     */
    async subscribe(topic, groupId, handler) {
        if (this.connected && this.kafka) {
            const consumer = this.kafka.consumer({ groupId });
            await consumer.connect();
            await consumer.subscribe({ topic, fromBeginning: false });
            await consumer.run({
                eachMessage: async ({ message }) => {
                    try {
                        const value = JSON.parse(message.value.toString());
                        await handler(value, message.key?.toString(), message.headers);
                    } catch (err) {
                        logger.error({ err, topic }, 'Error processing Kafka message');
                    }
                },
            });
            this.consumers.set(topic, consumer);
        } else {
            // Fallback: in-process
            this._fallback.on(topic, async (msg) => {
                try {
                    await handler(msg.value, msg.key, msg.headers);
                } catch (err) {
                    logger.error({ err, topic }, 'Error processing event');
                }
            });
        }
    }

    async disconnect() {
        if (this.producer) await this.producer.disconnect();
        for (const consumer of this.consumers.values()) {
            await consumer.disconnect();
        }
        this._fallback.removeAllListeners();
        this.connected = false;
    }
}

// Singleton
const eventBus = new EventBus();

module.exports = { eventBus, TOPICS };
