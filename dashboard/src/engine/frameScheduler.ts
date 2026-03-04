/* ================================================================
 *  Ice-Truck IoT Engine — Frame Scheduler
 *  ───────────────────────────────────────
 *  Provides a stable 60 FPS loop.  All imperative GPU/Map/3D
 *  updates are driven by this scheduler — NOT by React re-renders.
 *
 *  Usage:
 *    frameScheduler.register('map', (dt) => mapLayer.update(dt));
 *    frameScheduler.register('3d',  (dt) => threeLayer.update(dt));
 *    frameScheduler.start();
 *
 *  The scheduler uses requestAnimationFrame and guarantees:
 *    • dt is clamped to [0, 50ms] to avoid spiral-of-death
 *    • callbacks are invoked in registration order
 *    • pause/resume without losing registration
 * ================================================================ */

import type { FrameCallback } from './types';

class FrameScheduler {
    private readonly callbacks = new Map<string, FrameCallback>();
    private rafId: number | null = null;
    private lastTime = 0;
    private running = false;
    private _paused = false;

    /** Register a named callback. Overwrites if name exists. */
    register(name: string, cb: FrameCallback): void {
        this.callbacks.set(name, cb);
    }

    /** Unregister a named callback. */
    unregister(name: string): void {
        this.callbacks.delete(name);
    }

    /** Start the rAF loop. */
    start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.tick(this.lastTime);
    }

    /** Stop the rAF loop entirely. */
    stop(): void {
        this.running = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** Pause — loop keeps running but callbacks are skipped. */
    pause(): void {
        this._paused = true;
    }

    /** Resume from pause. */
    resume(): void {
        this._paused = false;
        this.lastTime = performance.now();
    }

    get isPaused(): boolean {
        return this._paused;
    }

    get isRunning(): boolean {
        return this.running;
    }

    private readonly tick = (now: number): void => {
        if (!this.running) return;
        this.rafId = requestAnimationFrame(this.tick);

        if (this._paused) {
            this.lastTime = now;
            return;
        }

        // dt in seconds, clamped to avoid huge jumps (e.g. tab was backgrounded)
        const dtMs = Math.min(now - this.lastTime, 50);
        this.lastTime = now;
        const dt = dtMs / 1000;

        this.callbacks.forEach((cb) => {
            try {
                cb(dt);
            } catch (e) {
                console.error('[FrameScheduler] callback error:', e);
            }
        });
    };
}

/** Singleton frame scheduler for the entire IoT dashboard */
export const frameScheduler = new FrameScheduler();
