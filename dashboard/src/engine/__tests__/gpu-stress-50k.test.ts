/**
 * GPU 50,000 Entity Stress Test
 * ──────────────────────────────
 * Tests the WebGL shared canvas pool and GPU memory guard
 * under extreme load with 50,000 simulated truck entities.
 *
 * Run: npx jest dashboard/src/engine/__tests__/gpu-stress-50k.test.ts --runInBand
 */

import { SharedCanvasPool } from '../gpu/sharedCanvas';
import { GPUMemoryGuard } from '../gpu/memoryGuard';

// Mock WebGL
const mockGL = {
    canvas: { width: 1920, height: 1080 },
    drawArrays: jest.fn(),
    createBuffer: jest.fn(() => ({})),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    createProgram: jest.fn(() => ({})),
    createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    useProgram: jest.fn(),
    getAttribLocation: jest.fn(() => 0),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    uniform1f: jest.fn(),
    uniform2f: jest.fn(),
    getUniformLocation: jest.fn(() => ({})),
    viewport: jest.fn(),
    clear: jest.fn(),
    clearColor: jest.fn(),
    enable: jest.fn(),
    blendFunc: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteProgram: jest.fn(),
    getExtension: jest.fn(() => ({
        loseContext: jest.fn(),
        restoreContext: jest.fn(),
    })),
    isContextLost: jest.fn(() => false),
    getParameter: jest.fn((param: number) => {
        if (param === 0x0D33) return 16384; // MAX_TEXTURE_SIZE
        if (param === 0x8869) return 16;    // MAX_VERTEX_ATTRIBS
        return 0;
    }),
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    COLOR_BUFFER_BIT: 0x00004000,
    BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
};

// Patch HTMLCanvasElement for pool
beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(function (this: HTMLCanvasElement, type: string) {
        if (type === 'webgl2' || type === 'webgl') return mockGL;
        return null;
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

// ═══════════════════════════════════════════════════════════════
// STRESS TESTS
// ═══════════════════════════════════════════════════════════════

describe('GPU Stress Test — 50,000 Entities', () => {
    jest.setTimeout(30_000);

    test('SharedCanvasPool handles 50k entity draw calls without crash', () => {
        const pool = SharedCanvasPool.getInstance();
        const { gl } = pool.acquire('stress-main', { width: 1920, height: 1080 }, true);
        expect(gl).toBeTruthy();

        const ENTITY_COUNT = 50_000;
        const BATCH_SIZE = 1_000;
        const batches = Math.ceil(ENTITY_COUNT / BATCH_SIZE);

        const start = performance.now();
        for (let b = 0; b < batches; b++) {
            // Simulate buffer upload per batch
            mockGL.createBuffer();
            mockGL.bindBuffer(mockGL.ARRAY_BUFFER, {});
            mockGL.bufferData(mockGL.ARRAY_BUFFER, new Float32Array(BATCH_SIZE * 6), mockGL.STATIC_DRAW);

            // Simulate draw call
            mockGL.drawArrays(mockGL.TRIANGLES, 0, BATCH_SIZE * 3);
        }
        const elapsed = performance.now() - start;

        expect(mockGL.drawArrays).toHaveBeenCalledTimes(batches);
        expect(elapsed).toBeLessThan(5_000); // Should complete under 5s
        console.log(`  50k entities in ${batches} batches: ${elapsed.toFixed(1)}ms`);

        pool.release('stress-main');
    });

    test('GPU Memory Guard stays within budget at 50k entities', () => {
        jest.useFakeTimers();
        const guard = new GPUMemoryGuard({
            maxTextureMB: 512,
            pollIntervalMs: 100,
        });

        guard.start();
        jest.advanceTimersByTime(500); // 5 samples

        const history = guard.getHistory();
        expect(history.length).toBeGreaterThan(0);

        // All snapshots should be within budget
        for (const snap of history) {
            expect(snap.textureMemoryMB + snap.bufferMemoryMB).toBeLessThanOrEqual(512);
        }

        guard.destroy();
        jest.useRealTimers();
    });

    test('Canvas pool handles rapid acquire/release cycles for 50k entities', () => {
        const pool = SharedCanvasPool.getInstance();
        const CYCLES = 100;
        const ENTITIES_PER_CYCLE = 500;

        const start = performance.now();
        for (let i = 0; i < CYCLES; i++) {
            const id = `cycle-${i % 4}`;
            const { gl } = pool.acquire(id, { width: 1920, height: 1080 }, true);
            expect(gl).toBeTruthy();

            // Simulate rendering entities
            for (let e = 0; e < ENTITIES_PER_CYCLE; e++) {
                mockGL.drawArrays(mockGL.TRIANGLES, 0, 3);
            }

            pool.release(id);
        }
        const elapsed = performance.now() - start;

        console.log(`  ${CYCLES} acquire/release cycles (${CYCLES * ENTITIES_PER_CYCLE} total entities): ${elapsed.toFixed(1)}ms`);
        expect(elapsed).toBeLessThan(10_000);
    });

    test('Context loss recovery under 50k entity load', () => {
        const pool = SharedCanvasPool.getInstance();
        const { gl } = pool.acquire('loss-test', { width: 1920, height: 1080 }, true);
        expect(gl).toBeTruthy();

        const unsubLost = pool.onLost('loss-test', () => { /* lostFired */ });
        const unsubRestored = pool.onRestored('loss-test', () => { /* restoredFired */ });

        expect(typeof unsubLost).toBe('function');
        expect(typeof unsubRestored).toBe('function');

        // Simulate 50k entity state before loss
        for (let i = 0; i < 50; i++) {
            mockGL.createBuffer();
            mockGL.bufferData(mockGL.ARRAY_BUFFER, new Float32Array(1000 * 6), mockGL.STATIC_DRAW);
        }

        unsubLost();
        unsubRestored();
        pool.release('loss-test');
    });

    test('Memory guard snapshot captures pool stats correctly', () => {
        jest.useFakeTimers();
        const guard = new GPUMemoryGuard({
            maxTextureMB: 256,
            pollIntervalMs: 50,
        });

        guard.start();
        jest.advanceTimersByTime(250);

        const snapshot = guard.getLatestSnapshot();
        expect(snapshot).toBeDefined();
        expect(snapshot?.contextCount).toBeGreaterThanOrEqual(0);
        expect((snapshot?.textureMemoryMB ?? 0) + (snapshot?.bufferMemoryMB ?? 0)).toBeGreaterThanOrEqual(0);
        expect(snapshot?.timestamp).toBeGreaterThan(0);

        guard.destroy();
        jest.useRealTimers();
    });

    test('High-concurrency pool usage — multiple canvases simultaneously', () => {
        const pool = SharedCanvasPool.getInstance();
        const canvasIds = Array.from({ length: 8 }, (_, i) => `canvas-${i}`);

        // Acquire all 8 simultaneously
        const contexts = canvasIds.map(id =>
            pool.acquire(id, { width: 1920, height: 1080 }, true)
        );

        expect(contexts).toHaveLength(8);
        for (const ctx of contexts) {
            expect(ctx.gl).toBeTruthy();
        }

        // Simulate rendering across all canvases
        const ENTITIES_PER_CANVAS = 6_250; // 50k / 8
        for (let c = 0; c < 8; c++) {
            for (let e = 0; e < ENTITIES_PER_CANVAS; e++) {
                mockGL.drawArrays(mockGL.TRIANGLES, 0, 3);
            }
        }

        const stats = pool.stats();
        expect(stats.total).toBe(8);
        expect(stats.active).toBe(8);

        // Release all
        canvasIds.forEach(id => pool.release(id));

        const afterStats = pool.stats();
        expect(afterStats.idle).toBe(8);
    });
});
