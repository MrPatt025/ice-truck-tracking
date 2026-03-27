/* ================================================================
 *  Shared WebGL Canvas Pool
 *  ──────────────────────────────
 *  Browsers limit WebGL contexts (~8–16 live contexts).
 *  This singleton manages a pool of shared canvases so multiple
 *  engine layers (Three.js, map, chart, particles) can share
 *  contexts or recycle them instead of creating new ones.
 *
 *  Key Features:
 *   • Canvas recycling with reference counting
 *   • Automatic context-loss recovery
 *   • Pool size bounded to MAX_CONTEXTS
 *   • Transparent acquisition / release API
 * ================================================================ */

/** Configuration for acquired WebGL canvases */
export interface CanvasConfig {
    width: number;
    height: number;
    alpha?: boolean;
    antialias?: boolean;
    powerPreference?: WebGLPowerPreference;
    desynchronized?: boolean;
}

/** A managed entry in the canvas pool */
interface PoolEntry {
    id: string;
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    version: 1 | 2;
    refCount: number;
    lastUsed: number;
    lostHandler: () => void;
    restoredHandler: () => void;
}

/**
 * SharedCanvasPool — singleton WebGL canvas pool.
 *
 * Usage:
 *   const pool = SharedCanvasPool.getInstance();
 *   const entry = pool.acquire('three-main', { width: 1920, height: 1080 });
 *   // ... use entry.canvas / entry.gl ...
 *   pool.release('three-main');
 */
export class SharedCanvasPool {
    private static instance: SharedCanvasPool | null = null;

    /** Max simultaneous WebGL contexts (conservative, well under browser limit) */
    private readonly MAX_CONTEXTS = 8;

    /** Active pool entries by id */
    private readonly pool = new Map<string, PoolEntry>();

    /** Listeners for context-loss/restore events */
    private readonly onContextLost = new Map<string, Set<() => void>>();
    private readonly onContextRestored = new Map<string, Set<() => void>>();

    private constructor() { }

    static getInstance(): SharedCanvasPool {
      SharedCanvasPool.instance ??= new SharedCanvasPool();
        return SharedCanvasPool.instance;
    }

    /** For tests — reset the singleton. */
    static resetInstance(): void {
        if (SharedCanvasPool.instance) {
            SharedCanvasPool.instance.destroyAll();
            SharedCanvasPool.instance = null;
        }
    }

    // ─── Public API ────────────────────────────────────────────

    /**
     * Acquire (or reuse) a WebGL canvas by logical id.
     * If the id already exists, increments refCount and returns it.
     * Otherwise creates a new canvas+context.
     */
    acquire(
        id: string,
        config: CanvasConfig,
        preferWebGL2 = true,
    ): { canvas: HTMLCanvasElement; gl: WebGLRenderingContext | WebGL2RenderingContext; version: 1 | 2 } {
        // Reuse existing
        const existing = this.pool.get(id);
        if (existing) {
            existing.refCount++;
            existing.lastUsed = Date.now();
            this.resizeIfNeeded(existing, config.width, config.height);
            return { canvas: existing.canvas, gl: existing.gl, version: existing.version };
        }

        // Evict LRU if at capacity
        if (this.pool.size >= this.MAX_CONTEXTS) {
            this.evictLRU();
        }

        // Create new canvas
        const canvas = document.createElement('canvas');
        canvas.width = config.width;
        canvas.height = config.height;
        canvas.style.display = 'block';

        const attrs: WebGLContextAttributes = {
            alpha: config.alpha ?? true,
            antialias: config.antialias ?? false,
            powerPreference: config.powerPreference ?? 'high-performance',
            desynchronized: config.desynchronized ?? false,
            preserveDrawingBuffer: false,
            stencil: false,
            depth: true,
            failIfMajorPerformanceCaveat: false,
        };

        let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
        let version: 1 | 2 = 1;

        if (preferWebGL2) {
            gl = canvas.getContext('webgl2', attrs);
            if (gl) version = 2;
        }
        if (!gl) {
            gl = canvas.getContext('webgl', attrs);
            version = 1;
        }
        if (!gl) {
            throw new Error(`[SharedCanvasPool] Failed to create WebGL context for "${id}"`);
        }

        // Context-loss handling
        const lostHandler = () => this.handleContextLost(id);
        const restoredHandler = () => this.handleContextRestored(id);
        canvas.addEventListener('webglcontextlost', lostHandler);
        canvas.addEventListener('webglcontextrestored', restoredHandler);

        const entry: PoolEntry = {
            id,
            canvas,
            gl,
            version,
            refCount: 1,
            lastUsed: Date.now(),
            lostHandler,
            restoredHandler,
        };
        this.pool.set(id, entry);

        return { canvas, gl, version };
    }

    /**
     * Release a reference to a canvas. When refCount hits 0 the canvas
     * stays in the pool (warm) but can be evicted by LRU.
     */
    release(id: string): void {
        const entry = this.pool.get(id);
        if (!entry) return;
        entry.refCount = Math.max(0, entry.refCount - 1);
    }

    /** Force-destroy a specific canvas and free GPU resources */
    destroy(id: string): void {
        const entry = this.pool.get(id);
        if (!entry) return;
        this.disposeEntry(entry);
        this.pool.delete(id);
        this.onContextLost.delete(id);
        this.onContextRestored.delete(id);
    }

    /** Destroy all contexts — call on shutdown */
    destroyAll(): void {
        for (const entry of this.pool.values()) {
            this.disposeEntry(entry);
        }
        this.pool.clear();
        this.onContextLost.clear();
        this.onContextRestored.clear();
    }

    /** Subscribe to context-loss for a canvas */
    onLost(id: string, cb: () => void): () => void {
        let set = this.onContextLost.get(id);
        if (!set) {
            set = new Set();
            this.onContextLost.set(id, set);
        }
        set.add(cb);
        const captured = set;
        return () => { captured.delete(cb); };
    }

    /** Subscribe to context-restore for a canvas */
    onRestored(id: string, cb: () => void): () => void {
        let set = this.onContextRestored.get(id);
        if (!set) {
            set = new Set();
            this.onContextRestored.set(id, set);
        }
        set.add(cb);
        const captured = set;
        return () => { captured.delete(cb); };
    }

    /** Get pool diagnostics */
    stats(): {
        total: number;
        active: number;
        idle: number;
        maxContexts: number;
    } {
        let active = 0;
        let idle = 0;
        for (const e of this.pool.values()) {
            if (e.refCount > 0) active++;
            else idle++;
        }
        return { total: this.pool.size, active, idle, maxContexts: this.MAX_CONTEXTS };
    }

    /** Check if a canvas id is currently in the pool */
    has(id: string): boolean {
        return this.pool.has(id);
    }

    // ─── Internals ─────────────────────────────────────────────

    private resizeIfNeeded(entry: PoolEntry, w: number, h: number): void {
        if (entry.canvas.width !== w || entry.canvas.height !== h) {
            entry.canvas.width = w;
            entry.canvas.height = h;
            entry.gl.viewport(0, 0, w, h);
        }
    }

    /** Evict the least-recently-used entry with refCount === 0 */
    private evictLRU(): void {
        let oldest: PoolEntry | null = null;
        for (const entry of this.pool.values()) {
            if (entry.refCount > 0) continue;
            if (!oldest || entry.lastUsed < oldest.lastUsed) {
                oldest = entry;
            }
        }
        if (oldest) {
            this.destroy(oldest.id);
        }
    }

    private disposeEntry(entry: PoolEntry): void {
        entry.canvas.removeEventListener('webglcontextlost', entry.lostHandler);
        entry.canvas.removeEventListener('webglcontextrestored', entry.restoredHandler);

        // Lose context explicitly via extension
        const ext = entry.gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();

        entry.canvas.remove();
    }

    private handleContextLost(id: string): void {
        const listeners = this.onContextLost.get(id);
        if (listeners) {
            for (const cb of listeners) cb();
        }
    }

    private handleContextRestored(id: string): void {
        const listeners = this.onContextRestored.get(id);
        if (listeners) {
            for (const cb of listeners) cb();
        }
    }
}
