/* global process, console, setTimeout, clearTimeout */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mqtt from 'mqtt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_MESSAGE_COUNT = 180;
const DEFAULT_DURATION_MS = 15000;
const DEFAULT_TRUCK_COUNT = 8;

function parseIntegerArg(name, fallback) {
  const raw = process.argv.find(arg => arg.startsWith(`${name}=`));
  if (!raw) return fallback;
  const value = Number.parseInt(raw.split('=')[1], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function createTelemetryPayload(index, truckIndex, startedAt) {
  const orbit = index / 18;
  const centerLat = 13.7563 + truckIndex * 0.004;
  const centerLon = 100.5018 + truckIndex * 0.004;
  const latitude = centerLat + Math.sin(orbit) * 0.0018;
  const longitude = centerLon + Math.cos(orbit) * 0.0018;

  return {
    latitude: round(latitude),
    longitude: round(longitude),
    temperature: round(-12 + Math.sin(index / 12) * 1.8, 2),
    speed: round(42 + Math.abs(Math.sin(index / 8)) * 38, 2),
    battery: round(88 - (index % 30) * 0.12, 2),
    humidity: round(58 + Math.cos(index / 10) * 6, 2),
    heading: Math.round((index * 11) % 360),
    timestamp: startedAt + index * 45,
  };
}

async function main() {
  const messageCount = parseIntegerArg('--messages', DEFAULT_MESSAGE_COUNT);
  const durationMs = parseIntegerArg('--durationMs', DEFAULT_DURATION_MS);
  const truckCount = parseIntegerArg('--trucks', DEFAULT_TRUCK_COUNT);

  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const username = process.env.MQTT_USERNAME || undefined;
  const password = process.env.MQTT_PASSWORD || undefined;

  const client = mqtt.connect(brokerUrl, {
    username,
    password,
    clientId: `live-smoke-${Date.now()}-${process.pid}`,
    clean: true,
    reconnectPeriod: 0,
    connectTimeout: 10000,
  });

  await new Promise((resolve, reject) => {
    const connectTimeout = setTimeout(() => {
      reject(new Error(`Timed out connecting to MQTT broker at ${brokerUrl}`));
    }, 12000);

    client.once('connect', () => {
      clearTimeout(connectTimeout);
      resolve();
    });

    client.once('error', error => {
      clearTimeout(connectTimeout);
      if (error instanceof Error) {
        reject(error);
        return;
      }
      reject(new Error('MQTT connection error without message payload'));
    });
  });

  const startedAt = Date.now();
  const intervalMs = Math.max(12, Math.floor(durationMs / messageCount));

  console.log('--- LIVE TELEMETRY SMOKE TEST ---');
  console.log(`broker: ${brokerUrl}`);
  console.log(`messages: ${messageCount}`);
  console.log(`durationMs: ${durationMs}`);
  console.log(`trucks: ${truckCount}`);
  console.log(`intervalMs: ${intervalMs}`);

  let sent = 0;

  while (sent < messageCount) {
    const truckIndex = sent % truckCount;
    const truckId = `LIVE-SMOKE-${String(truckIndex + 1).padStart(3, '0')}`;
    const topic = `trucks/${truckId}/telemetry`;
    const payload = createTelemetryPayload(sent, truckIndex, startedAt);

    await new Promise((resolve, reject) => {
      client.publish(topic, JSON.stringify(payload), { qos: 0 }, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    sent += 1;

    if (sent < messageCount) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  client.end(true);

  const elapsedMs = Date.now() - startedAt;
  console.log(`sent: ${sent}`);
  console.log(`elapsedMs: ${elapsedMs}`);
  console.log('status: PASS');
}

try {
  await main();
} catch (error) {
  if (error instanceof Error) {
    console.error('live-smoke-test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error('live-smoke-test failed with unknown error');
  }
  process.exit(1);
}
