 
'use strict';

process.env.USE_FAKE_DB = 'false';

const mqtt = require('mqtt');
const db = require('../src/config/database');
const config = require('../src/config/env');
const mqttService = require('../src/services/mqttService');
const { registerHandlers } = require('../src/services/telemetryIngestion');
const websocketService = require('../src/services/websocketService');

const TEST_TRUCK_ID = `smoke-${Date.now()}`;
const TELEMETRY_TOPIC = `trucks/${TEST_TRUCK_ID}/telemetry`;
const TOTAL_MESSAGES = 120;
const PUBLISH_TIMEOUT_MS = 8000;
const VERIFY_TIMEOUT_MS = 12000;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCount(expected) {
  const start = Date.now();
  while (Date.now() - start < VERIFY_TIMEOUT_MS) {
    const rows = await db.query(
      'SELECT COUNT(*)::int AS total FROM telemetry WHERE truck_id = $1',
      [TEST_TRUCK_ID],
    );
    const total = rows?.[0]?.total ?? 0;
    if (total >= expected) return total;
    await sleep(200);
  }

  const finalRows = await db.query(
    'SELECT COUNT(*)::int AS total FROM telemetry WHERE truck_id = $1',
    [TEST_TRUCK_ID],
  );
  return finalRows?.[0]?.total ?? 0;
}

async function main() {
  let broadcastCount = 0;
  let lastBroadcastPayload = null;
  const originalBroadcast = websocketService.broadcast.bind(websocketService);

  websocketService.broadcast = (event, payload) => {
    if (event === 'truck-update') {
      broadcastCount += 1;
      lastBroadcastPayload = payload;
    }
    originalBroadcast(event, payload);
  };

  try {
    await db.query('DELETE FROM telemetry WHERE truck_id = $1', [TEST_TRUCK_ID]);

    mqttService.connect();
    registerHandlers(mqttService);

    await new Promise((resolve, reject) => {
      const started = Date.now();
      const interval = setInterval(() => {
        if (mqttService.client?.connected) {
          clearInterval(interval);
          resolve();
        }
        if (Date.now() - started > PUBLISH_TIMEOUT_MS) {
          clearInterval(interval);
          reject(new Error('Timed out waiting for MQTT service connection'));
        }
      }, 100);
    });

    const publisher = mqtt.connect(config.MQTT_BROKER_URL, {
      clientId: `telemetry-smoke-publisher-${process.pid}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 0,
    });

    await new Promise((resolve, reject) => {
      publisher.on('connect', resolve);
      publisher.on('error', reject);
    });

    const publishes = [];
    const baseLat = 13.7563;
    const baseLng = 100.5018;
    const now = Date.now();

    for (let i = 0; i < TOTAL_MESSAGES; i += 1) {
      const payload = {
        latitude: baseLat + i * 0.00001,
        longitude: baseLng + i * 0.00001,
        temperature: -10 + (i % 3) * 0.2,
        speed: 45 + (i % 5),
        battery: 88,
        humidity: 62,
        heading: (i * 3) % 360,
        timestamp: now + i,
      };

      publishes.push(new Promise((resolve, reject) => {
        publisher.publish(TELEMETRY_TOPIC, JSON.stringify(payload), { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }));
    }

    await Promise.all(publishes);

    await sleep(1000);

    const persisted = await waitForCount(TOTAL_MESSAGES);

    const passed = persisted === TOTAL_MESSAGES && broadcastCount >= TOTAL_MESSAGES;

    console.log('--- TELEMETRY SMOKE TEST RESULT ---');
    console.log(`truckId: ${TEST_TRUCK_ID}`);
    console.log(`published: ${TOTAL_MESSAGES}`);
    console.log(`persisted_to_timescaledb: ${persisted}`);
    console.log(`socketio_truck_update_events: ${broadcastCount}`);
    console.log(`zod_parse_and_pipeline_status: ${passed ? 'PASS' : 'FAIL'}`);
    if (lastBroadcastPayload) {
      console.log('sample_broadcast_payload:', JSON.stringify(lastBroadcastPayload));
    }

    publisher.end(true);

    if (!passed) {
      throw new Error(
        `Pipeline verification failed. expected=${TOTAL_MESSAGES}, persisted=${persisted}, broadcast=${broadcastCount}`,
      );
    }
  } finally {
    websocketService.broadcast = originalBroadcast;
    await mqttService.close();
    await db.close();
  }
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
