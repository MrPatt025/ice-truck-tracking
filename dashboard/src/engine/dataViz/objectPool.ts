/* ================================================================
 *  Data Visualization Engine — Object Pool + Heatmap Renderer
 *  ────────────────────────────────────────────────────────────
 *  1. ObjectPool — Generic recycling pool (zero GC pressure)
 *  2. HeatmapRenderer — Canvas-based density heatmap
 *  3. RouteRenderer — Marching line effect for truck routes
 *
 *  Design: All renderers are imperative (no React) and driven
 *  by the frame scheduler. Updates are delta-only.
 * ================================================================ */

import type { TruckTelemetry, HeatmapConfig, Theme } from '../types';

// ═════════════════════════════════════════════════════════════════
//  1. OBJECT POOL — Generic recycling pool
// ═════════════════════════════════════════════════════════════════

/**
 * ObjectPool<T> — reuses objects instead of GC-ing them.
 *
 * Pattern for high-throughput scenarios (10k-50k entities):
 *   const pool = new ObjectPool(() => new Float32Array(3), 1000);
 *   const obj = pool.acquire();
 *   // ... use obj ...
 *   pool.release(obj);
 */
export class ObjectPool<T> {
    private pool: T[] = [];
    private readonly factory: () => T;
    private readonly reset: ((obj: T) => void) | null;
    private _totalCreated = 0;
    private _totalRecycled = 0;

    constructor(
        factory: () => T,
        initialSize = 0,
        reset?: (obj: T) => void,
    ) {
        this.factory = factory;
        this.reset = reset ?? null;

        // Pre-allocate
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
            this._totalCreated++;
        }
    }

    /** Acquire an object (from pool or new) */
    acquire(): T {
        const pooled = this.pool.pop();
        if (pooled !== undefined) {
            this._totalRecycled++;
            return pooled;
        }
        this._totalCreated++;
        return this.factory();
    }

    /** Release an object back to the pool */
    release(obj: T): void {
        this.reset?.(obj);
        this.pool.push(obj);
    }

    /** Release multiple objects */
    releaseAll(objects: T[]): void {
        for (const obj of objects) {
            this.release(obj);
        }
    }

    /** Get pool stats */
    get available(): number { return this.pool.length; }
    get totalCreated(): number { return this._totalCreated; }
    get totalRecycled(): number { return this._totalRecycled; }

    /** Shrink pool to target size (free excess memory) */
    trim(maxAvailable: number): void {
        while (this.pool.length > maxAvailable) {
            this.pool.pop();
        }
    }

    /** Clear pool entirely */
    clear(): void {
        this.pool = [];
    }
}

// ═════════════════════════════════════════════════════════════════
//  Pre-built pools for common allocations
// ═════════════════════════════════════════════════════════════════

/** Pool for GeoJSON Feature objects */
export const featurePool = new ObjectPool<GeoJSON.Feature>(
    () => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [0, 0] },
        properties: {},
    }),
    500,
    (f) => {
        (f.geometry as GeoJSON.Point).coordinates[0] = 0;
        (f.geometry as GeoJSON.Point).coordinates[1] = 0;
        f.properties = {};
    },
);

/** Pool for Float32Array(3) — position vectors */
export const vec3Pool = new ObjectPool<Float32Array>(
    () => new Float32Array(3),
    200,
    (v) => { v[0] = 0; v[1] = 0; v[2] = 0; },
);

// ═════════════════════════════════════════════════════════════════
//  2. HEATMAP RENDERER — Density visualization
// ═════════════════════════════════════════════════════════════════

const DEFAULT_HEATMAP_CONFIG: HeatmapConfig = {
    radius: 25,
    intensity: 0.8,
    gradient: {
        0: 'rgba(0, 0, 255, 0)',
        0.2: 'rgba(0, 0, 255, 0.3)',
        0.4: 'rgba(0, 255, 255, 0.5)',
        0.6: 'rgba(0, 255, 0, 0.6)',
        0.8: 'rgba(255, 255, 0, 0.8)',
        1: 'rgba(255, 0, 0, 1.0)',
    },
    opacity: 0.7,
    maxZoom: 18,
};

/**
 * HeatmapRenderer — Canvas 2D density heatmap.
 * Renders truck positions as a heat overlay.
 *
 * Uses pre-computed gradient + radial falloff stamp.
 */
export class HeatmapRenderer {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly config: HeatmapConfig;
    private readonly stamp: HTMLCanvasElement;
    private readonly gradientData: Uint8ClampedArray;
    private dirty = true;

    constructor(config: Partial<HeatmapConfig> = {}) {
        this.config = { ...DEFAULT_HEATMAP_CONFIG, ...config };
        this.canvas = document.createElement('canvas');
        const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D context not supported');
        this.ctx = ctx;

        // Pre-compute radial stamp
        this.stamp = this.createStamp();

        // Pre-compute color gradient LUT
        this.gradientData = this.createGradientLUT();
    }

    /** Mount onto a container */
    mount(container: HTMLElement): void {
        this.canvas.style.position = 'absolute';
        this.canvas.style.inset = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.opacity = String(this.config.opacity);
        this.canvas.style.mixBlendMode = 'screen';
        this.resize(container.clientWidth, container.clientHeight);
        container.appendChild(this.canvas);
    }

    /** Resize canvas */
    resize(width: number, height: number): void {
        const dpr = Math.min(window.devicePixelRatio, 2);
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.scale(dpr, dpr);
        this.dirty = true;
    }

    /**
     * Render heatmap from projected screen positions.
     * @param points Array of [x, y, weight] screen coordinates
     */
    render(points: Array<[number, number, number]>): void {
        if (!this.dirty && points.length === 0) return;

        const { width, height } = this.canvas;
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw alpha stamps
        ctx.globalCompositeOperation = 'lighter';
        for (const [x, y, w] of points) {
            ctx.globalAlpha = Math.min(1, w * this.config.intensity);
            ctx.drawImage(
                this.stamp,
                x - this.config.radius,
                y - this.config.radius,
            );
        }

        // Colorize — read alpha channel, map to gradient
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        for (let i = 0; i < pixels.length; i += 4) {
            const alpha = pixels[i + 3];
            if (alpha > 0) {
                const idx = alpha * 4;
                pixels[i] = this.gradientData[idx];
                pixels[i + 1] = this.gradientData[idx + 1];
                pixels[i + 2] = this.gradientData[idx + 2];
                pixels[i + 3] = this.gradientData[idx + 3];
            }
        }

        ctx.putImageData(imageData, 0, 0);
        this.dirty = false;
    }

    /** Mark dirty (forces re-render) */
    markDirty(): void { this.dirty = true; }

    /** Destroy */
    destroy(): void {
        this.canvas.remove();
    }

    // ─── Pre-computation ───────────────────────────────────────

    private createStamp(): HTMLCanvasElement {
        const r = this.config.radius;
        const d = r * 2;
        const stamp = document.createElement('canvas');
        stamp.width = d;
        stamp.height = d;
        const ctx = stamp.getContext('2d');
        if (!ctx) return stamp;

        const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, d, d);

        return stamp;
    }

    private createGradientLUT(): Uint8ClampedArray {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new Uint8ClampedArray(1024);

        const gradient = ctx.createLinearGradient(0, 0, 256, 0);
        for (const [stop, color] of Object.entries(this.config.gradient)) {
            gradient.addColorStop(Number(stop), color);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 1);

        return ctx.getImageData(0, 0, 256, 1).data;
    }
}

// ═════════════════════════════════════════════════════════════════
//  3. ROUTE RENDERER — Marching line effect
//     Animated dashed line showing truck routes.
// ═════════════════════════════════════════════════════════════════

interface RouteSegment {
    id: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
}

const THEME_ROUTE_COLORS: Record<Theme, string> = {
    dark: '#4f8ef7',
    neon: '#00ffcc',
    ocean: '#3b82f6',
    forest: '#22c55e',
};

/**
 * RouteRenderer — Canvas 2D animated route lines.
 * Shows truck paths with a marching dashed-line effect.
 */
export class RouteRenderer {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly routes: Map<string, RouteSegment> = new Map();
    private dashOffset = 0;
    private theme: Theme = 'dark';

    constructor() {
        this.canvas = document.createElement('canvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not supported');
        this.ctx = ctx;
    }

    mount(container: HTMLElement): void {
        this.canvas.style.position = 'absolute';
        this.canvas.style.inset = '0';
        this.canvas.style.pointerEvents = 'none';
        this.resize(container.clientWidth, container.clientHeight);
        container.appendChild(this.canvas);
    }

    resize(width: number, height: number): void {
        const dpr = Math.min(window.devicePixelRatio, 2);
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.scale(dpr, dpr);
    }

    /** Set route data */
    setRoute(id: string, points: Array<{ x: number; y: number }>, width = 2): void {
        this.routes.set(id, {
            id,
            points,
            color: THEME_ROUTE_COLORS[this.theme],
            width,
        });
    }

    /** Remove a route */
    removeRoute(id: string): void {
        this.routes.delete(id);
    }

    /** Set theme */
    setTheme(theme: Theme): void {
        this.theme = theme;
        this.routes.forEach((r) => {
            r.color = THEME_ROUTE_COLORS[theme];
        });
    }

    /** Render frame — call from frame scheduler */
    render(dt: number): void {
        const ctx = this.ctx;
        const { width, height } = this.canvas;
        ctx.clearRect(0, 0, width, height);

        // Advance marching animation
        this.dashOffset += dt * 30; // px/sec

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        this.routes.forEach((route) => {
            if (route.points.length < 2) return;

            ctx.strokeStyle = route.color;
            ctx.lineWidth = route.width;
            ctx.setLineDash([12, 8]);
            ctx.lineDashOffset = -this.dashOffset;

            ctx.beginPath();
            ctx.moveTo(route.points[0].x, route.points[0].y);
            for (let i = 1; i < route.points.length; i++) {
                ctx.lineTo(route.points[i].x, route.points[i].y);
            }
            ctx.stroke();

            // Glow effect
            ctx.strokeStyle = route.color;
            ctx.lineWidth = route.width + 3;
            ctx.globalAlpha = 0.2;
            ctx.setLineDash([]);
            ctx.stroke();
            ctx.globalAlpha = 1;
        });
    }

    destroy(): void {
        this.canvas.remove();
        this.routes.clear();
    }
}

// ═════════════════════════════════════════════════════════════════
//  HELPER — Convert truck telemetry array to screen positions
//  (requires a projection function from your map layer)
// ═════════════════════════════════════════════════════════════════

export type ProjectFn = (lat: number, lng: number) => { x: number; y: number } | null;

/** Project truck positions to screen coordinates for the heatmap */
export function projectTrucksToScreen(
    trucks: IterableIterator<TruckTelemetry>,
    project: ProjectFn,
): Array<[number, number, number]> {
    const result: Array<[number, number, number]> = [];
    for (const t of trucks) {
        const p = project(t.lat, t.lng);
        if (p) {
            // Weight by speed (faster = hotter)
            const weight = Math.min(1, t.speed / 100);
            result.push([p.x, p.y, weight]);
        }
    }
    return result;
}
