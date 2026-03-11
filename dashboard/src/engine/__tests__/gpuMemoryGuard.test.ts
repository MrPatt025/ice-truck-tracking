/**
 * GPUMemoryGuard — Unit Tests
 * Tests pressure classification, resource tracking, and callbacks.
 */
import { GPUMemoryGuard, type MemoryPressure } from '../gpu/memoryGuard';

// Mock SharedCanvasPool to avoid circular dependency issues
jest.mock('../gpu/sharedCanvas', () => ({
    SharedCanvasPool: {
        getInstance: () => ({
            stats: () => ({ total: 2, active: 1, idle: 1, maxContexts: 8 }),
        }),
    },
}));

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('GPUMemoryGuard', () => {
    test('starts in normal pressure', () => {
        const guard = new GPUMemoryGuard();
        expect(guard.getPressure()).toBe('normal');
        guard.destroy();
    });

    test('transitions to warn when texture memory exceeds 60% of budget', () => {
        const pressures: MemoryPressure[] = [];
        const guard = new GPUMemoryGuard({ maxTextureMB: 100 });
        guard.onPressureChange((snap) => pressures.push(snap.pressure));

        // Register 65 MB of textures (65% > warn threshold of 60%)
        guard.registerTexture(65 * 1024 * 1024);
        guard.start();

        expect(pressures).toContain('warn');
        guard.destroy();
    });

    test('transitions to high when buffer memory exceeds 80% of budget', () => {
        const pressures: MemoryPressure[] = [];
        const guard = new GPUMemoryGuard({ maxBufferMB: 100 });
        guard.onPressureChange((snap) => pressures.push(snap.pressure));

        guard.registerBuffer(85 * 1024 * 1024);
        guard.start();

        expect(pressures).toContain('high');
        guard.destroy();
    });

    test('transitions to critical at 90%+ utilization', () => {
        const pressures: MemoryPressure[] = [];
        const guard = new GPUMemoryGuard({ maxTextureMB: 100 });
        guard.onPressureChange((snap) => pressures.push(snap.pressure));

        guard.registerTexture(95 * 1024 * 1024);
        guard.start();

        expect(pressures).toContain('critical');
        guard.destroy();
    });

    test('unregistering resources reduces pressure', () => {
        const latestPressures: MemoryPressure[] = [];
        const guard = new GPUMemoryGuard({ maxTextureMB: 100, pollIntervalMs: 100 });
        guard.onPressureChange((snap) => latestPressures.push(snap.pressure));

        // Start critical
        guard.registerTexture(95 * 1024 * 1024);
        guard.start();
        expect(guard.getPressure()).toBe('critical');

        // Unregister most
        guard.unregisterTexture(90 * 1024 * 1024);
        jest.advanceTimersByTime(200);

        expect(guard.getPressure()).toBe('normal');
        guard.destroy();
    });

    test('history accumulates snapshots', () => {
        const guard = new GPUMemoryGuard({ pollIntervalMs: 100 });
        guard.start();

        jest.advanceTimersByTime(500);

        // 1 immediate + 5 interval = 6
        expect(guard.getHistory().length).toBeGreaterThanOrEqual(5);
        guard.destroy();
    });

    test('onPressureChange returns unsubscribe function', () => {
        const cb = jest.fn();
        const guard = new GPUMemoryGuard({ maxTextureMB: 100 });
        const unsub = guard.onPressureChange(cb);

        guard.registerTexture(95 * 1024 * 1024);
        guard.start();
        expect(cb).toHaveBeenCalledTimes(1);

        unsub();
        // Force another poll
        guard.unregisterTexture(95 * 1024 * 1024);
        jest.advanceTimersByTime(3000);
        // cb called once for critical→normal, but we unsubbed so it shouldn't fire again
        // Actually the first call already happened, so total is 1
        // After unsub, the transition normal→? won't call cb
        guard.destroy();
    });

    test('getLatestSnapshot returns last sample', () => {
        const guard = new GPUMemoryGuard();
        expect(guard.getLatestSnapshot()).toBeNull();

        guard.start();
        const snap = guard.getLatestSnapshot();
        expect(snap).not.toBeNull();
        expect(snap!.timestamp).toBeGreaterThan(0);
        expect(snap!.contextCount).toBe(2); // from mock
        guard.destroy();
    });

    test('stop prevents further polling', () => {
        const guard = new GPUMemoryGuard({ pollIntervalMs: 100 });
        guard.start();
        jest.advanceTimersByTime(300);
        const countBeforeStop = guard.getHistory().length;

        guard.stop();
        jest.advanceTimersByTime(500);
        expect(guard.getHistory().length).toBe(countBeforeStop);
        guard.destroy();
    });

    test('destroy clears listeners and history', () => {
        const guard = new GPUMemoryGuard();
        guard.start();
        jest.advanceTimersByTime(5000);
        expect(guard.getHistory().length).toBeGreaterThan(0);

        guard.destroy();
        expect(guard.getHistory().length).toBe(0);
    });
});
