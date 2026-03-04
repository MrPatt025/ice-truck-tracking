/* ================================================================
 *  GPU Rendering Engine — Adaptive DPR + Performance Guard
 *  ────────────────────────────────────────────────────────
 *  Dynamically adjusts device pixel ratio based on GPU load.
 *  Implements the performance guard that keeps the frame budget:
 *    - GPU > 6ms → reduce DPR by 0.1 (min 0.75)
 *    - GPU < 3ms sustained → increase DPR by 0.05 (max native)
 *    - FPS < 50 → emergency scale-down
 *
 *  Uses exponential moving average to avoid jitter.
 * ================================================================ */

import type { LODLevel, DeviceTier, GPUSceneConfig } from '../types';

/** Adaptive DPR configuration */
export interface AdaptiveDPRConfig {
    minDPR: number;          // floor (default 0.75)
    maxDPR: number;          // ceiling (default device native)
    stepDown: number;        // decrease per frame when over budget (default 0.1)
    stepUp: number;          // increase per frame when under budget (default 0.05)
    gpuBudgetMs: number;     // target GPU time (default 6ms)
    gpuLowMs: number;        // below this → can increase (default 3ms)
    fpsEmergency: number;    // below this → emergency (default 45)
    smoothingFactor: number; // EMA alpha (default 0.15)
    cooldownFrames: number;  // frames between adjustments (default 30)
}

const DEFAULT_CONFIG: AdaptiveDPRConfig = {
    minDPR: 0.75,
    maxDPR: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 2, 2),
    stepDown: 0.1,
    stepUp: 0.05,
    gpuBudgetMs: 6,
    gpuLowMs: 3,
    fpsEmergency: 45,
    smoothingFactor: 0.15,
    cooldownFrames: 30,
};

/**
 * AdaptiveDPR — continuously adjusts pixel ratio for optimal quality/perf.
 *
 * Usage:
 *   const dpr = new AdaptiveDPR();
 *   // In frame loop:
 *   dpr.sample(gpuTimeMs, currentFPS);
 *   const newDPR = dpr.getCurrentDPR();
 *   renderer.setPixelRatio(newDPR);
 */
export class AdaptiveDPR {
    private config: AdaptiveDPRConfig;
    private currentDPR: number;
    private emaGPU = 0;        // exponential moving average of GPU time
    private emaFPS = 60;       // exponential moving average of FPS
    private cooldown = 0;      // frames until next adjustment
    private adjustmentCount = 0;

    constructor(config: Partial<AdaptiveDPRConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.currentDPR = this.config.maxDPR;
    }

    /**
     * Sample current frame metrics (call every frame).
     * Returns true if DPR was adjusted.
     */
    sample(gpuTimeMs: number, fps: number): boolean {
        const α = this.config.smoothingFactor;
        this.emaGPU = this.emaGPU * (1 - α) + gpuTimeMs * α;
        this.emaFPS = this.emaFPS * (1 - α) + fps * α;

        if (this.cooldown > 0) {
            this.cooldown--;
            return false;
        }

        let adjusted = false;

        // Emergency: FPS critically low
        if (this.emaFPS < this.config.fpsEmergency) {
            const newDPR = Math.max(
                this.config.minDPR,
                this.currentDPR - this.config.stepDown * 2,
            );
            if (newDPR !== this.currentDPR) {
                this.currentDPR = newDPR;
                adjusted = true;
            }
        }
        // Over GPU budget → scale down
        else if (this.emaGPU > this.config.gpuBudgetMs) {
            const newDPR = Math.max(
                this.config.minDPR,
                this.currentDPR - this.config.stepDown,
            );
            if (newDPR !== this.currentDPR) {
                this.currentDPR = newDPR;
                adjusted = true;
            }
        }
        // Under GPU budget → scale up (slowly)
        else if (this.emaGPU < this.config.gpuLowMs && this.emaFPS > 55) {
            const newDPR = Math.min(
                this.config.maxDPR,
                this.currentDPR + this.config.stepUp,
            );
            if (newDPR !== this.currentDPR) {
                this.currentDPR = Math.round(newDPR * 100) / 100;
                adjusted = true;
            }
        }

        if (adjusted) {
            this.cooldown = this.config.cooldownFrames;
            this.adjustmentCount++;
        }

        return adjusted;
    }

    getCurrentDPR(): number {
        return this.currentDPR;
    }

    getEMAGPU(): number {
        return this.emaGPU;
    }

    getEMAFPS(): number {
        return this.emaFPS;
    }

    getAdjustmentCount(): number {
        return this.adjustmentCount;
    }

    /** Reset to max quality */
    reset(): void {
        this.currentDPR = this.config.maxDPR;
        this.emaGPU = 0;
        this.emaFPS = 60;
        this.cooldown = 0;
    }
}

// ═════════════════════════════════════════════════════════════════
//  PERFORMANCE GUARD
//  Monitors per-layer budget compliance and triggers scaling.
// ═════════════════════════════════════════════════════════════════

export interface BudgetSample {
    react: number;     // ms
    worker: number;    // ms
    gpu: number;       // ms
    motion: number;    // ms
}

const BUDGET_LIMITS = {
    react: 3,
    worker: 4,
    gpu: 6,
    motion: 2,
    total: 16.6,
};

/**
 * PerformanceGuard — enforces the frame budget allocation.
 *
 * When a layer consistently exceeds its budget, the guard recommends
 * scaling actions to the adaptive performance layer.
 */
export class PerformanceGuard {
    private history: BudgetSample[] = [];
    private readonly windowSize = 60; // 1 second of samples at 60fps
    private violations: Array<{
        layer: string;
        avgTime: number;
        budget: number;
        severity: 'warn' | 'critical';
    }> = [];

    /** Record one frame's timing breakdown */
    record(sample: BudgetSample): void {
        this.history.push(sample);
        if (this.history.length > this.windowSize) {
            this.history.shift();
        }
    }

    /** Analyze the window and return violations */
    analyze(): typeof this.violations {
        if (this.history.length < 10) return [];

        this.violations = [];
        const layers = ['react', 'worker', 'gpu', 'motion'] as const;

        for (const layer of layers) {
            const avg = this.history.reduce((s, h) => s + h[layer], 0) / this.history.length;
            const budget = BUDGET_LIMITS[layer];

            if (avg > budget * 1.5) {
                this.violations.push({
                    layer,
                    avgTime: avg,
                    budget,
                    severity: 'critical',
                });
            } else if (avg > budget) {
                this.violations.push({
                    layer,
                    avgTime: avg,
                    budget,
                    severity: 'warn',
                });
            }
        }

        // Total frame time
        const avgTotal = this.history.reduce(
            (s, h) => s + h.react + h.worker + h.gpu + h.motion,
            0,
        ) / this.history.length;

        if (avgTotal > BUDGET_LIMITS.total) {
            this.violations.push({
                layer: 'total',
                avgTime: avgTotal,
                budget: BUDGET_LIMITS.total,
                severity: avgTotal > 20 ? 'critical' : 'warn',
            });
        }

        return this.violations;
    }

    /** Get recommended LOD level based on violations */
    recommendLOD(currentLOD: LODLevel): LODLevel {
        const critical = this.violations.filter((v) => v.severity === 'critical');
        if (critical.length > 0) {
            return downLOD(currentLOD, 2);
        }
        const warns = this.violations.filter((v) => v.severity === 'warn');
        if (warns.length > 1) {
            return downLOD(currentLOD, 1);
        }
        return currentLOD;
    }

    /** Get recommended config overrides */
    recommendConfig(current: GPUSceneConfig): Partial<GPUSceneConfig> {
        const overrides: Partial<GPUSceneConfig> = {};

        for (const v of this.violations) {
            if (v.layer === 'gpu' && v.severity === 'critical') {
                overrides.enableShadows = false;
                overrides.enablePostProcessing = false;
                overrides.particleCount = Math.floor(current.particleCount * 0.5);
            } else if (v.layer === 'gpu' && v.severity === 'warn') {
                overrides.enableShadows = false;
                overrides.particleCount = Math.floor(current.particleCount * 0.75);
            }
        }

        return overrides;
    }

    /** Clear history */
    reset(): void {
        this.history = [];
        this.violations = [];
    }
}

// ─── Helper: step LOD down ─────────────────────────────────────
const LOD_ORDER: LODLevel[] = ['ultra', 'high', 'medium', 'low', 'minimal'];

function downLOD(current: LODLevel, steps: number): LODLevel {
    const idx = LOD_ORDER.indexOf(current);
    return LOD_ORDER[Math.min(idx + steps, LOD_ORDER.length - 1)];
}

// ─── Device Tier Detection ─────────────────────────────────────

/**
 * Detect device performance tier based on available APIs.
 * Runs once at boot; result cached in adaptive layer.
 */
export function detectDeviceTier(): DeviceTier {
    // Check for hardware concurrency
    const cores = navigator.hardwareConcurrency || 2;

    // Check GPU via WebGL
    let gpuScore = 1;
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                const rendererStr = (renderer as string).toLowerCase();
                // High-end discrete GPUs
                if (/nvidia|radeon|rx\s[5-9]|rtx|gtx\s1[0-9]|geforce/i.test(rendererStr)) {
                    gpuScore = 3;
                }
                // Integrated but decent
                else if (/intel.*iris|apple.*gpu|mali-g7/i.test(rendererStr)) {
                    gpuScore = 2;
                }
                // Basic / software
                else if (/swiftshader|llvmpipe|software/i.test(rendererStr)) {
                    gpuScore = 0;
                }
            }
            // Check max texture size as proxy
            const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            if (maxTexture >= 16384) gpuScore = Math.max(gpuScore, 2);
        }
        canvas.remove();
    } catch {
        // fallback
    }

    // Memory check (Chrome only)
    let memoryGB = 4; // default assumption
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (nav.deviceMemory) {
        memoryGB = nav.deviceMemory;
    }

    // Composite score
    const score = cores * 0.3 + gpuScore * 3 + memoryGB * 0.5;

    if (score >= 8) return 'high-end';
    if (score >= 5) return 'mid-range';
    if (score >= 2.5) return 'low-end';
    return 'potato';
}

// ─── GPU Barrel export ─────────────────────────────────────────
export { SceneController } from './sceneController';
