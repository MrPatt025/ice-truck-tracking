/* ================================================================
 *  Perception Engine — Contextual Tint, Noise Overlay, Typography
 *  ──────────────────────────────────────────────────────────────
 *  The cognitive layer that makes the UI feel alive and responsive
 *  to data context. Operates imperatively — no React re-renders.
 *
 *  Modules:
 *    1. ContextualTint   — Hue/saturation shifts on alert states
 *    2. NoiseOverlay     — SVG-based film grain (2-3% opacity)
 *    3. TypographyEngine — Variable font weight morphing
 *    4. DepthLayering    — Z-index + blur based on focus
 *
 *  Frame budget: runs within the 1.6ms overhead allocation.
 * ================================================================ */

import type {
    TintState,
    NoiseConfig,
    TypographyConfig,
    PerceptionContext,
    AlertLevel,
} from '../types';
import { SpringValue, SPRING_PRESETS } from '../motion/springPhysics';

// ═════════════════════════════════════════════════════════════════
//  1. CONTEXTUAL TINT — Alert-reactive UI color shifting
// ═════════════════════════════════════════════════════════════════

/** Alert level → hue shift mapping */
const ALERT_TINT: Record<AlertLevel, TintState> = {
    critical: {
        hue: 0,            // red
        saturation: 60,
        lightness: 50,
        opacity: 0.08,
        transitionMs: 200,
    },
    warning: {
        hue: 35,           // amber
        saturation: 50,
        lightness: 55,
        opacity: 0.05,
        transitionMs: 300,
    },
    info: {
        hue: 210,          // blue
        saturation: 40,
        lightness: 55,
        opacity: 0.03,
        transitionMs: 400,
    },
};

/** Neutral (no alert) tint */
const NEUTRAL_TINT: TintState = {
    hue: 220,
    saturation: 10,
    lightness: 50,
    opacity: 0,
    transitionMs: 500,
};

/**
 * ContextualTint — applies a translucent color overlay to the UI
 * that shifts based on system state (alerts, focus, time of day).
 *
 * Renders as a fixed overlay div with CSS hsl background.
 * Spring-driven transitions for smooth perceptual changes.
 */
export class ContextualTint {
    private readonly overlay: HTMLDivElement;
    private readonly hueSpring: SpringValue;
    private readonly satSpring: SpringValue;
    private readonly opacitySpring: SpringValue;
    private readonly currentState: TintState = { ...NEUTRAL_TINT };

    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'perception-tint-overlay';
        Object.assign(this.overlay.style, {
            position: 'fixed',
            inset: '0',
            pointerEvents: 'none',
            zIndex: '9990',
            transition: 'none',
            willChange: 'background-color',
            mixBlendMode: 'multiply',
        });

        this.hueSpring = new SpringValue(NEUTRAL_TINT.hue, SPRING_PRESETS.gentle);
        this.satSpring = new SpringValue(NEUTRAL_TINT.saturation, SPRING_PRESETS.gentle);
        this.opacitySpring = new SpringValue(0, SPRING_PRESETS.gentle);
    }

    /** Mount to document body */
    mount(): void {
        document.body.appendChild(this.overlay);
    }

    /** Set tint based on alert level */
    setAlertLevel(level: AlertLevel | null): void {
        const target = level ? ALERT_TINT[level] : NEUTRAL_TINT;
        this.hueSpring.setTarget(target.hue);
        this.satSpring.setTarget(target.saturation);
        this.opacitySpring.setTarget(target.opacity);
    }

    /** Set tint for focused truck (soft halo effect) */
    activateFocusTint(): void {
        this.opacitySpring.setTarget(0.04);
        this.hueSpring.setTarget(200);  // soft blue
    }

    /** Deactivate focus tint */
    deactivateFocusTint(): void {
        this.opacitySpring.setTarget(0);
    }

    /** Tick — update overlay color (call from frame scheduler) */
    tick(dt: number): void {
        const hActive = this.hueSpring.tick(dt);
        const sActive = this.satSpring.tick(dt);
        const oActive = this.opacitySpring.tick(dt);

        if (hActive || sActive || oActive) {
            const h = Math.round(this.hueSpring.value);
            const s = Math.round(this.satSpring.value);
            const o = this.opacitySpring.value;
            this.overlay.style.backgroundColor = `hsla(${h}, ${s}%, 50%, ${o.toFixed(4)})`;
        }
    }

    /** Destroy overlay */
    destroy(): void {
        this.overlay.remove();
    }
}

// ═════════════════════════════════════════════════════════════════
//  2. NOISE OVERLAY — SVG Film Grain
//     Adds subtle texture to flat UI surfaces.
//     Uses SVG feTurbulence (GPU-composited, no JS cost).
// ═════════════════════════════════════════════════════════════════

const DEFAULT_NOISE_CONFIG: NoiseConfig = {
    opacity: 0.025,
    frequency: 0.65,
    octaves: 4,
    animated: true,
    blendMode: 'overlay',
};

/**
 * NoiseOverlay — SVG-based film grain effect.
 *
 * Creates an inline SVG with feTurbulence and overlays it on the UI.
 * Animates the seed for a film-grain flickering effect.
 * Cost: ~0ms (composited by browser, not rasterized per frame).
 */
export class NoiseOverlay {
    private readonly svg: SVGSVGElement;
    private turbulence: SVGFETurbulenceElement | null = null;
    private readonly config: NoiseConfig;
    private animFrame = 0;
    private seed = 0;

    constructor(config: Partial<NoiseConfig> = {}) {
        this.config = { ...DEFAULT_NOISE_CONFIG, ...config };
        this.svg = this.createSVG();
    }

    /** Mount to document body */
    mount(): void {
        document.body.appendChild(this.svg);
    }

    /** Update animation seed (call sparingly, e.g., every 100ms) */
    tick(): void {
        if (!this.config.animated || !this.turbulence) return;

        this.animFrame++;
        // Only update every 6th frame (~100ms at 60fps) to save perf
        if (this.animFrame % 6 === 0) {
            this.seed = (this.seed + 1) % 100;
            this.turbulence.setAttribute('seed', String(this.seed));
        }
    }

    /** Set opacity */
    setOpacity(opacity: number): void {
        this.config.opacity = opacity;
        this.svg.style.opacity = String(opacity);
    }

    /** Toggle animation */
    setAnimated(animated: boolean): void {
        this.config.animated = animated;
    }

    /** Destroy */
    destroy(): void {
        this.svg.remove();
    }

    // ─── SVG Construction ──────────────────────────────────────

    private createSVG(): SVGSVGElement {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        Object.assign(svg.style, {
            position: 'fixed',
            inset: '0',
            pointerEvents: 'none',
            zIndex: '9991',
            opacity: String(this.config.opacity),
            mixBlendMode: this.config.blendMode,
        });

        const filter = document.createElementNS(ns, 'filter');
        filter.setAttribute('id', 'perception-noise');
        filter.setAttribute('x', '0%');
        filter.setAttribute('y', '0%');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');

        this.turbulence = document.createElementNS(ns, 'feTurbulence');
        this.turbulence.setAttribute('type', 'fractalNoise');
        this.turbulence.setAttribute('baseFrequency', String(this.config.frequency));
        this.turbulence.setAttribute('numOctaves', String(this.config.octaves));
        this.turbulence.setAttribute('stitchTiles', 'stitch');
        this.turbulence.setAttribute('seed', '0');
        filter.appendChild(this.turbulence);

        const defs = document.createElementNS(ns, 'defs');
        defs.appendChild(filter);
        svg.appendChild(defs);

        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('filter', 'url(#perception-noise)');
        svg.appendChild(rect);

        return svg;
    }
}

// ═════════════════════════════════════════════════════════════════
//  3. TYPOGRAPHY ENGINE — Variable Font Weight Morphing
//     Animates font-weight changes using springs.
//     Uses font-variant-numeric: tabular-nums for stable widths.
// ═════════════════════════════════════════════════════════════════

const DEFAULT_TYPOGRAPHY_CONFIG: TypographyConfig = {
    enableWeightMorph: true,
    enableTabularNums: true,
    weightRange: [300, 700],
    morphDuration: 200,
};

/**
 * TypographyEngine — manages dynamic font weight morphing.
 *
 * Registers elements that should have animated weight transitions.
 * Uses spring physics for smooth weight interpolation.
 */
export class TypographyEngine {
    private readonly config: TypographyConfig;
    private readonly managedElements: Map<string, {
        element: HTMLElement;
        spring: SpringValue;
        currentWeight: number;
    }> = new Map();

    constructor(config: Partial<TypographyConfig> = {}) {
        this.config = { ...DEFAULT_TYPOGRAPHY_CONFIG, ...config };
    }

    /**
     * Register an element for weight morphing.
     * @param id Unique identifier
     * @param element The DOM element
     * @param initialWeight Starting font weight
     */
    register(id: string, element: HTMLElement, initialWeight = 400): void {
        const spring = new SpringValue(initialWeight, SPRING_PRESETS.stiff);
        spring.onChange((w) => {
            element.style.fontWeight = String(Math.round(w));
        });

        if (this.config.enableTabularNums) {
            element.style.fontVariantNumeric = 'tabular-nums';
        }

        this.managedElements.set(id, { element, spring, currentWeight: initialWeight });
    }

    /** Unregister an element */
    unregister(id: string): void {
        this.managedElements.delete(id);
    }

    /** Set target weight for an element */
    setWeight(id: string, weight: number): void {
        const entry = this.managedElements.get(id);
        if (!entry) return;

        const [min, max] = this.config.weightRange;
        const clamped = Math.max(min, Math.min(max, weight));
        entry.spring.setTarget(clamped);
    }

    /**
     * Set weight based on data importance.
     * Maps a 0-1 importance value to the weight range.
     */
    setImportance(id: string, importance: number): void {
        const [min, max] = this.config.weightRange;
        const weight = min + (max - min) * Math.max(0, Math.min(1, importance));
        this.setWeight(id, weight);
    }

    /** Tick all springs (call from frame scheduler) */
    tick(dt: number): void {
        if (!this.config.enableWeightMorph) return;
        this.managedElements.forEach((entry) => {
            entry.spring.tick(dt);
        });
    }

    /** Get managed element count */
    get size(): number { return this.managedElements.size; }

    /** Destroy all */
    destroy(): void {
        this.managedElements.clear();
    }
}

// ═════════════════════════════════════════════════════════════════
//  4. DEPTH LAYERING — Focus-based blur + z-index
//     When a truck or panel is focused, background blurs slightly.
// ═════════════════════════════════════════════════════════════════

/**
 * DepthLayering — manages a focus/blur stack.
 * Focused elements are sharp, background softens.
 */
export class DepthLayering {
    private readonly blurSpring: SpringValue;
    private container: HTMLElement | null = null;
    private backgroundElements: HTMLElement[] = [];

    constructor() {
        this.blurSpring = new SpringValue(0, SPRING_PRESETS.default);
        this.blurSpring.onChange((v) => {
            this.backgroundElements.forEach((el) => {
                el.style.filter = v > 0.1 ? `blur(${v.toFixed(1)}px)` : '';
            });
        });
    }

    /** Set the main container */
    setContainer(container: HTMLElement): void {
        this.container = container;
    }

    /** Register background elements that should blur */
    addBackgroundElement(element: HTMLElement): void {
        this.backgroundElements.push(element);
    }

    /** Focus mode — blur background */
    enterFocus(blurAmount = 3): void {
        this.blurSpring.setTarget(blurAmount);
    }

    /** Exit focus — remove blur */
    exitFocus(): void {
        this.blurSpring.setTarget(0);
    }

    /** Tick spring */
    tick(dt: number): void {
        this.blurSpring.tick(dt);
    }

    /** Destroy */
    destroy(): void {
        this.backgroundElements.forEach((el) => {
            el.style.filter = '';
        });
        this.backgroundElements = [];
    }
}

// ═════════════════════════════════════════════════════════════════
//  5. PERCEPTION ORCHESTRATOR — Ties all perception modules
// ═════════════════════════════════════════════════════════════════

/**
 * PerceptionEngine — unified perception layer manager.
 * Instantiates and coordinates all perception modules.
 */
export class PerceptionEngine {
    readonly tint: ContextualTint;
    readonly noise: NoiseOverlay;
    readonly typography: TypographyEngine;
    readonly depth: DepthLayering;

    private readonly context: PerceptionContext = {
        alertLevel: null,
        focusedTruckId: null,
        systemLoad: 0,
        timeOfDay: 'day',
        theme: 'dark',
    };

    constructor() {
        this.tint = new ContextualTint();
        this.noise = new NoiseOverlay();
        this.typography = new TypographyEngine();
        this.depth = new DepthLayering();
    }

    /** Mount all perception overlays */
    mount(): void {
        this.tint.mount();
        this.noise.mount();
    }

    /** Update perception context (call when state changes) */
    updateContext(updates: Partial<PerceptionContext>): void {
        Object.assign(this.context, updates);

        // React to alert level
        if (updates.alertLevel !== undefined) {
            this.tint.setAlertLevel(this.context.alertLevel);
        }

        // React to focus
        if (updates.focusedTruckId !== undefined) {
            if (this.context.focusedTruckId) {
                this.tint.activateFocusTint();
                this.depth.enterFocus();
            } else {
                this.tint.deactivateFocusTint();
                this.depth.exitFocus();
            }
        }

        // React to system load — reduce noise opacity under pressure
        if (updates.systemLoad !== undefined) {
            const noiseOpacity = this.context.systemLoad > 0.8 ? 0.01 : 0.025;
            this.noise.setOpacity(noiseOpacity);
        }
    }

    /** Tick all perception modules (call from frame scheduler) */
    tick(dt: number): void {
        this.tint.tick(dt);
        this.noise.tick();
        this.typography.tick(dt);
        this.depth.tick(dt);
    }

    /** Get current context */
    getContext(): Readonly<PerceptionContext> {
        return this.context;
    }

    /** Destroy all modules */
    destroy(): void {
        this.tint.destroy();
        this.noise.destroy();
        this.typography.destroy();
        this.depth.destroy();
    }
}
