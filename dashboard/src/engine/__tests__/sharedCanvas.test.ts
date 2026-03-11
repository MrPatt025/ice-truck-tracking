/**
 * SharedCanvasPool — Unit Tests
 * Tests canvas acquisition, release, eviction, and context-loss recovery.
 */
import { SharedCanvasPool } from '../gpu/sharedCanvas';

// ─── Mock WebGL context ────────────────────────────────────────
const mockGL = {
    viewport: jest.fn(),
    getExtension: jest.fn().mockReturnValue({ loseContext: jest.fn() }),
};

const eventListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

beforeAll(() => {
    // Mock canvas creation + getContext
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag !== 'canvas') return document.createElement(tag);

        const canvas = {
            width: 0,
            height: 0,
            style: { display: '' },
            getContext: jest.fn().mockReturnValue(mockGL),
            addEventListener: jest.fn((event: string, handler: EventListenerOrEventListenerObject) => {
                let set = eventListeners.get(event);
                if (!set) { set = new Set(); eventListeners.set(event, set); }
                set.add(handler);
            }),
            removeEventListener: jest.fn((event: string, handler: EventListenerOrEventListenerObject) => {
                eventListeners.get(event)?.delete(handler);
            }),
            remove: jest.fn(),
        } as unknown as HTMLCanvasElement;
        return canvas;
    });
});

afterEach(() => {
    SharedCanvasPool.resetInstance();
    eventListeners.clear();
    jest.clearAllMocks();
});

describe('SharedCanvasPool', () => {
    test('getInstance returns singleton', () => {
        const a = SharedCanvasPool.getInstance();
        const b = SharedCanvasPool.getInstance();
        expect(a).toBe(b);
    });

    test('acquire creates a canvas with the right dimensions', () => {
        const pool = SharedCanvasPool.getInstance();
        const { canvas, gl, version } = pool.acquire('test-1', { width: 800, height: 600 });

        expect(canvas).toBeDefined();
        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);
        expect(gl).toBe(mockGL);
        expect(version).toBe(2); // webgl2 succeeds in mock
    });

    test('acquire same id increments refCount and reuses canvas', () => {
        const pool = SharedCanvasPool.getInstance();
        const first = pool.acquire('shared', { width: 100, height: 100 });
        const second = pool.acquire('shared', { width: 100, height: 100 });

        expect(first.canvas).toBe(second.canvas);
        expect(pool.stats().total).toBe(1);
        expect(pool.stats().active).toBe(1);
    });

    test('release decrements refCount', () => {
        const pool = SharedCanvasPool.getInstance();
        pool.acquire('rel', { width: 100, height: 100 });
        pool.acquire('rel', { width: 100, height: 100 });

        pool.release('rel');
        // Still active (refCount = 1)
        expect(pool.stats().active).toBe(1);

        pool.release('rel');
        // Now idle (refCount = 0)
        expect(pool.stats().idle).toBe(1);
    });

    test('release on unknown id does not throw', () => {
        const pool = SharedCanvasPool.getInstance();
        expect(() => pool.release('nonexistent')).not.toThrow();
    });

    test('destroy removes canvas from pool', () => {
        const pool = SharedCanvasPool.getInstance();
        pool.acquire('gone', { width: 50, height: 50 });
        expect(pool.has('gone')).toBe(true);

        pool.destroy('gone');
        expect(pool.has('gone')).toBe(false);
        expect(pool.stats().total).toBe(0);
    });

    test('LRU eviction when pool is full', () => {
        const pool = SharedCanvasPool.getInstance();

        // Fill pool to max (8)
        for (let i = 0; i < 8; i++) {
            pool.acquire(`ctx-${i}`, { width: 10, height: 10 });
        }
        // Release oldest so it becomes evictable
        pool.release('ctx-0');

        expect(pool.stats().total).toBe(8);

        // Acquiring 9th should evict ctx-0
        pool.acquire('ctx-new', { width: 10, height: 10 });
        expect(pool.has('ctx-0')).toBe(false);
        expect(pool.has('ctx-new')).toBe(true);
        expect(pool.stats().total).toBe(8);
    });

    test('onLost / onRestored fire callbacks', () => {
        const pool = SharedCanvasPool.getInstance();
        pool.acquire('ctx-loss', { width: 100, height: 100 });

        const lostCb = jest.fn();
        const restoredCb = jest.fn();
        const unsubLost = pool.onLost('ctx-loss', lostCb);
        pool.onRestored('ctx-loss', restoredCb);

        // Simulate context-loss via the stored event handlers
        const lostHandlers = eventListeners.get('webglcontextlost');
        if (lostHandlers) {
            for (const h of lostHandlers) (h as EventListener)(new Event('webglcontextlost'));
        }
        expect(lostCb).toHaveBeenCalledTimes(1);

        // Simulate restore
        const restoredHandlers = eventListeners.get('webglcontextrestored');
        if (restoredHandlers) {
            for (const h of restoredHandlers) (h as EventListener)(new Event('webglcontextrestored'));
        }
        expect(restoredCb).toHaveBeenCalledTimes(1);

        // Unsubscribe
        unsubLost();
        if (lostHandlers) {
            for (const h of lostHandlers) (h as EventListener)(new Event('webglcontextlost'));
        }
        expect(lostCb).toHaveBeenCalledTimes(1); // still 1
    });

    test('stats reports correct active vs idle counts', () => {
        const pool = SharedCanvasPool.getInstance();
        pool.acquire('a', { width: 10, height: 10 });
        pool.acquire('b', { width: 10, height: 10 });
        pool.release('b');

        const s = pool.stats();
        expect(s.total).toBe(2);
        expect(s.active).toBe(1);
        expect(s.idle).toBe(1);
        expect(s.maxContexts).toBe(8);
    });

    test('destroyAll clears entire pool', () => {
        const pool = SharedCanvasPool.getInstance();
        pool.acquire('x', { width: 10, height: 10 });
        pool.acquire('y', { width: 10, height: 10 });
        pool.destroyAll();

        expect(pool.stats().total).toBe(0);
    });

    test('resize canvas on re-acquire with different dimensions', () => {
        const pool = SharedCanvasPool.getInstance();
        const first = pool.acquire('resize', { width: 100, height: 100 });
        pool.acquire('resize', { width: 200, height: 150 });

        expect(first.canvas.width).toBe(200);
        expect(first.canvas.height).toBe(150);
        expect(mockGL.viewport).toHaveBeenCalledWith(0, 0, 200, 150);
    });
});
