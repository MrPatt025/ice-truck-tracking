/**
 * Ring 2 — Unit Tests: Spring Physics Engine
 *
 * Pure-math tests — no DOM, no rAF, no WebGL.
 * Tests damped harmonic oscillator, Spring2D, and presets.
 */
import {
    SpringValue,
    Spring2D,
    SPRING_PRESETS,
    MOTION_TIER_PRESETS,
} from '../motion/springPhysics';

// ─── Helpers ───────────────────────────────────────────────────

/** Advance a spring for N simulation steps at 60 Hz */
function simulate(spring: SpringValue, steps: number, dt = 1 / 60): void {
    for (let i = 0; i < steps; i++) {
        spring.tick(dt);
    }
}

function simulate2D(spring: Spring2D, steps: number, dt = 1 / 60): void {
    for (let i = 0; i < steps; i++) {
        spring.tick(dt);
    }
}

// ═══════════════════════════════════════════════════════════════
//  SpringValue
// ═══════════════════════════════════════════════════════════════

describe('SpringValue', () => {
    it('starts at rest at initial value', () => {
        const s = new SpringValue(42);
        expect(s.value).toBe(42);
        expect(s.isAtRest).toBe(true);
        expect(s.vel).toBe(0);
    });

    it('animates toward target', () => {
        const s = new SpringValue(0);
        s.setTarget(100);
        expect(s.isAtRest).toBe(false);

        simulate(s, 10);
        // After 10 frames, should have moved toward 100
        expect(s.value).toBeGreaterThan(0);
        expect(s.value).toBeLessThan(100);
    });

    it('reaches target within 2 seconds (120 frames @ 60 Hz)', () => {
        const s = new SpringValue(0);
        s.setTarget(100);
        simulate(s, 120);

        expect(s.isAtRest).toBe(true);
        expect(s.value).toBe(100);
    });

    it('fires onChange callback during animation', () => {
        const values: number[] = [];
        const s = new SpringValue(0);
        s.onChange((v) => values.push(v));
        s.setTarget(50);
        simulate(s, 5);

        expect(values.length).toBeGreaterThan(0);
        expect(values.every((v) => typeof v === 'number')).toBe(true);
    });

    it('fires onComplete when reaching rest', () => {
        let rested = false;
        const s = new SpringValue(0);
        s.onComplete(() => { rested = true; });
        s.setTarget(10);
        simulate(s, 200);

        expect(rested).toBe(true);
        expect(s.isAtRest).toBe(true);
    });

    it('snapTo jumps immediately without animation', () => {
        const s = new SpringValue(0);
        s.snapTo(999);

        expect(s.value).toBe(999);
        expect(s.vel).toBe(0);
        expect(s.isAtRest).toBe(true);
    });

    it('handles zero-distance setTarget (no-op)', () => {
        const s = new SpringValue(50);
        s.setTarget(50); // within precision — no movement
        expect(s.isAtRest).toBe(true);
    });

    it('clamps dt to prevent instability', () => {
        const s = new SpringValue(0);
        s.setTarget(100);
        // Simulate with a very large dt (e.g., 1 second — tab was backgrounded)
        const stillAnimating = s.tick(1.0);
        // Should not explode — value should be finite
        expect(Number.isFinite(s.value)).toBe(true);
        expect(typeof stillAnimating).toBe('boolean');
    });

    it('exposes readonly state for debugging', () => {
        const s = new SpringValue(5);
        const state = s.getState();
        expect(state).toHaveProperty('position', 5);
        expect(state).toHaveProperty('velocity', 0);
        expect(state).toHaveProperty('target', 5);
        expect(state).toHaveProperty('atRest', true);
    });

    it('supports config update mid-animation', () => {
        const s = new SpringValue(0);
        s.setTarget(100);
        simulate(s, 10);
        const posBeforeConfigChange = s.value;

        s.setConfig({ stiffness: 1000, damping: 50 });
        simulate(s, 10);
        // With much stiffer spring, should have progressed further
        expect(s.value).toBeGreaterThan(posBeforeConfigChange);
    });
});

// ═══════════════════════════════════════════════════════════════
//  Spring2D
// ═══════════════════════════════════════════════════════════════

describe('Spring2D', () => {
    it('starts at rest at initial position', () => {
        const s = new Spring2D(10, 20);
        expect(s.position).toEqual({ x: 10, y: 20 });
        expect(s.isAtRest).toBe(true);
    });

    it('animates both axes toward target', () => {
        const s = new Spring2D(0, 0);
        s.setTarget(100, 200);
        simulate2D(s, 30);

        expect(s.position.x).toBeGreaterThan(0);
        expect(s.position.y).toBeGreaterThan(0);
    });

    it('reaches 2D target within 2 seconds', () => {
        const s = new Spring2D(0, 0);
        s.setTarget(50, 75);
        simulate2D(s, 120);

        expect(s.isAtRest).toBe(true);
        expect(s.position.x).toBe(50);
        expect(s.position.y).toBe(75);
    });

    it('fires 2D onChange callback', () => {
        const positions: Array<{ x: number; y: number }> = [];
        const s = new Spring2D(0, 0);
        s.onChange((x, y) => positions.push({ x, y }));
        s.setTarget(10, 10);
        simulate2D(s, 5);

        expect(positions.length).toBeGreaterThan(0);
    });

    it('snapTo 2D jumps immediately', () => {
        const s = new Spring2D(0, 0);
        s.snapTo(300, 400);
        expect(s.position).toEqual({ x: 300, y: 400 });
        expect(s.isAtRest).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════
//  Presets
// ═══════════════════════════════════════════════════════════════

describe('SPRING_PRESETS', () => {
    it('has all required presets', () => {
        const expected = ['default', 'gentle', 'stiff', 'bouncy', 'magnetic', 'slow', 'snap'];
        for (const name of expected) {
            expect(SPRING_PRESETS[name]).toBeDefined();
            expect(SPRING_PRESETS[name].mass).toBeGreaterThan(0);
            expect(SPRING_PRESETS[name].stiffness).toBeGreaterThan(0);
            expect(SPRING_PRESETS[name].damping).toBeGreaterThan(0);
        }
    });

    it('bouncy preset overshoots target', () => {
        const s = new SpringValue(0, SPRING_PRESETS.bouncy);
        s.setTarget(100);
        let maxValue = 0;
        for (let i = 0; i < 120; i++) {
            s.tick(1 / 60);
            if (s.value > maxValue) maxValue = s.value;
        }
        // Bouncy should overshoot past 100
        expect(maxValue).toBeGreaterThan(100);
    });

    it('stiff preset reaches rest faster than gentle', () => {
        const stiff = new SpringValue(0, SPRING_PRESETS.stiff);
        const gentle = new SpringValue(0, SPRING_PRESETS.gentle);
        stiff.setTarget(100);
        gentle.setTarget(100);

        let stiffRestFrame = -1;
        let gentleRestFrame = -1;
        for (let i = 0; i < 300; i++) {
            stiff.tick(1 / 60);
            gentle.tick(1 / 60);
            if (stiffRestFrame < 0 && stiff.isAtRest) stiffRestFrame = i;
            if (gentleRestFrame < 0 && gentle.isAtRest) gentleRestFrame = i;
        }

        expect(stiffRestFrame).toBeLessThan(gentleRestFrame);
    });
});

describe('MOTION_TIER_PRESETS', () => {
    it('has all four motion tiers', () => {
        expect(MOTION_TIER_PRESETS.macro).toBeDefined();
        expect(MOTION_TIER_PRESETS.meso).toBeDefined();
        expect(MOTION_TIER_PRESETS.micro).toBeDefined();
        expect(MOTION_TIER_PRESETS.nano).toBeDefined();
    });
});
