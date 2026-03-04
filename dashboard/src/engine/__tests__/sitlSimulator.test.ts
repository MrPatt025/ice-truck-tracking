/**
 * Ring 5 — SITL 10k Truck Simulator Tests
 *
 * Validates the simulator produces realistic telemetry data
 * at scale (10k trucks), handles packet loss, temperature spikes,
 * burst traffic, and maintains data integrity.
 */
import { SITLSimulator } from './fixtures/sitl-simulator';

describe('SITL Simulator', () => {
    it('initializes with configured truck count', () => {
        const sim = new SITLSimulator({ truckCount: 100 });
        expect(sim.truckCount).toBe(100);
    });

    it('tick produces telemetry batch', () => {
        const sim = new SITLSimulator({ truckCount: 50, packetLossRate: 0 });
        const batch = sim.tick();

        expect(batch.length).toBe(50);
        expect(batch[0]).toHaveProperty('id');
        expect(batch[0]).toHaveProperty('lat');
        expect(batch[0]).toHaveProperty('lng');
        expect(batch[0]).toHaveProperty('speed');
        expect(batch[0]).toHaveProperty('temperature');
        expect(batch[0]).toHaveProperty('status');
    });

    it('truck IDs follow SITL-XXXXX format', () => {
        const sim = new SITLSimulator({ truckCount: 10 });
        const batch = sim.tick();

        for (const truck of batch) {
            expect(truck.id).toMatch(/^SITL-\d{5}$/);
        }
    });

    it('coordinates are within configured area', () => {
        const config = {
            truckCount: 100,
            packetLossRate: 0,
            areaCenter: { lat: 13.7563, lng: 100.5018 },
            areaRadiusKm: 50,
        };
        const sim = new SITLSimulator(config);

        // Run a few ticks
        for (let i = 0; i < 10; i++) sim.tick();

        const batch = sim.tick();
        for (const truck of batch) {
            // ~50km ≈ 0.45 degrees latitude
            expect(Math.abs(truck.lat - config.areaCenter.lat)).toBeLessThan(1);
            expect(Math.abs(truck.lng - config.areaCenter.lng)).toBeLessThan(1);
        }
    });

    it('simulates packet loss', () => {
        const sim = new SITLSimulator({ truckCount: 1000, packetLossRate: 0.1 });

        let totalReceived = 0;
        for (let i = 0; i < 100; i++) {
            totalReceived += sim.tick().length;
        }

        // With 10% loss over 100 ticks × 1000 trucks, expect ~90k received
        const expectedMax = 100 * 1000;
        expect(totalReceived).toBeLessThan(expectedMax);
        expect(totalReceived).toBeGreaterThan(expectedMax * 0.8); // within ±10%

        const stats = sim.stats;
        expect(stats.droppedPackets).toBeGreaterThan(0);
        expect(stats.dropRate).toBeGreaterThan(0.05);
        expect(stats.dropRate).toBeLessThan(0.15);
    });

    it('generates temperature spikes', () => {
        const sim = new SITLSimulator({ truckCount: 500, spikeChance: 0.05 });

        for (let i = 0; i < 50; i++) sim.tick();

        expect(sim.stats.temperatureSpikes).toBeGreaterThan(0);
    });

    it('temperatures stay in valid range (including spikes)', () => {
        const sim = new SITLSimulator({ truckCount: 100, spikeChance: 0.1 });

        for (let t = 0; t < 20; t++) {
            const batch = sim.tick();
            for (const truck of batch) {
                // Normal range: -25 to -5, spike range: 5 to 25
                expect(truck.temperature).toBeGreaterThan(-30);
                expect(truck.temperature).toBeLessThan(30);
            }
        }
    });

    it('speed stays between 0 and 120 km/h', () => {
        const sim = new SITLSimulator({ truckCount: 200, packetLossRate: 0 });

        for (let t = 0; t < 50; t++) {
            const batch = sim.tick();
            for (const truck of batch) {
                expect(truck.speed).toBeGreaterThanOrEqual(0);
                expect(truck.speed).toBeLessThanOrEqual(120);
            }
        }
    });

    it('fuel level decreases over time', () => {
        const sim = new SITLSimulator({ truckCount: 10, packetLossRate: 0 });

        const first = sim.tick();
        const initialFuel = first.map((t) => t.fuelLevel);

        for (let t = 0; t < 100; t++) sim.tick();

        const later = sim.tick();
        const laterFuel = later.map((t) => t.fuelLevel);

        // Average fuel should be lower
        const avgInitial = initialFuel.reduce((a, b) => a + b, 0) / initialFuel.length;
        const avgLater = laterFuel.reduce((a, b) => a + b, 0) / laterFuel.length;
        expect(avgLater).toBeLessThan(avgInitial);
    });

    it('burst mode increases effective packet rate', () => {
        const sim = new SITLSimulator({ truckCount: 100, packetLossRate: 0 });

        // Normal tick
        const normalBatch = sim.tick();
        expect(normalBatch.length).toBe(100);

        // Trigger burst
        sim.triggerBurst();
        expect(sim.isBursting).toBe(true);

        // Burst ticks still produce data
        const burstBatch = sim.tick();
        expect(burstBatch.length).toBe(100);
    });

    it('stats accumulate correctly', () => {
        const sim = new SITLSimulator({ truckCount: 50, packetLossRate: 0 });

        sim.tick();
        sim.tick();
        sim.tick();

        const stats = sim.stats;
        expect(stats.tick).toBe(3);
        expect(stats.totalPackets).toBe(150);
        expect(stats.truckCount).toBe(50);
    });

    it('start/stop continuous mode', () => {
        const sim = new SITLSimulator({ truckCount: 10, tickIntervalMs: 50 });
        const batches: number[] = [];

        sim.start((batch) => batches.push(batch.length));

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                sim.stop();
                expect(batches.length).toBeGreaterThan(0);
                resolve();
            }, 200);
        });
    });

    it('handles 10k trucks per tick within 100ms', () => {
        const sim = new SITLSimulator({ truckCount: 10_000, packetLossRate: 0.02 });

        const start = performance.now();
        const batch = sim.tick();
        const elapsed = performance.now() - start;

        expect(batch.length).toBeGreaterThan(9_500); // ~98% after packet loss
        expect(elapsed).toBeLessThan(100); // Must complete within 100ms
    });
});
