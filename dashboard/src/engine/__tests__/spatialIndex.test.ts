/**
 * Ring 2 — Unit Tests: Spatial Index (R-Tree)
 *
 * Pure-math tests — verifies bulk-load, range search, kNN, radius.
 * No DOM, no WebGL, no network.
 */
import { SpatialIndex, EntityMap } from '../dataViz/spatialIndex';
import type { SpatialEntity, TruckTelemetry } from '../types';

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
            driverName: `Driver ${id}`,
            routeId: 'R1',
            timestamp: Date.now(),
        } as TruckTelemetry,
    };
}

function makeEntities(count: number): SpatialEntity[] {
    const entities: SpatialEntity[] = [];
    for (let i = 0; i < count; i++) {
        entities.push(makeTruck(`T${i}`, Math.random() * 1000, Math.random() * 1000));
    }
    return entities;
}

// ═══════════════════════════════════════════════════════════════
//  SpatialIndex
// ═══════════════════════════════════════════════════════════════

describe('SpatialIndex', () => {
    it('starts empty', () => {
        const idx = new SpatialIndex();
        expect(idx.size).toBe(0);
    });

    it('bulk loads entities', () => {
        const idx = new SpatialIndex();
        const entities = makeEntities(100);
        idx.bulkLoad(entities);
        expect(idx.size).toBe(100);
    });

    it('handles empty bulk load', () => {
        const idx = new SpatialIndex();
        idx.bulkLoad([]);
        expect(idx.size).toBe(0);
    });

    it('range search returns entities within AABB', () => {
        const idx = new SpatialIndex();
        const entities = [
            makeTruck('inside1', 50, 50),
            makeTruck('inside2', 60, 60),
            makeTruck('outside', 500, 500),
        ];
        idx.bulkLoad(entities);

        const results = idx.search({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
        const ids = results.map((e) => e.id);

        expect(ids).toContain('inside1');
        expect(ids).toContain('inside2');
        expect(ids).not.toContain('outside');
    });

    it('range search with no matches returns empty', () => {
        const idx = new SpatialIndex();
        idx.bulkLoad([makeTruck('A', 50, 50)]);

        const results = idx.search({ minX: 900, minY: 900, maxX: 1000, maxY: 1000 });
        expect(results).toHaveLength(0);
    });

    it('kNN returns k nearest neighbors', () => {
        const idx = new SpatialIndex();
        const entities = [
            makeTruck('close', 10, 10),
            makeTruck('medium', 50, 50),
            makeTruck('far', 900, 900),
        ];
        idx.bulkLoad(entities);

        const nearest = idx.knn(0, 0, 2);
        expect(nearest).toHaveLength(2);
        expect(nearest[0].id).toBe('close');
        expect(nearest[1].id).toBe('medium');
    });

    it('nearest returns single closest entity', () => {
        const idx = new SpatialIndex();
        idx.bulkLoad([
            makeTruck('A', 100, 100),
            makeTruck('B', 10, 10),
        ]);

        const result = idx.nearest(0, 0);
        expect(result).not.toBeNull();
      expect(result?.id).toBe('B');
    });

    it('nearest returns null for empty index', () => {
        const idx = new SpatialIndex();
        idx.bulkLoad([]);
        expect(idx.nearest(0, 0)).toBeNull();
    });

    it('withinRadius returns entities inside circle', () => {
        const idx = new SpatialIndex();
        idx.bulkLoad([
            makeTruck('in', 5, 5),
            makeTruck('out', 100, 100),
        ]);

        const results = idx.withinRadius(0, 0, 20);
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('in');
    });

    it('clear resets the index', () => {
        const idx = new SpatialIndex();
        idx.bulkLoad(makeEntities(50));
        expect(idx.size).toBe(50);

        idx.clear();
        expect(idx.size).toBe(0);
        expect(idx.search({ minX: 0, minY: 0, maxX: 9999, maxY: 9999 })).toHaveLength(0);
    });

    it('handles large dataset (10k entities)', () => {
        const idx = new SpatialIndex();
        const entities = makeEntities(10_000);
        idx.bulkLoad(entities);
        expect(idx.size).toBe(10_000);

        // Range query on a quarter of the space should return ~25%
        const results = idx.search({ minX: 0, minY: 0, maxX: 500, maxY: 500 });
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThan(10_000);
    });

    it('bulkLoad with single entity works', () => {
        const idx = new SpatialIndex();
        idx.bulkLoad([makeTruck('solo', 42, 42)]);
        expect(idx.size).toBe(1);
      expect(idx.nearest(42, 42)?.id).toBe('solo');
    });
});

// ═══════════════════════════════════════════════════════════════
//  EntityMap
// ═══════════════════════════════════════════════════════════════

describe('EntityMap', () => {
    it('stores and retrieves entities', () => {
        const map = new EntityMap<SpatialEntity>();
        const e = makeTruck('T1', 10, 20);
        map.set('T1', e);

        expect(map.get('T1')).toBe(e);
        expect(map.size).toBe(1);
    });

    it('returns undefined for missing key', () => {
        const map = new EntityMap<SpatialEntity>();
        expect(map.get('nope')).toBeUndefined();
    });

    it('deletes entities', () => {
        const map = new EntityMap<SpatialEntity>();
        map.set('T1', makeTruck('T1', 0, 0));
        expect(map.size).toBe(1);

        map.delete('T1');
        expect(map.size).toBe(0);
        expect(map.get('T1')).toBeUndefined();
    });

    it('iterates over all values', () => {
        const map = new EntityMap<SpatialEntity>();
        map.set('A', makeTruck('A', 1, 1));
        map.set('B', makeTruck('B', 2, 2));

        const ids: string[] = [];
        map.forEach((entity) => ids.push(entity.id));
        expect([...ids].sort((a: string, b: string) => a.localeCompare(b))).toEqual([
            'A',
            'B',
        ]);
    });

    it('clears all entries', () => {
        const map = new EntityMap<SpatialEntity>();
        map.set('X', makeTruck('X', 0, 0));
        map.set('Y', makeTruck('Y', 0, 0));
        map.clear();

        expect(map.size).toBe(0);
    });
});
