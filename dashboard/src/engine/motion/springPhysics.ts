/* ================================================================
 *  Motion Physics Engine — Spring System + Velocity Tracker
 *  ─────────────────────────────────────────────────────────
 *  Pure-math spring physics — NO CSS transitions, NO requestAnimationFrame.
 *  Designed to be driven by the frame scheduler (external rAF).
 *
 *  Features:
 *    1. SpringValue  — Single spring-driven value
 *    2. Spring2D     — 2D position spring (for drag/gesture)
 *    3. VelocityTracker — Sample-based velocity estimation
 *    4. GestureEngine — Pointer tracking with inertia decay
 *    5. SpringGroup  — Managed set with motion hierarchy budgets
 *
 *  Motion hierarchy (budget per tier):
 *    Macro (300ms) — Page transitions, panel slides
 *    Meso  (200ms) — Cards, modals, section reveals
 *    Micro (120ms) — Buttons, toggles, chips
 *    Nano  (<80ms) — Hover, focus rings, tooltips
 *
 *  Frame budget: 2ms total for all motion calculations.
 * ================================================================ */

import type { SpringConfig, SpringState, Velocity2D, MotionTier, GestureState } from '../types';

// ═════════════════════════════════════════════════════════════════
//  PRESETS
// ═════════════════════════════════════════════════════════════════

export const SPRING_PRESETS: Record<string, SpringConfig> = {
    /** Default — snappy, no overshoot */
    default: { mass: 1, stiffness: 170, damping: 26, precision: 0.01 },
    /** Gentle — for panels and large elements */
    gentle: { mass: 1, stiffness: 120, damping: 20, precision: 0.01 },
    /** Stiff — for small interactive elements */
    stiff: { mass: 1, stiffness: 300, damping: 30, precision: 0.01 },
    /** Bouncy — playful overshoot */
    bouncy: { mass: 1, stiffness: 200, damping: 12, precision: 0.01 },
    /** Magnetic — for magnetic button attraction */
    magnetic: { mass: 0.5, stiffness: 400, damping: 28, precision: 0.005 },
    /** Slow — for background parallax */
    slow: { mass: 2, stiffness: 80, damping: 18, precision: 0.02 },
    /** Snap — instant feel */
    snap: { mass: 0.5, stiffness: 500, damping: 35, precision: 0.02 },
};

// Tier-appropriate presets
export const MOTION_TIER_PRESETS: Record<MotionTier, SpringConfig> = {
    macro: SPRING_PRESETS.gentle,
    meso: SPRING_PRESETS.default,
    micro: SPRING_PRESETS.stiff,
    nano: SPRING_PRESETS.snap,
};

// ═════════════════════════════════════════════════════════════════
//  1. SPRING VALUE (single float)
// ═════════════════════════════════════════════════════════════════

/**
 * SpringValue — a single spring-driven floating point value.
 *
 * Implements the damped harmonic oscillator:
 *   F = -k(x - target) - d * velocity
 *   a = F / mass
 *
 * Semi-implicit Euler integration (stable for stiff springs).
 */
export class SpringValue {
    private state: SpringState;
    private config: SpringConfig;
    private onUpdate: ((value: number) => void) | null = null;
    private onRest: (() => void) | null = null;

    constructor(
        initialValue = 0,
        config: Partial<SpringConfig> = {},
    ) {
        this.config = { ...SPRING_PRESETS.default, ...config };
        this.state = {
            position: initialValue,
            velocity: 0,
            target: initialValue,
            atRest: true,
        };
    }

    /** Set target — spring will animate toward this value */
    setTarget(target: number): void {
        if (Math.abs(target - this.state.target) < this.config.precision) return;
        this.state.target = target;
        this.state.atRest = false;
    }

    /** Jump to value immediately (no animation) */
    snapTo(value: number): void {
        this.state.position = value;
        this.state.target = value;
        this.state.velocity = 0;
        this.state.atRest = true;
        this.onUpdate?.(value);
    }

    /**
     * Advance by dt seconds.
     * Called by the frame scheduler — does NOT manage its own rAF.
     * Returns true if still animating, false if at rest.
     */
    tick(dt: number): boolean {
        if (this.state.atRest) return false;

        const { mass, stiffness, damping, precision } = this.config;
        const { position, velocity, target } = this.state;

        // Clamp dt to prevent instability
        const dtClamped = Math.min(dt, 0.064);

        // Spring force: F = -k * displacement - d * velocity
        const displacement = position - target;
        const springForce = -stiffness * displacement;
        const dampingForce = -damping * velocity;
        const acceleration = (springForce + dampingForce) / mass;

        // Semi-implicit Euler
        const newVelocity = velocity + acceleration * dtClamped;
        const newPosition = position + newVelocity * dtClamped;

        // Rest check
        if (
            Math.abs(newVelocity) < precision &&
            Math.abs(newPosition - target) < precision
        ) {
            this.state.position = target;
            this.state.velocity = 0;
            this.state.atRest = true;
            this.onUpdate?.(target);
            this.onRest?.();
            return false;
        }

        this.state.position = newPosition;
        this.state.velocity = newVelocity;
        this.onUpdate?.(newPosition);
        return true;
    }

    /** Get current value */
    get value(): number { return this.state.position; }

    /** Get current velocity */
    get vel(): number { return this.state.velocity; }

    /** Is the spring at rest? */
    get isAtRest(): boolean { return this.state.atRest; }

    /** Get full state (for debugging) */
    getState(): Readonly<SpringState> { return this.state; }

    /** Set update callback */
    onChange(cb: (value: number) => void): void { this.onUpdate = cb; }

    /** Set rest callback */
    onComplete(cb: () => void): void { this.onRest = cb; }

    /** Update config */
    setConfig(config: Partial<SpringConfig>): void {
        Object.assign(this.config, config);
    }
}

// ═════════════════════════════════════════════════════════════════
//  2. SPRING 2D (position spring for UI elements)
// ═════════════════════════════════════════════════════════════════

/**
 * Spring2D — spring-driven 2D point for position/offset springs.
 */
export class Spring2D {
    readonly x: SpringValue;
    readonly y: SpringValue;
    private onUpdate2D: ((x: number, y: number) => void) | null = null;

    constructor(
        initialX = 0,
        initialY = 0,
        config: Partial<SpringConfig> = {},
    ) {
        this.x = new SpringValue(initialX, config);
        this.y = new SpringValue(initialY, config);
    }

    setTarget(x: number, y: number): void {
        this.x.setTarget(x);
        this.y.setTarget(y);
    }

    snapTo(x: number, y: number): void {
        this.x.snapTo(x);
        this.y.snapTo(y);
    }

    tick(dt: number): boolean {
        const ax = this.x.tick(dt);
        const ay = this.y.tick(dt);
        if (ax || ay) {
            this.onUpdate2D?.(this.x.value, this.y.value);
        }
        return ax || ay;
    }

    get isAtRest(): boolean { return this.x.isAtRest && this.y.isAtRest; }

    get position(): { x: number; y: number } {
        return { x: this.x.value, y: this.y.value };
    }

    onChange(cb: (x: number, y: number) => void): void {
        this.onUpdate2D = cb;
    }

    setConfig(config: Partial<SpringConfig>): void {
        this.x.setConfig(config);
        this.y.setConfig(config);
    }
}

// ═════════════════════════════════════════════════════════════════
//  3. VELOCITY TRACKER
//     Sample-based velocity estimation for gesture physics.
// ═════════════════════════════════════════════════════════════════

interface VelocitySample {
    x: number;
    y: number;
    t: number; // ms
}

/**
 * VelocityTracker — estimates pointer velocity from position samples.
 * Uses a windowed linear regression for smooth, accurate results.
 */
export class VelocityTracker {
    private samples: VelocitySample[] = [];
    private readonly maxAge = 100;   // ms — only recent samples
    private readonly maxSamples = 10;

    /** Add a position sample */
    addSample(x: number, y: number, timestamp = performance.now()): void {
        this.samples.push({ x, y, t: timestamp });

        // Prune old samples
        const cutoff = timestamp - this.maxAge;
        while (this.samples.length > this.maxSamples || (this.samples.length > 2 && this.samples[0].t < cutoff)) {
            this.samples.shift();
        }
    }

    /** Compute current velocity (px/ms) */
    getVelocity(): Velocity2D {
        const now = performance.now();

        if (this.samples.length < 2) {
            return { x: 0, y: 0, magnitude: 0, angle: 0, timestamp: now };
        }

        // Weighted average of recent deltas
        let vx = 0, vy = 0, totalWeight = 0;

        for (let i = 1; i < this.samples.length; i++) {
            const prev = this.samples[i - 1];
            const curr = this.samples[i];
            const dt = curr.t - prev.t;
            if (dt <= 0) continue;

            // More recent samples get higher weight
            const age = now - curr.t;
            const weight = Math.max(0, 1 - age / this.maxAge);

            vx += ((curr.x - prev.x) / dt) * weight;
            vy += ((curr.y - prev.y) / dt) * weight;
            totalWeight += weight;
        }

        if (totalWeight > 0) {
            vx /= totalWeight;
            vy /= totalWeight;
        }

        const magnitude = Math.sqrt(vx * vx + vy * vy);
        const angle = Math.atan2(vy, vx);

        return { x: vx, y: vy, magnitude, angle, timestamp: now };
    }

    /** Reset samples */
    reset(): void {
        this.samples = [];
    }
}

// ═════════════════════════════════════════════════════════════════
//  4. GESTURE ENGINE
//     Pointer tracking with inertia decay after release.
// ═════════════════════════════════════════════════════════════════

/**
 * GestureEngine — manages pointer down/move/up lifecycle.
 * Provides gesture state and release velocity for inertia.
 */
export class GestureEngine {
    private tracker: VelocityTracker;
    private spring: Spring2D;
    private state: GestureState;
    private onGestureUpdate: ((state: GestureState) => void) | null = null;

    constructor(config: Partial<SpringConfig> = SPRING_PRESETS.gentle) {
        this.tracker = new VelocityTracker();
        this.spring = new Spring2D(0, 0, config);
        this.state = {
            isDragging: false,
            startX: 0, startY: 0,
            currentX: 0, currentY: 0,
            velocityX: 0, velocityY: 0,
            offsetX: 0, offsetY: 0,
            timestamp: 0,
        };
    }

    /** Call on pointerdown */
    start(x: number, y: number): void {
        this.tracker.reset();
        this.tracker.addSample(x, y);
        this.state.isDragging = true;
        this.state.startX = x;
        this.state.startY = y;
        this.state.currentX = x;
        this.state.currentY = y;
        this.state.offsetX = 0;
        this.state.offsetY = 0;
        this.state.timestamp = performance.now();
        this.spring.snapTo(0, 0);
    }

    /** Call on pointermove */
    move(x: number, y: number): void {
        if (!this.state.isDragging) return;
        this.tracker.addSample(x, y);
        this.state.currentX = x;
        this.state.currentY = y;
        this.state.offsetX = x - this.state.startX;
        this.state.offsetY = y - this.state.startY;
        this.state.timestamp = performance.now();
        this.onGestureUpdate?.({ ...this.state });
    }

    /**
     * Call on pointerup — initiates inertia decay.
     * The spring will animate from current offset to 0 (snap back)
     * or you can provide a target for momentum scrolling.
     */
    release(targetX = 0, targetY = 0): Velocity2D {
        this.state.isDragging = false;
        const velocity = this.tracker.getVelocity();
        this.state.velocityX = velocity.x;
        this.state.velocityY = velocity.y;

        // Set spring to current position with target
        this.spring.x.snapTo(this.state.offsetX);
        this.spring.y.snapTo(this.state.offsetY);
        this.spring.setTarget(targetX, targetY);

        return velocity;
    }

    /** Tick the inertia spring (call from frame scheduler) */
    tick(dt: number): boolean {
        if (this.state.isDragging) return true; // dragging is always "active"
        const active = this.spring.tick(dt);
        if (active) {
            this.state.offsetX = this.spring.x.value;
            this.state.offsetY = this.spring.y.value;
            this.onGestureUpdate?.({ ...this.state });
        }
        return active;
    }

    /** Get current gesture state */
    getState(): Readonly<GestureState> { return this.state; }

    /** Set update callback */
    onChange(cb: (state: GestureState) => void): void { this.onGestureUpdate = cb; }

    /** Get the underlying spring for direct manipulation */
    getSpring(): Spring2D { return this.spring; }
}

// ═════════════════════════════════════════════════════════════════
//  5. SPRING GROUP (manages multiple springs in budget)
// ═════════════════════════════════════════════════════════════════

interface ManagedSpring {
    id: string;
    spring: SpringValue | Spring2D;
    tier: MotionTier;
    priority: number; // 0 = highest
}

/**
 * SpringGroup — manages a set of springs within the 2ms motion budget.
 * Higher-tier (macro) springs get priority; nano springs skipped if over budget.
 */
export class SpringGroup {
    private springs: Map<string, ManagedSpring> = new Map();
    private sorted: ManagedSpring[] = [];
    private needsSort = false;

    /** Register a spring */
    add(id: string, spring: SpringValue | Spring2D, tier: MotionTier = 'micro', priority = 5): void {
        this.springs.set(id, { id, spring, tier, priority });
        this.needsSort = true;
    }

    /** Remove a spring */
    remove(id: string): void {
        this.springs.delete(id);
        this.needsSort = true;
    }

    /**
     * Tick all springs within the 2ms budget.
     * Returns the number of springs that were ticked.
     */
    tick(dt: number): number {
        if (this.needsSort) {
            this.sorted = Array.from(this.springs.values()).sort(
                (a, b) => a.priority - b.priority,
            );
            this.needsSort = false;
        }

        const start = performance.now();
        const BUDGET = 2; // ms
        let ticked = 0;

        for (const entry of this.sorted) {
            // Budget check — skip lower priority if over budget
            if (ticked > 0 && performance.now() - start > BUDGET) {
                break;
            }

            entry.spring.tick(dt);
            ticked++;
        }

        return ticked;
    }

    /** Get count of active (non-resting) springs */
    getActiveCount(): number {
        let count = 0;
        this.springs.forEach((entry) => {
            if (!entry.spring.isAtRest) count++;
        });
        return count;
    }

    /** Get a spring by id */
    get(id: string): SpringValue | Spring2D | undefined {
        return this.springs.get(id)?.spring;
    }

    /** Clear all */
    clear(): void {
        this.springs.clear();
        this.sorted = [];
    }
}
