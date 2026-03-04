/* ================================================================
 *  Adaptive Performance Intelligence Layer
 *  ────────────────────────────────────────
 *  Real-time environment sensing + auto-scaling strategy.
 *  Monitors: FPS, memory, DPR, battery, thermal, connection.
 *  Outputs: ScalingDecision that feeds into all other layers.
 *
 *  Architecture:
 *    EnvMonitor → collects raw metrics every frame
 *    ScalingStrategy → analyzes window and emits decisions
 *    AdaptiveController → singleton orchestrator
 *
 *  Design rules:
 *    - Never block main thread > 50ms
 *    - UI text layer always separated from canvas
 *    - Degrade gracefully: visuals first, then data, never UX
 * ================================================================ */

import type {
    EnvSnapshot,
    ScalingDecision,
    LODLevel,
    DeviceTier,
    FrameBudget,
    PerfViolation,
} from '../types';
import { detectDeviceTier } from '../gpu/adaptiveDPR';

// ═════════════════════════════════════════════════════════════════
//  FRAME BUDGET CONSTANTS
// ═════════════════════════════════════════════════════════════════

export const FRAME_BUDGET: FrameBudget = {
    react: 3,
    worker: 4,
    gpu: 6,
    motion: 2,
    overhead: 1.6,
    total: 16.6,
};

// ═════════════════════════════════════════════════════════════════
//  HELPERS
// ═════════════════════════════════════════════════════════════════

function resolveGpuTier(tier: DeviceTier): 'high' | 'medium' | 'low' {
    if (tier === 'high-end') return 'high';
    if (tier === 'potato') return 'low';
    return 'medium';
}

// ═════════════════════════════════════════════════════════════════
//  1. ENVIRONMENT MONITOR
//     Collects raw performance metrics every frame.
// ═════════════════════════════════════════════════════════════════

/**
 * EnvMonitor — real-time environment data collector.
 *
 * Passive: reads performance APIs, Navigator, battery, etc.
 * Provides a snapshot for the scaling strategy.
 */
export class EnvMonitor {
    private readonly fpsHistory: number[] = [];
    private readonly frameTimeHistory: number[] = [];
    private lastFrameTime = 0;
    private lastTimestamp = performance.now();
    private readonly deviceTier: DeviceTier;
    private batteryLevel = 1;
    private isCharging = true;
    private connectionType = 'unknown';
    private readonly HISTORY_SIZE = 60; // 1 second window

    constructor() {
        this.deviceTier = detectDeviceTier();
        this.initConnectionWatch();
    }

    /** Call after construction to start async monitors */
    init(): void {
        void this.initBatteryWatch();
    }

    /** Sample current frame (call every rAF) */
    sample(): void {
        const now = performance.now();
        this.lastFrameTime = now - this.lastTimestamp;
        this.lastTimestamp = now;

        // FPS from frame time
        const fps = this.lastFrameTime > 0 ? 1000 / this.lastFrameTime : 60;
        this.fpsHistory.push(fps);
        this.frameTimeHistory.push(this.lastFrameTime);

        if (this.fpsHistory.length > this.HISTORY_SIZE) {
            this.fpsHistory.shift();
            this.frameTimeHistory.shift();
        }
    }

    /** Get complete environment snapshot */
    getSnapshot(): EnvSnapshot {
        const avgFPS = this.fpsHistory.length > 0
            ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
            : 60;

        const avgFrameTime = this.frameTimeHistory.length > 0
            ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
            : 16.6;

        // Memory (Chrome-only API)
        let heapUsedMB = 0;
        let heapLimitMB = 2048;
        const perf = performance as Performance & {
            memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        };
        if (perf.memory) {
            heapUsedMB = perf.memory.usedJSHeapSize / (1024 * 1024);
            heapLimitMB = perf.memory.jsHeapSizeLimit / (1024 * 1024);
        }

        const memoryPressure = heapLimitMB > 0 ? heapUsedMB / heapLimitMB : 0;

        // Thermal state (heuristic: based on sustained low FPS + high memory)
        let thermalState: EnvSnapshot['thermalState'] = 'nominal';
        if (avgFPS < 30 && memoryPressure > 0.7) {
            thermalState = 'critical';
        } else if (avgFPS < 45 && memoryPressure > 0.5) {
            thermalState = 'serious';
        } else if (avgFPS < 55) {
            thermalState = 'fair';
        }

        return {
            fps: avgFPS,
            frameTime: avgFrameTime,
            heapUsedMB,
            heapLimitMB,
            memoryPressure,
            devicePixelRatio: globalThis.window?.devicePixelRatio ?? 1,
            batteryLevel: this.batteryLevel,
            isCharging: this.isCharging,
            thermalState,
            connectionType: this.connectionType,
            deviceTier: this.deviceTier,
            gpuTier: resolveGpuTier(this.deviceTier),
            coreCount: navigator.hardwareConcurrency || 2,
            timestamp: Date.now(),
        };
    }

    /** Get rolling average FPS */
    getAverageFPS(): number {
        if (this.fpsHistory.length === 0) return 60;
        return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    }

    /** Get last frame time */
    getLastFrameTime(): number {
        return this.lastFrameTime;
    }

    /** Get device tier */
    getDeviceTier(): DeviceTier {
        return this.deviceTier;
    }

    // ─── Battery API ───────────────────────────────────────────

    private async initBatteryWatch(): Promise<void> {
        try {
            const nav = navigator as Navigator & {
                getBattery?: () => Promise<{
                    level: number;
                    charging: boolean;
                    addEventListener: (type: string, listener: () => void) => void;
                }>;
            };
            if (nav.getBattery) {
                const battery = await nav.getBattery();
                this.batteryLevel = battery.level;
                this.isCharging = battery.charging;
                battery.addEventListener('levelchange', () => {
                    this.batteryLevel = battery.level;
                });
                battery.addEventListener('chargingchange', () => {
                    this.isCharging = battery.charging;
                });
            }
        } catch {
            // Battery API not available — defaults to plugged in
        }
    }

    // ─── Connection API ────────────────────────────────────────

    private initConnectionWatch(): void {
        try {
            const nav = navigator as Navigator & {
                connection?: {
                    effectiveType: string;
                    addEventListener: (type: string, listener: () => void) => void;
                };
            };
            if (nav.connection) {
                this.connectionType = nav.connection.effectiveType;
                nav.connection.addEventListener('change', () => {
                    this.connectionType = nav.connection?.effectiveType ?? 'unknown';
                });
            }
        } catch {
            // Not available
        }
    }
}

// ═════════════════════════════════════════════════════════════════
//  2. SCALING STRATEGY
//     Analyzes EnvSnapshot and produces ScalingDecision.
// ═════════════════════════════════════════════════════════════════

const LOD_ORDER: LODLevel[] = ['ultra', 'high', 'medium', 'low', 'minimal'];

/** Tier-based defaults */
const TIER_DEFAULTS: Record<DeviceTier, Partial<ScalingDecision>> = {
    'high-end': {
        lodLevel: 'ultra',
        particleCount: 4000,
        shadowsEnabled: true,
        postProcessing: true,
        pixelRatio: 2,
        mapQuality: 'high',
        chartFidelity: 'full',
        motionReduced: false,
    },
    'mid-range': {
        lodLevel: 'high',
        particleCount: 2000,
        shadowsEnabled: false,
        postProcessing: true,
        pixelRatio: 1.5,
        mapQuality: 'high',
        chartFidelity: 'full',
        motionReduced: false,
    },
    'low-end': {
        lodLevel: 'medium',
        particleCount: 500,
        shadowsEnabled: false,
        postProcessing: false,
        pixelRatio: 1,
        mapQuality: 'medium',
        chartFidelity: 'reduced',
        motionReduced: false,
    },
    'potato': {
        lodLevel: 'low',
        particleCount: 0,
        shadowsEnabled: false,
        postProcessing: false,
        pixelRatio: 1,
        mapQuality: 'low',
        chartFidelity: 'minimal',
        motionReduced: true,
    },
};

/**
 * ScalingStrategy — determines quality settings based on environment.
 *
 * Rules (in priority order):
 *   1. FPS < 30 → emergency: minimal LOD, no particles, no shadows
 *   2. FPS < 45 → aggressive: reduce LOD 2 steps, half particles
 *   3. FPS < 55 → gentle: reduce LOD 1 step
 *   4. Memory > 80% → reduce particles, drop LOD
 *   5. Battery < 20% && !charging → reduce DPR, disable shadows
 *   6. Thermal critical → emergency mode
 *   7. All OK + FPS > 58 sustained → can increase quality
 */
export class ScalingStrategy {
    private lastDecision: ScalingDecision;
    private readonly cooldownMs = 2000;  // don't change more than every 2s
    private lastDecisionTime = 0;
    private violations: PerfViolation[] = [];

    constructor(tier: DeviceTier = 'mid-range') {
        const defaults = TIER_DEFAULTS[tier];
        this.lastDecision = {
            lodLevel: defaults.lodLevel ?? 'high',
            particleCount: defaults.particleCount ?? 2000,
            shadowsEnabled: defaults.shadowsEnabled ?? false,
            postProcessing: defaults.postProcessing ?? true,
            pixelRatio: defaults.pixelRatio ?? 1.5,
            mapQuality: defaults.mapQuality ?? 'high',
            chartFidelity: defaults.chartFidelity ?? 'full',
            motionReduced: defaults.motionReduced ?? false,
            reason: 'initial',
            timestamp: Date.now(),
        };
    }

    /**
     * Evaluate environment and return scaling decision.
     * Returns null if no change needed (within cooldown or no change).
     */
    evaluate(env: EnvSnapshot): ScalingDecision | null {
        const now = Date.now();
        if (now - this.lastDecisionTime < this.cooldownMs) {
            return null;
        }

        const decision = { ...this.lastDecision };
        let changed = false;
        const reasons: string[] = [];

        // FPS-based rules
        changed = this.applyFpsRules(env, decision, reasons) || changed;

        // ─── Rule 4: Memory pressure ──────────────────────────
        if (env.memoryPressure > 0.8) {
            decision.particleCount = Math.min(decision.particleCount, 500);
            decision.lodLevel = this.stepLOD(decision.lodLevel, 1);
            reasons.push(`memory: ${(env.memoryPressure * 100).toFixed(0)}%`);
            changed = true;
            this.addViolation('Memory > 80%', 'warn', env.memoryPressure, 0.8);
        }

        // ─── Rule 5: Battery low ──────────────────────────────
        if (env.batteryLevel < 0.2 && !env.isCharging) {
            decision.pixelRatio = Math.min(decision.pixelRatio, 1);
            decision.shadowsEnabled = false;
            decision.particleCount = Math.min(decision.particleCount, 1000);
            reasons.push(`battery: ${(env.batteryLevel * 100).toFixed(0)}%`);
            changed = true;
        }

        // Thermal rules
        changed = this.applyThermalRules(env, decision, reasons) || changed;

        // ─── Rule 7: Can increase quality ─────────────────────
        changed = this.tryQualityIncrease(env, decision, reasons) || changed;

        if (!changed) return null;

        decision.reason = reasons.join('; ');
        decision.timestamp = now;
        this.lastDecision = decision;
        this.lastDecisionTime = now;

        return decision;
    }

    /** Apply FPS-based scaling rules 1-3 */
    private applyFpsRules(
        env: EnvSnapshot,
        decision: ScalingDecision,
        reasons: string[],
    ): boolean {
        if (env.fps < 30) {
            decision.lodLevel = 'minimal';
            decision.particleCount = 0;
            decision.shadowsEnabled = false;
            decision.postProcessing = false;
            decision.pixelRatio = 0.75;
            decision.motionReduced = true;
            reasons.push(`emergency: fps=${env.fps.toFixed(0)}`);
            this.addViolation('FPS < 30', 'critical', env.fps, 30);
            return true;
        }
        if (env.fps < 45) {
            decision.lodLevel = this.stepLOD(decision.lodLevel, 2);
            decision.particleCount = Math.floor(decision.particleCount * 0.5);
            decision.shadowsEnabled = false;
            decision.postProcessing = false;
            reasons.push(`aggressive: fps=${env.fps.toFixed(0)}`);
            this.addViolation('FPS < 45', 'warn', env.fps, 45);
            return true;
        }
        if (env.fps < 55) {
            decision.lodLevel = this.stepLOD(decision.lodLevel, 1);
            reasons.push(`gentle: fps=${env.fps.toFixed(0)}`);
            return true;
        }
        return false;
    }

    /** Apply thermal scaling rules */
    private applyThermalRules(
        env: EnvSnapshot,
        decision: ScalingDecision,
        reasons: string[],
    ): boolean {
        if (env.thermalState === 'critical') {
            decision.lodLevel = 'minimal';
            decision.particleCount = 0;
            decision.motionReduced = true;
            reasons.push('thermal: critical');
            this.addViolation('Thermal critical', 'critical', 1, 0);
            return true;
        }
        if (env.thermalState === 'serious') {
            decision.lodLevel = this.stepLOD(decision.lodLevel, 1);
            decision.particleCount = Math.floor(decision.particleCount * 0.5);
            reasons.push('thermal: serious');
            return true;
        }
        return false;
    }

    /** Try increasing quality when conditions are favorable (Rule 7) */
    private tryQualityIncrease(
        env: EnvSnapshot,
        decision: ScalingDecision,
        reasons: string[],
    ): boolean {
        if (env.fps <= 58) return false;
        if (env.memoryPressure >= 0.5) return false;
        if (env.thermalState !== 'nominal') return false;
        if (!env.isCharging && env.batteryLevel <= 0.5) return false;

        let increased = false;
        const tierDefaults = TIER_DEFAULTS[env.deviceTier];
        const maxLOD = tierDefaults.lodLevel ?? 'high';
        const maxLODIdx = LOD_ORDER.indexOf(maxLOD);
        const currentIdx = LOD_ORDER.indexOf(decision.lodLevel);

        if (currentIdx > maxLODIdx) {
            decision.lodLevel = LOD_ORDER[Math.max(0, currentIdx - 1)];
            reasons.push('quality-up: headroom available');
            increased = true;
        }

        if (decision.particleCount < (tierDefaults.particleCount ?? 2000)) {
            decision.particleCount = Math.min(
                (tierDefaults.particleCount ?? 2000),
                decision.particleCount + 200,
            );
            increased = true;
        }

        return increased;
    }

    /** Get last decision */
    getLastDecision(): ScalingDecision {
        return { ...this.lastDecision };
    }

    /** Get accumulated violations */
    getViolations(): PerfViolation[] {
        return this.violations.slice(-20); // last 20
    }

    /** Clear violations */
    clearViolations(): void {
        this.violations = [];
    }

    // ─── Helpers ───────────────────────────────────────────────

    private stepLOD(current: LODLevel, steps: number): LODLevel {
        const idx = LOD_ORDER.indexOf(current);
        return LOD_ORDER[Math.min(idx + steps, LOD_ORDER.length - 1)];
    }

    private addViolation(
        rule: string,
        severity: 'warn' | 'critical',
        value: number,
        threshold: number,
    ): void {
        this.violations.push({
            rule,
            severity,
            value,
            threshold,
            message: `${rule}: ${value.toFixed(2)} (threshold: ${threshold})`,
            timestamp: Date.now(),
        });
        // Keep bounded
        if (this.violations.length > 100) {
            this.violations = this.violations.slice(-50);
        }
    }
}

// ═════════════════════════════════════════════════════════════════
//  3. ADAPTIVE CONTROLLER — Singleton orchestrator
//     Ties EnvMonitor + ScalingStrategy together.
//     Call tick() from the frame scheduler.
// ═════════════════════════════════════════════════════════════════

export type ScalingCallback = (decision: ScalingDecision) => void;

/**
 * AdaptiveController — the master performance intelligence.
 *
 * Usage:
 *   const adaptive = new AdaptiveController();
 *   adaptive.onScale((decision) => {
 *     sceneController.applyConfig(decision);
 *   });
 *   // In frame loop:
 *   adaptive.tick();
 */
export class AdaptiveController {
    readonly monitor: EnvMonitor;
    readonly strategy: ScalingStrategy;
    private listeners: ScalingCallback[] = [];
    private lastSnapshot: EnvSnapshot | null = null;

    constructor() {
        this.monitor = new EnvMonitor();
        this.monitor.init();
        const tier = this.monitor.getDeviceTier();
        this.strategy = new ScalingStrategy(tier);
    }

    /** Register a scaling callback */
    onScale(cb: ScalingCallback): void {
        this.listeners.push(cb);
    }

    /** Remove a scaling callback */
    offScale(cb: ScalingCallback): void {
        this.listeners = this.listeners.filter((l) => l !== cb);
    }

    /**
     * Tick — call every frame from frame scheduler.
     * Samples environment and evaluates scaling strategy.
     */
    tick(): void {
        // Sample
        this.monitor.sample();
        this.lastSnapshot = this.monitor.getSnapshot();

        // Evaluate
        const decision = this.strategy.evaluate(this.lastSnapshot);
        if (decision) {
            this.listeners.forEach((cb) => cb(decision));
        }
    }

    /** Get last environment snapshot */
    getSnapshot(): EnvSnapshot | null {
        return this.lastSnapshot;
    }

    /** Get current scaling decision */
    getCurrentDecision(): ScalingDecision {
        return this.strategy.getLastDecision();
    }

    /** Get device tier */
    getDeviceTier(): DeviceTier {
        return this.monitor.getDeviceTier();
    }

    /** Force a specific decision (for testing/override) */
    forceDecision(decision: Partial<ScalingDecision>): void {
        const full: ScalingDecision = {
            ...this.strategy.getLastDecision(),
            ...decision,
            reason: 'manual override',
            timestamp: Date.now(),
        };
        this.listeners.forEach((cb) => cb(full));
    }
}
