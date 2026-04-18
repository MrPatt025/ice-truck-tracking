/**
 * Ring 5 — Memory Guard and Soak Tests
 *
 * Validates memory stability under sustained load:
 *   ✓ Object pool prevents GC pressure over 10k acquire/release cycles
 *   ✓ Ring buffer holds steady memory at capacity
 *   ✓ Spatial index rebuild doesn't leak
 *   ✓ Simulated soak test (sustained computation) stays flat
 */
import { ObjectPool } from '../dataViz/objectPool';
import { RingBuffer } from '../ringBuffer';
import { SpatialIndex } from '../dataViz/spatialIndex';
import type { SpatialEntity, TruckTelemetry } from '../types';
import { randomInt } from 'node:crypto';

// ─── Helpers ───────────────────────────────────────────────────

function makeTruck(id: string, x: number, y: number): SpatialEntity {
    return {
        id,
        x,
        y,
        data: {
            id,
            lat: y,
            lng: x,
            speed: 50,
            heading: 0,
            temperature: -18,
            fuelLevel: 80,
            engineRpm: 2200,
            odometer: 15000,
            status: 'active',
            driverName: 'Driver',
            routeId: 'R1',
            timestamp: Date.now(),
        } as TruckTelemetry,
    };
}

// ═══════════════════════════════════════════════════════════════
//  Memory Guard Tests
// ═══════════════════════════════════════════════════════════════

describe('Memory Guard — Object Pool', () => {
    it('10k acquire/release cycles reuse objects', () => {
        const pool = new ObjectPool(() => new Float32Array(64), 100);

        for (let i = 0; i < 10_000; i++) {
            const obj = pool.acquire();
            pool.release(obj);
        }

        // Total created should be FAR less than 10k (pool reuses)
        expect(pool.totalCreated).toBeLessThan(200);
        expect(pool.totalRecycled).toBe(10_000);
    });

    it('pool stays bounded after trim', () => {
        const pool = new ObjectPool(() => ({}), 0);
        const objs = Array.from({ length: 500 }, () => pool.acquire());
        pool.releaseAll(objs);

        expect(pool.available).toBe(500);
        pool.trim(50);
        expect(pool.available).toBe(50);
    });
});

describe('Memory Guard — Ring Buffer', () => {
    it('memory footprint stays constant at capacity', () => {
        const buf = new RingBuffer<Float32Array>(100);

        // Fill to capacity
        for (let i = 0; i < 100; i++) {
            buf.push(new Float32Array(256));
        }
        expect(buf.size).toBe(100);

        // Push 10k more — size should never exceed capacity
        for (let i = 0; i < 10_000; i++) {
            buf.push(new Float32Array(256));
            expect(buf.size).toBe(100);
        }
    });

    it('clear releases all references', () => {
        const buf = new RingBuffer<object>(50);
        for (let i = 0; i < 50; i++) {
            buf.push({ data: new Array(1000).fill(0) });
        }

        buf.clear();
        expect(buf.size).toBe(0);
        expect(buf.toArray()).toHaveLength(0);
    });
});

describe('Memory Guard — Spatial Index Rebuild', () => {
    it('rebuild 10 times does not accumulate nodes', () => {
        const idx = new SpatialIndex();

        for (let round = 0; round < 10; round++) {
            const entities = Array.from({ length: 1000 }, (_, i) =>
                makeTruck(`T${i}`, randomInt(1000), randomInt(1000)),
            );
            idx.bulkLoad(entities);
            expect(idx.size).toBe(1000);
        }

        // After 10 rebuilds, should still only have 1000 entities
        expect(idx.size).toBe(1000);
    });

    it('clear after bulk load fully resets', () => {
        const idx = new SpatialIndex();
        idx.bulkLoad(Array.from({ length: 5000 }, (_, i) =>
            makeTruck(`T${i}`, randomInt(500), randomInt(500)),
        ));

        expect(idx.size).toBe(5000);
        idx.clear();
        expect(idx.size).toBe(0);
    });
});

describe('Memory Guard — Sustained Computation Soak', () => {
    it('1000 iterations of combined operations complete without degradation', () => {
        const pool = new ObjectPool(() => ({ x: 0, y: 0, data: null }), 100);
        const buf = new RingBuffer<number>(200);
        const idx = new SpatialIndex();

        const timings: number[] = [];

        for (let iter = 0; iter < 1000; iter++) {
            const start = performance.now();

            // Acquire + release 50 objects
            const objs = Array.from({ length: 50 }, () => pool.acquire());
            pool.releaseAll(objs);

            // Push to ring buffer
            buf.push(iter);

            // Rebuild spatial index every 100 iterations
            if (iter % 100 === 0) {
                const entities = Array.from({ length: 100 }, (_, i) =>
                    makeTruck(`T${i}`, randomInt(100), randomInt(100)),
                );
                idx.bulkLoad(entities);
            }

            timings.push(performance.now() - start);
        }

        // Average iteration time
        const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
        expect(avgTime).toBeLessThan(5); // Each iteration < 5ms

        // Last 100 iterations should not be significantly slower than first 100
        const first100Avg = timings.slice(0, 100).reduce((a, b) => a + b, 0) / 100;
        const last100Avg = timings.slice(900).reduce((a, b) => a + b, 0) / 100;

        // Allow 3x tolerance for variance (no exponential growth)
        expect(last100Avg).toBeLessThan(first100Avg * 3 + 1);
    });
});
