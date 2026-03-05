/**
 * Ring 5 — SITL (Software-in-the-Loop) 10k Truck Simulator
 *
 * Generates realistic telemetry for 10,000 trucks with:
 *   - Random GPS drift within Bangkok metro area
 *   - Packet loss / jitter
 *   - Temperature spikes (cold-chain violations)
 *   - Burst traffic (rush hour patterns)
 *
 * Can be used standalone or imported by test harnesses.
 */
import type { TruckTelemetry, TruckStatus } from '../../types';

// ─── Configuration ─────────────────────────────────────────────

export interface SITLConfig {
    truckCount: number;
    tickIntervalMs: number;
    packetLossRate: number;     // 0-1 probability of dropping a packet
    burstMultiplier: number;    // spike traffic multiplier
    burstDurationMs: number;
    areaCenter: { lat: number; lng: number };
    areaRadiusKm: number;
    temperatureRange: { min: number; max: number };
    spikeChance: number;        // probability of temperature spike per tick
}

export const DEFAULT_SITL_CONFIG: SITLConfig = {
    truckCount: 10_000,
    tickIntervalMs: 500,
    packetLossRate: 0.02,       // 2% packet loss
    burstMultiplier: 5,
    burstDurationMs: 10_000,
    areaCenter: { lat: 13.7563, lng: 100.5018 }, // Bangkok
    areaRadiusKm: 50,
    temperatureRange: { min: -25, max: -5 },
    spikeChance: 0.005,         // 0.5% chance of temp spike per truck per tick
};

// ─── Truck State ───────────────────────────────────────────────

interface TruckState {
    id: string;
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    temperature: number;
    fuelLevel: number;
    engineRpm: number;
    odometer: number;
    status: TruckStatus;
    driverName: string;
    routeId: string;
    // Internal simulation state
    _targetLat: number;
    _targetLng: number;
    _spiking: boolean;
    _spikeCountdown: number;
}

// ─── Helpers ───────────────────────────────────────────────────

function randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function randomOffset(center: number, radiusDeg: number): number {
    return center + (Math.random() - 0.5) * 2 * radiusDeg;
}

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

const KM_TO_DEG_LAT = 1 / 111.32;
const KM_TO_DEG_LNG = 1 / (111.32 * Math.cos(13.75 * Math.PI / 180));

const DRIVER_NAMES = [
    'Somchai', 'Prawit', 'Suthep', 'Nattawut', 'Yingluck',
    'Prayuth', 'Abhisit', 'Thaksin', 'Apirat', 'Surapong',
];

const STATUSES: TruckStatus[] = ['active', 'idle', 'offline', 'maintenance', 'alert'];

// ═══════════════════════════════════════════════════════════════
//  SIMULATOR CLASS
// ═══════════════════════════════════════════════════════════════

export class SITLSimulator {
    private readonly config: SITLConfig;
    private readonly trucks: TruckState[] = [];
    private _tick = 0;
    private _bursting = false;
    private _burstEnd = 0;
    private _running = false;
    private _intervalId: ReturnType<typeof setInterval> | null = null;

    // Stats
    private _totalPackets = 0;
    private _droppedPackets = 0;
    private _spikes = 0;

    constructor(config: Partial<SITLConfig> = {}) {
        this.config = { ...DEFAULT_SITL_CONFIG, ...config };
        this.initTrucks();
    }

    // ── Initialization ─────────────────────────────────────────

    private initTrucks(): void {
        const { truckCount, areaCenter, areaRadiusKm, temperatureRange } = this.config;
        const latRadius = areaRadiusKm * KM_TO_DEG_LAT;
        const lngRadius = areaRadiusKm * KM_TO_DEG_LNG;

        for (let i = 0; i < truckCount; i++) {
            const lat = randomOffset(areaCenter.lat, latRadius);
            const lng = randomOffset(areaCenter.lng, lngRadius);

            this.trucks.push({
                id: `SITL-${String(i).padStart(5, '0')}`,
                lat,
                lng,
                speed: randomInRange(0, 80),
                heading: randomInRange(0, 360),
                temperature: randomInRange(temperatureRange.min, temperatureRange.max),
                fuelLevel: randomInRange(20, 100),
                engineRpm: randomInRange(800, 3500),
                odometer: randomInRange(5000, 200000),
                status: Math.random() > 0.1 ? 'active' : STATUSES[Math.floor(Math.random() * STATUSES.length)],
                driverName: DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)],
                routeId: `R${Math.floor(Math.random() * 50) + 1}`,
                _targetLat: randomOffset(areaCenter.lat, latRadius),
                _targetLng: randomOffset(areaCenter.lng, lngRadius),
                _spiking: false,
                _spikeCountdown: 0,
            });
        }
    }

    // ── Movement Helpers ──────────────────────────────────────

    private updateGPSPosition(truck: TruckState, latRadius: number, lngRadius: number): void {
        const dLat = (truck._targetLat - truck.lat) * 0.02;
        const dLng = (truck._targetLng - truck.lng) * 0.02;
        truck.lat += dLat + (Math.random() - 0.5) * 0.001;
        truck.lng += dLng + (Math.random() - 0.5) * 0.001;

        const dist = Math.hypot(truck.lat - truck._targetLat, truck.lng - truck._targetLng);
        if (dist < 0.01) {
            truck._targetLat = randomOffset(this.config.areaCenter.lat, latRadius);
            truck._targetLng = randomOffset(this.config.areaCenter.lng, lngRadius);
        }

        truck.speed = clamp(truck.speed + (Math.random() - 0.5) * 5, 0, 120);
        truck.heading = (truck.heading + (Math.random() - 0.5) * 15 + 360) % 360;
    }

    private updateTemperature(truck: TruckState): void {
        const { spikeChance, temperatureRange } = this.config;
        if (truck._spiking) {
            truck._spikeCountdown--;
            if (truck._spikeCountdown <= 0) {
                truck._spiking = false;
                truck.temperature = randomInRange(temperatureRange.min, temperatureRange.max);
            }
        } else if (Math.random() < spikeChance) {
            truck._spiking = true;
            truck._spikeCountdown = Math.floor(randomInRange(5, 20));
            truck.temperature = randomInRange(5, 25);
            truck.status = 'alert';
            this._spikes++;
        } else {
            truck.temperature = clamp(
                truck.temperature + (Math.random() - 0.5) * 0.5,
                temperatureRange.min,
                temperatureRange.max,
            );
        }
    }

    // ── Tick Simulation ────────────────────────────────────────

    /** Advance simulation by one tick. Returns telemetry batch. */
    tick(): TruckTelemetry[] {
        this._tick++;
        const batch: TruckTelemetry[] = [];
        const { packetLossRate, areaRadiusKm } = this.config;
        const latRadius = areaRadiusKm * KM_TO_DEG_LAT;
        const lngRadius = areaRadiusKm * KM_TO_DEG_LNG;

        for (const truck of this.trucks) {
            if (Math.random() < packetLossRate) {
                this._droppedPackets++;
                this._totalPackets++;
                continue;
            }

            this.updateGPSPosition(truck, latRadius, lngRadius);
            this.updateTemperature(truck);

            truck.fuelLevel = clamp(truck.fuelLevel - Math.random() * 0.05, 0, 100);
            truck.odometer += truck.speed * (this.config.tickIntervalMs / 3_600_000);
            truck.engineRpm = truck.speed > 0
                ? clamp(800 + truck.speed * 30 + (Math.random() - 0.5) * 200, 800, 6000)
                : 800;

            if (!truck._spiking && truck.status === 'alert') truck.status = 'active';
            if (truck.fuelLevel < 5) truck.status = 'maintenance';

            batch.push({
                id: truck.id,
                lat: truck.lat,
                lng: truck.lng,
                speed: Math.round(truck.speed * 10) / 10,
                heading: Math.round(truck.heading),
                temperature: Math.round(truck.temperature * 10) / 10,
                fuelLevel: Math.round(truck.fuelLevel * 10) / 10,
                engineRpm: Math.round(truck.engineRpm),
                odometer: Math.round(truck.odometer),
                status: truck.status,
                driverName: truck.driverName,
                routeId: truck.routeId,
                timestamp: Date.now(),
            });

            this._totalPackets++;
        }

        return batch;
    }

    // ── Burst Traffic ──────────────────────────────────────────

    /** Trigger a burst of rapid updates (simulates rush hour) */
    triggerBurst(): void {
        this._bursting = true;
        this._burstEnd = Date.now() + this.config.burstDurationMs;
    }

    get isBursting(): boolean {
        if (this._bursting && Date.now() > this._burstEnd) {
            this._bursting = false;
        }
        return this._bursting;
    }

    // ── Continuous Mode ────────────────────────────────────────

    /** Start continuous simulation with a callback per tick */
    start(onTick: (batch: TruckTelemetry[]) => void): void {
        if (this._running) return;
        this._running = true;

        const interval = this.isBursting
            ? this.config.tickIntervalMs / this.config.burstMultiplier
            : this.config.tickIntervalMs;

        this._intervalId = setInterval(() => {
            const batch = this.tick();
            onTick(batch);
        }, interval);
    }

    /** Stop continuous simulation */
    stop(): void {
        this._running = false;
        if (this._intervalId !== null) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    // ── Stats ──────────────────────────────────────────────────

    get stats() {
        return {
            tick: this._tick,
            totalPackets: this._totalPackets,
            droppedPackets: this._droppedPackets,
            dropRate: this._totalPackets > 0
                ? this._droppedPackets / this._totalPackets
                : 0,
            temperatureSpikes: this._spikes,
            activeTrucks: this.trucks.filter((t) => t.status === 'active').length,
            truckCount: this.trucks.length,
        };
    }

    get truckCount(): number { return this.trucks.length; }
}
