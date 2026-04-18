/**
 * Ring 2 — Unit Tests: Object Pool
 *
 * Verifies acquire/release cycle, recycling stats, trim, and pre-allocation.
 * No DOM, no WebGL, pure data structure tests.
 */
import { ObjectPool } from '../dataViz/objectPool';
import { randomInt } from 'node:crypto';

describe('ObjectPool', () => {
    it('creates new objects via factory when pool is empty', () => {
        let created = 0;
        const pool = new ObjectPool(() => { created++; return { value: created }; });

        const a = pool.acquire();
        const b = pool.acquire();

        expect(created).toBe(2);
        expect(a.value).toBe(1);
        expect(b.value).toBe(2);
    });

    it('recycles released objects', () => {
        let created = 0;
        const pool = new ObjectPool(() => { created++; return { value: created }; });

        const a = pool.acquire();
        pool.release(a);
        const b = pool.acquire();

        // Should reuse 'a' instead of creating new
        expect(b).toBe(a);
        expect(created).toBe(1);
    });

    it('tracks recycled count', () => {
        const pool = new ObjectPool(() => ({ x: 0 }));
        const obj = pool.acquire();
        pool.release(obj);
        pool.acquire(); // recycled

        expect(pool.totalCreated).toBe(1);
        expect(pool.totalRecycled).toBe(1);
    });

    it('pre-allocates initial pool', () => {
        const pool = new ObjectPool(() => new Float32Array(3), 100);

        expect(pool.available).toBe(100);
        expect(pool.totalCreated).toBe(100);
    });

    it('calls reset function on release', () => {
        const resets: number[] = [];
        const pool = new ObjectPool(
            () => ({ id: randomInt(1_000_000) }),
            0,
            (obj) => { resets.push(obj.id); },
        );

        const a = pool.acquire();
        pool.release(a);

        expect(resets).toHaveLength(1);
        expect(resets[0]).toBe(a.id);
    });

    it('releaseAll returns multiple objects', () => {
        const pool = new ObjectPool(() => ({ v: 0 }));
        const objects = [pool.acquire(), pool.acquire(), pool.acquire()];

        expect(pool.available).toBe(0);
        pool.releaseAll(objects);
        expect(pool.available).toBe(3);
    });

    it('trim reduces pool to max size', () => {
        const pool = new ObjectPool(() => ({}), 50);
        expect(pool.available).toBe(50);

        pool.trim(10);
        expect(pool.available).toBe(10);
    });

    it('clear empties the pool', () => {
        const pool = new ObjectPool(() => ({}), 25);
        pool.clear();
        expect(pool.available).toBe(0);
    });

    it('handles high-throughput acquire/release cycle', () => {
        const pool = new ObjectPool(() => new Float32Array(16), 0);
        const active: Float32Array<ArrayBuffer>[] = [];

        // Simulate 1000 acquire/release cycles
        for (let i = 0; i < 1000; i++) {
            active.push(pool.acquire());
            if (active.length > 50) {
                const batch = active.splice(0, 25);
                pool.releaseAll(batch);
            }
        }

        expect(pool.totalCreated).toBeGreaterThan(0);
        expect(pool.totalRecycled).toBeGreaterThan(0);
        // Factory allocations should be significantly less than 1000
        expect(pool.totalCreated).toBeLessThan(1000);
    });
});
