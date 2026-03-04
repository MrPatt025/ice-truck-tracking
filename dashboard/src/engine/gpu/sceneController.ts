/* ================================================================
 *  GPU Rendering Engine — Scene Controller
 *  ────────────────────────────────────────
 *  Demand-based frameloop: renders ONLY when dirty flags are set.
 *  Manages frustum culling, LOD switching, and render scheduling.
 *  Zero wasted GPU frames — camera idle = zero draws.
 *
 *  Frame budget: 6ms GPU allocation (of 16.6ms total)
 * ================================================================ */

import * as THREE from 'three';
import type {
    SceneDirtyFlags,
    CullResult,
    LODLevel,
    GPUSceneConfig,
    DeviceTier,
} from '../types';

// SSR-safe devicePixelRatio helper
const getDevicePixelRatio = () =>
    globalThis.window?.devicePixelRatio ?? 1;

// ─── Default GPU Config per Device Tier ────────────────────────
const TIER_CONFIGS: Record<DeviceTier, GPUSceneConfig> = {
    'high-end': {
        maxInstances: 5000,
        particleCount: 4000,
        ambientGeometryCount: 25,
        enableShadows: true,
        enablePostProcessing: true,
        enableParticles: true,
        antialias: true,
        pixelRatio: Math.min(getDevicePixelRatio(), 2),
        lodLevel: 'ultra',
    },
    'mid-range': {
        maxInstances: 2000,
        particleCount: 2000,
        ambientGeometryCount: 15,
        enableShadows: false,
        enablePostProcessing: true,
        enableParticles: true,
        antialias: true,
        pixelRatio: Math.min(getDevicePixelRatio(), 1.5),
        lodLevel: 'high',
    },
    'low-end': {
        maxInstances: 1000,
        particleCount: 500,
        ambientGeometryCount: 8,
        enableShadows: false,
        enablePostProcessing: false,
        enableParticles: true,
        antialias: false,
        pixelRatio: 1,
        lodLevel: 'medium',
    },
    'potato': {
        maxInstances: 500,
        particleCount: 0,
        ambientGeometryCount: 0,
        enableShadows: false,
        enablePostProcessing: false,
        enableParticles: false,
        antialias: false,
        pixelRatio: 1,
        lodLevel: 'low',
    },
};

// ─── LOD Distance Thresholds ───────────────────────────────────
const LOD_DISTANCES: Record<LODLevel, { near: number; mid: number; far: number }> = {
    ultra:   { near: 50,  mid: 150, far: 400 },
    high:    { near: 40,  mid: 120, far: 300 },
    medium:  { near: 30,  mid: 80,  far: 200 },
    low:     { near: 20,  mid: 50,  far: 100 },
    minimal: { near: 15,  mid: 30,  far: 60 },
};

/**
 * SceneController — GPU-first rendering with demand-based frameloop.
 *
 * Core principle: NEVER render unless something changed.
 * - Camera moved? → dirty.camera = true
 * - Data updated? → dirty.data = true
 * - Animation tick? → dirty.animation = true (only for active animations)
 * - Window resized? → dirty.resize = true
 * - Theme changed? → dirty.theme = true
 */
export class SceneController {
    // ─── Three.js core ─────────────────────────────────────────
    private renderer: THREE.WebGLRenderer | null = null;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private lastDeltaMs = 0;

    // ─── Dirty flag system ─────────────────────────────────────
    private dirty: SceneDirtyFlags = {
        camera: true,
        data: true,
        animation: false,
        resize: true,
        theme: true,
    };

    // ─── Frustum culling ───────────────────────────────────────
    private readonly frustum: THREE.Frustum;
    private readonly frustumMatrix: THREE.Matrix4;
    private lastCullResult: CullResult = { visibleCount: 0, totalCount: 0, culledCount: 0 };

    // ─── Configuration ─────────────────────────────────────────
    private readonly config: GPUSceneConfig;
    private lodLevel: LODLevel;
    private container: HTMLElement | null = null;

    // ─── Performance tracking ──────────────────────────────────
    private gpuFrameStart = 0;
    private gpuFrameTime = 0;
    private readonly GPU_BUDGET_MS = 6; // 6ms max for GPU in 16.6ms frame

    // ─── Animation tracking ────────────────────────────────────
    private activeAnimations = 0;
    private readonly animationCallbacks: Map<string, (dt: number) => void> = new Map();

    // ─── Resize observer ───────────────────────────────────────
    private resizeObserver: ResizeObserver | null = null;

    constructor(tier: DeviceTier = 'mid-range') {
        this.config = { ...TIER_CONFIGS[tier] };
        this.lodLevel = this.config.lodLevel;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(0, 30, 50);
        this.camera.lookAt(0, 0, 0);
        this.frustum = new THREE.Frustum();
        this.frustumMatrix = new THREE.Matrix4();
    }

    // ─── Lifecycle ─────────────────────────────────────────────

    /** Mount to a DOM element — creates WebGLRenderer */
    mount(container: HTMLElement): void {
        this.container = container;
        const { width, height } = container.getBoundingClientRect();

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: this.config.antialias,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
        });

        this.renderer.setPixelRatio(this.config.pixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        if (this.config.enableShadows) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        container.appendChild(this.renderer.domElement);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Watch for resize
        this.resizeObserver = new ResizeObserver(this.handleResize);
        this.resizeObserver.observe(container);

        this.lastDeltaMs = performance.now();
        this.markDirty('resize');
    }

    /** Unmount — full cleanup */
    destroy(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
            this.renderer = null;
        }

        // Dispose all scene objects
        this.scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((m) => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.scene.clear();
        this.animationCallbacks.clear();
        this.container = null;
    }

    // ─── Dirty Flag API ────────────────────────────────────────

    /** Mark a specific dirty flag */
    markDirty(flag: keyof SceneDirtyFlags): void {
        this.dirty[flag] = true;
    }

    /** Check if ANY dirty flag is set */
    isDirty(): boolean {
        return Object.values(this.dirty).some(Boolean);
    }

    /** Clear all dirty flags after render */
    private clearDirty(): void {
        this.dirty.camera = false;
        this.dirty.data = false;
        this.dirty.animation = false;
        this.dirty.resize = false;
        this.dirty.theme = false;
    }

    // ─── Demand-Based Render (called by frame scheduler) ───────

    /**
     * Tick — called every rAF frame but only renders when dirty.
     * Returns the GPU time spent (ms), or 0 if skipped.
     */
    tick(dt: number): number {
        // Run animation callbacks (they decide if scene is dirty)
        if (this.activeAnimations > 0) {
            this.animationCallbacks.forEach((cb) => cb(dt));
        }

        // Skip render if nothing changed
        if (!this.isDirty() || !this.renderer) return 0;

        this.gpuFrameStart = performance.now();

        // Update frustum for culling
        this.updateFrustum();

        // Render
        this.renderer.render(this.scene, this.camera);

        this.gpuFrameTime = performance.now() - this.gpuFrameStart;
        this.clearDirty();

        return this.gpuFrameTime;
    }

    // ─── Frustum Culling ───────────────────────────────────────

    /** Update frustum planes from camera */
    private updateFrustum(): void {
        this.frustumMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse,
        );
        this.frustum.setFromProjectionMatrix(this.frustumMatrix);
    }

    /**
     * Test if a world-space point is inside the camera frustum.
     * Used by instanced mesh updater to skip off-screen instances.
     */
    isInFrustum(position: THREE.Vector3): boolean {
        return this.frustum.containsPoint(position);
    }

    /**
     * Cull a set of objects against frustum. Returns visibility mask.
     * For InstancedMesh, use cullInstances() instead.
     */
    cullObjects(objects: THREE.Object3D[]): boolean[] {
        let visible = 0;
        const mask = objects.map((obj) => {
            obj.updateWorldMatrix(true, false);
            const inFrustum = this.frustum.intersectsObject(obj);
            obj.visible = inFrustum;
            if (inFrustum) visible++;
            return inFrustum;
        });

        this.lastCullResult = {
            visibleCount: visible,
            totalCount: objects.length,
            culledCount: objects.length - visible,
        };
        return mask;
    }

    /**
     * For InstancedMesh: determine which instances are visible.
     * Returns a typed array mask (1 = visible, 0 = culled).
     */
    cullInstances(
        positions: Float32Array,
        count: number,
    ): Uint8Array {
        const mask = new Uint8Array(count);
        const tmpVec = new THREE.Vector3();
        let visible = 0;

        for (let i = 0; i < count; i++) {
            tmpVec.set(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2],
            );
            if (this.frustum.containsPoint(tmpVec)) {
                mask[i] = 1;
                visible++;
            }
        }

        this.lastCullResult = {
            visibleCount: visible,
            totalCount: count,
            culledCount: count - visible,
        };
        return mask;
    }

    // ─── LOD Management ────────────────────────────────────────

    /** Get LOD distances for current quality level */
    getLODDistances(): { near: number; mid: number; far: number } {
        return LOD_DISTANCES[this.lodLevel];
    }

    /**
     * Compute LOD level for a distance from camera.
     * Returns 0 (highest detail) to 3 (lowest/skip).
     */
    computeLOD(distanceFromCamera: number): number {
        const d = this.getLODDistances();
        if (distanceFromCamera < d.near) return 0;
        if (distanceFromCamera < d.mid) return 1;
        if (distanceFromCamera < d.far) return 2;
        return 3; // too far — skip entirely
    }

    /** Update LOD level (called by adaptive performance layer) */
    setLODLevel(level: LODLevel): void {
        if (this.lodLevel !== level) {
            this.lodLevel = level;
            this.markDirty('theme'); // forces re-render with new LOD
        }
    }

    // ─── Animation Registry ────────────────────────────────────

    /** Register a named animation callback */
    registerAnimation(name: string, callback: (dt: number) => void): void {
        this.animationCallbacks.set(name, callback);
        this.activeAnimations = this.animationCallbacks.size;
        if (this.activeAnimations > 0) {
            this.markDirty('animation');
        }
    }

    /** Unregister an animation */
    unregisterAnimation(name: string): void {
        this.animationCallbacks.delete(name);
        this.activeAnimations = this.animationCallbacks.size;
    }

    // ─── Config / Adaptation ───────────────────────────────────

    /** Apply a new configuration (from adaptive scaling) */
    applyConfig(updates: Partial<GPUSceneConfig>): void {
        Object.assign(this.config, updates);

        if (updates.pixelRatio !== undefined && this.renderer) {
            this.renderer.setPixelRatio(updates.pixelRatio);
            this.markDirty('resize');
        }

        if (updates.enableShadows !== undefined && this.renderer) {
            this.renderer.shadowMap.enabled = updates.enableShadows;
            this.renderer.shadowMap.needsUpdate = true;
            this.markDirty('theme');
        }

        if (updates.lodLevel !== undefined) {
            this.setLODLevel(updates.lodLevel);
        }
    }

    /** Get current GPU frame time */
    getGPUFrameTime(): number {
        return this.gpuFrameTime;
    }

    /** Check if GPU budget exceeded */
    isOverBudget(): boolean {
        return this.gpuFrameTime > this.GPU_BUDGET_MS;
    }

    /** Get cull statistics from last frame */
    getCullResult(): CullResult {
        return { ...this.lastCullResult };
    }

    /** Get current config */
    getConfig(): Readonly<GPUSceneConfig> {
        return this.config;
    }

    // ─── Accessors ─────────────────────────────────────────────

    getScene(): THREE.Scene { return this.scene; }
    getCamera(): THREE.PerspectiveCamera { return this.camera; }
    getRenderer(): THREE.WebGLRenderer | null { return this.renderer; }

    // ─── Private: Resize ───────────────────────────────────────

    private readonly handleResize = (entries: ResizeObserverEntry[]): void => {
        const entry = entries[0];
        if (!entry || !this.renderer) return;
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.markDirty('resize');
    };
}
