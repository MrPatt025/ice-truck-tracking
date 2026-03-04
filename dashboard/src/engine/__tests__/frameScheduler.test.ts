/**
 * Ring 2 — Unit Tests: Frame Scheduler
 *
 * Tests registration, ordering, dt clamping, pause/resume.
 * Uses manual tick invocation (no real rAF in Node).
 */

// Mock requestAnimationFrame / cancelAnimationFrame for jsdom
let rafCallbacks: Array<(time: number) => void> = [];
let rafId = 0;

globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    rafCallbacks.push(cb);
    return ++rafId;
};

globalThis.cancelAnimationFrame = (_id: number): void => {
    rafCallbacks = [];
};

// Re-import to pick up mocks (must be after mock setup)
const { frameScheduler } = require('../frameScheduler') as typeof import('../frameScheduler');

// ─── Helpers ───────────────────────────────────────────────────

function flushRAF(time: number): void {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach((cb) => cb(time));
}

beforeEach(() => {
    frameScheduler.stop();
    rafCallbacks = [];
});

// ═══════════════════════════════════════════════════════════════
//  Frame Scheduler
// ═══════════════════════════════════════════════════════════════

describe('FrameScheduler', () => {
    it('is not running initially', () => {
        expect(frameScheduler.isRunning).toBe(false);
    });

    it('starts and registers rAF', () => {
        frameScheduler.start();
        expect(frameScheduler.isRunning).toBe(true);
        expect(rafCallbacks.length).toBeGreaterThan(0);
        frameScheduler.stop();
    });

    it('start is idempotent', () => {
        frameScheduler.start();
        frameScheduler.start(); // should not double-register
        expect(frameScheduler.isRunning).toBe(true);
        frameScheduler.stop();
    });

    it('stop cancels the loop', () => {
        frameScheduler.start();
        frameScheduler.stop();
        expect(frameScheduler.isRunning).toBe(false);
    });

    it('invokes registered callbacks with dt', () => {
        const dts: number[] = [];
        frameScheduler.register('test', (dt) => dts.push(dt));
        frameScheduler.start();

        // Simulate two frames: 0ms, 16.67ms
        flushRAF(0);
        flushRAF(16.67);

        expect(dts.length).toBeGreaterThanOrEqual(1);
        // dt should be roughly 16.67ms / 1000 ≈ 0.01667s
        expect(dts[dts.length - 1]).toBeCloseTo(0.01667, 2);

        frameScheduler.stop();
    });

    it('unregister removes callback', () => {
        const calls: number[] = [];
        frameScheduler.register('x', () => calls.push(1));
        frameScheduler.unregister('x');
        frameScheduler.start();

        flushRAF(0);
        flushRAF(16);

        // 'x' was unregistered, should not have been called
        expect(calls).toHaveLength(0);
        frameScheduler.stop();
    });

    it('pause skips callbacks but keeps loop alive', () => {
        const calls: number[] = [];
        frameScheduler.register('p', () => calls.push(1));
        frameScheduler.start();

        flushRAF(0);
        const callsBefore = calls.length;

        frameScheduler.pause();
        expect(frameScheduler.isPaused).toBe(true);

        flushRAF(16);
        flushRAF(32);
        // Should not have accumulated more calls while paused
        expect(calls.length).toBe(callsBefore);

        frameScheduler.resume();
        expect(frameScheduler.isPaused).toBe(false);

        flushRAF(48);
        expect(calls.length).toBeGreaterThan(callsBefore);

        frameScheduler.stop();
    });

    it('clamps large dt (tab backgrounded scenario)', () => {
        const dts: number[] = [];
        frameScheduler.register('clamp', (dt) => dts.push(dt));
        frameScheduler.start();

        flushRAF(0);
        // Simulate 5-second gap (tab was backgrounded)
        flushRAF(5000);

        const lastDt = dts[dts.length - 1];
        // Should clamp to 50ms / 1000 = 0.05s
        expect(lastDt).toBeLessThanOrEqual(0.05);

        frameScheduler.stop();
    });

    it('catches errors in callbacks without crashing loop', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        frameScheduler.register('bad', () => { throw new Error('boom'); });
        frameScheduler.register('good', () => { /* noop */ });
        frameScheduler.start();

        // Should not throw
        expect(() => {
            flushRAF(0);
            flushRAF(16);
        }).not.toThrow();

        consoleSpy.mockRestore();
        frameScheduler.stop();
    });
});
