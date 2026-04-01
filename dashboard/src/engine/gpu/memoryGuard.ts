/* ================================================================
 *  GPU Memory Guard
 *  ────────────────────────
 *  Monitors WebGL GPU memory consumption and JS heap usage.
 *  Enforces configurable limits and triggers progressive cleanup
 *  to prevent out-of-memory crashes on constrained devices.
 *
 *  Severity tiers:
 *   1. WARN  (>60% budget) — log advisory, shrink caches
 *   2. HIGH  (>80% budget) — force LOD reduction, disable particles
 *   3. CRITICAL (>90%)     — emergency dispose, fallback to 2D
 *
 *  Integrates with SharedCanvasPool & PerformanceGuard.
 * ================================================================ */

import { SharedCanvasPool } from './sharedCanvas';

export type MemoryPressure = 'normal' | 'warn' | 'high' | 'critical';

export interface GPUMemoryBudget {
    /** Max GPU texture memory in MB (default 256) */
    maxTextureMB: number;
    /** Max JS heap usage in MB (default 512) */
    maxHeapMB: number;
    /** Max WebGL buffer memory in MB (default 128) */
    maxBufferMB: number;
    /** Polling interval in ms (default 2000) */
    pollIntervalMs: number;
    /** Thresholds as fractions of max (0–1) */
    thresholds: { warn: number; high: number; critical: number };
}

export interface GPUMemorySnapshot {
    timestamp: number;
    textureMemoryMB: number;
    bufferMemoryMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    pressure: MemoryPressure;
    contextCount: number;
}

export type MemoryPressureCallback = (snapshot: GPUMemorySnapshot) => void;

const DEFAULT_BUDGET: GPUMemoryBudget = {
    maxTextureMB: 256,
    maxHeapMB: 512,
    maxBufferMB: 128,
    pollIntervalMs: 2_000,
    thresholds: { warn: 0.6, high: 0.8, critical: 0.9 },
};

/**
 * GPUMemoryGuard — monitors and enforces GPU/heap memory limits.
 *
 * Usage:
 *   const guard = new GPUMemoryGuard();
 *   guard.onPressureChange((snap) => {
 *       if (snap.pressure === 'critical') emergencyCleanup();
 *   });
 *   guard.start();
 *   // ... later ...
 *   guard.stop();
 */
export class GPUMemoryGuard {
    private readonly budget: GPUMemoryBudget;
    private timerId: ReturnType<typeof globalThis.setInterval> | null = null;
    private currentPressure: MemoryPressure = 'normal';
    private readonly listeners = new Set<MemoryPressureCallback>();
    private readonly history: GPUMemorySnapshot[] = [];
    private readonly maxHistory = 60; // ~2 min at 2s interval

    /** Track registered WebGL resources for estimation */
    private trackedTextures = 0;
    private trackedBuffers = 0;

    constructor(budget?: Partial<GPUMemoryBudget>) {
        this.budget = { ...DEFAULT_BUDGET, ...budget };
    }

    // ─── Lifecycle ─────────────────────────────────────────────

    start(): void {
        if (this.timerId !== null) return;
        this.poll(); // immediate first sample
        this.timerId = globalThis.setInterval(() => this.poll(), this.budget.pollIntervalMs);
    }

    stop(): void {
        if (this.timerId !== null) {
            globalThis.clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    destroy(): void {
        this.stop();
        this.listeners.clear();
        this.history.length = 0;
    }

    // ─── Resource Tracking (manual registration) ───────────────

    /** Call when a texture is created. Pass estimated size in bytes. */
    registerTexture(sizeBytes: number): void {
        this.trackedTextures += sizeBytes / (1024 * 1024);
    }

    /** Call when a texture is disposed. */
    unregisterTexture(sizeBytes: number): void {
        this.trackedTextures = Math.max(0, this.trackedTextures - sizeBytes / (1024 * 1024));
    }

    /** Call when a buffer is created. */
    registerBuffer(sizeBytes: number): void {
        this.trackedBuffers += sizeBytes / (1024 * 1024);
    }

    /** Call when a buffer is disposed. */
    unregisterBuffer(sizeBytes: number): void {
        this.trackedBuffers = Math.max(0, this.trackedBuffers - sizeBytes / (1024 * 1024));
    }

    // ─── Subscriptions ─────────────────────────────────────────

    /** Subscribe to pressure-change events */
    onPressureChange(cb: MemoryPressureCallback): () => void {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    // ─── Queries ───────────────────────────────────────────────

    getPressure(): MemoryPressure {
        return this.currentPressure;
    }

    getLatestSnapshot(): GPUMemorySnapshot | null {
        return this.history.at(-1) ?? null;
    }

    getHistory(): readonly GPUMemorySnapshot[] {
        return this.history;
    }

    // ─── Polling ───────────────────────────────────────────────

    private poll(): void {
        const snapshot = this.sample();
        const newPressure = this.classifyPressure(snapshot);

        this.history.push(snapshot);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        if (newPressure !== this.currentPressure) {
            this.currentPressure = newPressure;
            snapshot.pressure = newPressure;
            for (const cb of this.listeners) cb(snapshot);
        }
    }

    private sample(): GPUMemorySnapshot {
        // JS heap via performance.memory (Chrome only, graceful fallback)
        let heapUsedMB = 0;
        let heapTotalMB = 0;

        const perf = globalThis.performance as Performance & {
            memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
        };
        if (perf?.memory) {
            heapUsedMB = perf.memory.usedJSHeapSize / (1024 * 1024);
            heapTotalMB = perf.memory.totalJSHeapSize / (1024 * 1024);
        }

        // Context count from pool (if available)
        let contextCount = 0;
        try {
            contextCount = SharedCanvasPool.getInstance().stats().total;
        } catch {
            // SharedCanvasPool not available
        }

        return {
            timestamp: Date.now(),
            textureMemoryMB: this.trackedTextures,
            bufferMemoryMB: this.trackedBuffers,
            heapUsedMB,
            heapTotalMB,
            pressure: this.currentPressure,
            contextCount,
        };
    }

    private classifyPressure(snap: GPUMemorySnapshot): MemoryPressure {
        const { thresholds, maxTextureMB, maxBufferMB, maxHeapMB } = this.budget;

        // Compute utilization ratios
        const textureRatio = snap.textureMemoryMB / maxTextureMB;
        const bufferRatio = snap.bufferMemoryMB / maxBufferMB;
        const heapRatio = snap.heapUsedMB > 0 ? snap.heapUsedMB / maxHeapMB : 0;

        // Take the worst of all three dimensions
        const worstRatio = Math.max(textureRatio, bufferRatio, heapRatio);

        if (worstRatio >= thresholds.critical) return 'critical';
        if (worstRatio >= thresholds.high) return 'high';
        if (worstRatio >= thresholds.warn) return 'warn';
        return 'normal';
    }
}
