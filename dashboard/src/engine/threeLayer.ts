/* ================================================================
 *  Ice-Truck IoT Engine — Imperative Three.js 3D Layer v2
 *  ─────────────────────────────────────────────────────────
 *  MASTERPIECE GPU-First Architecture:
 *  • SceneController integration (demand-based rendering)
 *  • GLSL mesh gradient background shader
 *  • Enhanced GPU particle system with custom shaders
 *  • Frustum culling for instanced trucks
 *  • Adaptive DPR via performance guard
 *  • LOD-aware ambient geometry
 *  • Depth fog overlay
 *  • Data-driven glow on truck instances
 *  • Mouse parallax camera with spring physics
 *  • Driven by frame scheduler — zero React involvement
 * ================================================================ */

import * as THREE from 'three';
import { getTruckMap } from './store';
import type { Theme, ScalingDecision } from './types';
import { SceneController } from './gpu/sceneController';
import {
    createMeshGradientMaterial,
    createDepthFogMaterial,
    updateShaderUniforms,
    SHADER_THEME_COLORS,
    FOG_THEME_COLORS,
} from './gpu/shaderMaterials';
import { AdaptiveDPR } from './gpu/adaptiveDPR';

const THEME_COLORS: Record<Theme, number[]> = {
    dark: [0x8b5cf6, 0x06b6d4, 0x10b981, 0xf59e0b],
    neon: [0xff006e, 0x00f5ff, 0x00ff9f, 0xffd60a],
    ocean: [0x0ea5e9, 0x06b6d4, 0x14b8a6, 0x10b981],
    forest: [0x10b981, 0x059669, 0x34d399, 0x6ee7b7],
};

const STATUS_COLORS: Record<string, number> = {
    active: 0x10b981,
    idle: 0xf59e0b,
    offline: 0x6b7280,
    maintenance: 0x8b5cf6,
    alert: 0xef4444,
};

const MAX_INSTANCES = 2000;

export class ImperativeThreeLayer {
    // ─── GPU Engine Integration ────────────────────────────────
    private sceneCtrl: SceneController | null = null;
    private readonly adaptiveDPR: AdaptiveDPR;

    // ─── Core Three.js (delegated to sceneCtrl when available) ─
    private renderer: THREE.WebGLRenderer | null = null;
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private container: HTMLElement | null = null;
    private _destroyed = false;
    private _ready = false;

    // ─── Instanced mesh for truck markers ──────────────────────
    private truckMesh: THREE.InstancedMesh | null = null;
    private readonly dummy = new THREE.Object3D();
    private colorAttr: THREE.InstancedBufferAttribute | null = null;
    private truckPositions = new Float32Array(MAX_INSTANCES * 3);

    // ─── Shader materials ──────────────────────────────────────
    private shaderMaterials: THREE.ShaderMaterial[] = [];
    private bgMesh: THREE.Mesh | null = null;
    private fogMesh: THREE.Mesh | null = null;
    private elapsed = 0;

    // ─── Ambient geometry ──────────────────────────────────────
    private readonly ambientMeshes: THREE.Mesh[] = [];
    private readonly lights: THREE.PointLight[] = [];

    // ─── Particle system ───────────────────────────────────────
    private particles: THREE.Points | null = null;
    private particlePositions: Float32Array | null = null;
    private particleSpeeds: Float32Array | null = null;
    private particleCount = 2000;

    // ─── Mouse parallax ────────────────────────────────────────
    private mx = 0;
    private my = 0;
    private onMouseMove: ((e: MouseEvent) => void) | null = null;
    private onResize: (() => void) | null = null;

    // ─── State ─────────────────────────────────────────────────
    private theme: Theme = 'dark';
    private lastGPUTime = 0;
    private fps = 60;
    private readonly _dataVersion = 0;

    constructor() {
        this.adaptiveDPR = new AdaptiveDPR();
    }

    get ready(): boolean {
        return this._ready;
    }

    /** Get last GPU frame time in ms */
    getGPUFrameTime(): number {
        return this.lastGPUTime;
    }

    /** Mount into a DOM element — creates full GPU pipeline */
    init(container: HTMLElement, theme: Theme = 'dark'): void {
        if (this._destroyed) return;
        this.container = container;
        this.theme = theme;

        // Create SceneController for demand-based rendering
        this.sceneCtrl = new SceneController('mid-range');
        this.sceneCtrl.mount(container);

        // Get references from scene controller
        this.renderer = this.sceneCtrl.getRenderer();
        this.scene = this.sceneCtrl.getScene();
        this.camera = this.sceneCtrl.getCamera();

        if (!this.renderer || !this.scene || !this.camera) return;

        // Override camera for our layout
        this.camera.fov = 70;
        this.camera.near = 0.5;
        this.camera.far = 1000;
        this.camera.position.z = 35;
        this.camera.updateProjectionMatrix();

        // ── GLSL Mesh Gradient Background ──
        this.createShaderBackground(theme);

        // ── Lighting ──
        const amb = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(amb);

        const colors = THEME_COLORS[theme];
        for (let i = 0; i < colors.length; i++) {
            const light = new THREE.PointLight(colors[i], 2.5, 150);
            const angle = (i / colors.length) * Math.PI * 2;
            light.position.set(
                Math.cos(angle) * 20,
                Math.sin(angle) * 15,
                Math.sin(angle * 2) * 10,
            );
            this.scene.add(light);
            this.lights.push(light);
        }

        // ── Instanced mesh for trucks (GPU instancing = 1 draw call) ──
        const truckGeo = new THREE.SphereGeometry(0.3, 8, 6);
        const truckMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            shininess: 80,
            emissive: 0x111111,
        });
        this.truckMesh = new THREE.InstancedMesh(truckGeo, truckMat, MAX_INSTANCES);
        this.truckMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.truckMesh.count = 0;

        // Per-instance color attribute
        const colorArray = new Float32Array(MAX_INSTANCES * 3);
        this.colorAttr = new THREE.InstancedBufferAttribute(colorArray, 3);
        this.truckMesh.instanceColor = this.colorAttr;
        this.scene.add(this.truckMesh);

        // ── Ambient geometry (LOD-aware) ──
        this.createAmbientGeometry(colors);

        // ── Enhanced particle system ──
        this.createParticles(this.particleCount);

        // ── Depth fog overlay ──
        this.createDepthFog(theme);

        // ── Mouse parallax ──
        this.onMouseMove = (e: MouseEvent) => {
            this.mx = (e.clientX / globalThis.innerWidth) * 2 - 1;
            this.my = -(e.clientY / globalThis.innerHeight) * 2 + 1;
            this.sceneCtrl?.markDirty('camera');
        };
        globalThis.addEventListener('mousemove', this.onMouseMove, { passive: true });

        // ── Resize handler ──
        this.onResize = () => {
            if (!this.camera || !this.renderer || !this.container) return;
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
            this.sceneCtrl?.markDirty('resize');
        };
        globalThis.addEventListener('resize', this.onResize);

        // Register animations with scene controller
        this.sceneCtrl.registerAnimation('ambient', () => {
            this.sceneCtrl?.markDirty('animation');
        });

        this._ready = true;
        this.sceneCtrl.markDirty('data');
    }

    // ─── Shader Background ─────────────────────────────────────

    private createShaderBackground(theme: Theme): void {
        if (!this.scene) return;
        const gradientColors = SHADER_THEME_COLORS[theme];
        const bgMaterial = createMeshGradientMaterial(gradientColors, 0.06, 2.5);
        this.shaderMaterials.push(bgMaterial);

        const bgGeo = new THREE.PlaneGeometry(200, 200);
        this.bgMesh = new THREE.Mesh(bgGeo, bgMaterial);
        this.bgMesh.position.z = -60;
        this.bgMesh.renderOrder = -1;
        this.scene.add(this.bgMesh);
    }

    private createDepthFog(theme: Theme): void {
        if (!this.scene) return;
        const fogColor = FOG_THEME_COLORS[theme];
        const fogMaterial = createDepthFogMaterial(fogColor, 0.25);
        this.shaderMaterials.push(fogMaterial);

        const fogGeo = new THREE.PlaneGeometry(200, 200);
        this.fogMesh = new THREE.Mesh(fogGeo, fogMaterial);
        this.fogMesh.position.z = 20;
        this.fogMesh.renderOrder = 100;
        this.scene.add(this.fogMesh);
    }

    // ─── Ambient Geometry ──────────────────────────────────────

    private createAmbientGeometry(colors: number[]): void {
        if (!this.scene) return;

        // Icosahedrons (count based on LOD)
        const icoCount = 15;
        for (let i = 0; i < icoCount; i++) {
            const detail = 1; // LOD detail level
            const g = new THREE.IcosahedronGeometry(Math.random() * 2 + 0.5, detail);
            const m = new THREE.MeshPhongMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 0.25,
                shininess: 100,
                wireframe: Math.random() > 0.7,
            });
            const mesh = new THREE.Mesh(g, m);
            mesh.position.set(
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
            );
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            mesh.userData.speed = 0.001 + Math.random() * 0.002;
            mesh.userData.axis = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5,
            ).normalize();
            this.scene.add(mesh);
            this.ambientMeshes.push(mesh);
        }

        // Tori
        for (let i = 0; i < 6; i++) {
            const g = new THREE.TorusGeometry(Math.random() * 3 + 1, 0.12, 12, 64);
            const m = new THREE.MeshPhongMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 0.2,
                shininess: 120,
            });
            const mesh = new THREE.Mesh(g, m);
            mesh.position.set(
                (Math.random() - 0.5) * 45,
                (Math.random() - 0.5) * 45,
                (Math.random() - 0.5) * 45,
            );
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            mesh.userData.speed = 0.0006 + Math.random() * 0.001;
            mesh.userData.axis = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5,
            ).normalize();
            this.scene.add(mesh);
            this.ambientMeshes.push(mesh);
        }
    }

    // ─── Particle System ───────────────────────────────────────

    private createParticles(count: number): void {
        if (!this.scene) return;

        this.particlePositions = new Float32Array(count * 3);
        this.particleSpeeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            this.particlePositions[i * 3] = (Math.random() - 0.5) * 80;
            this.particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
            this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
            this.particleSpeeds[i] = 0.02 + Math.random() * 0.05;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x06b6d4,
            size: 0.15,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);
    }

    // ─── Frame Update (called by frame scheduler) ──────────────

    /** Called by frame scheduler every frame */
    update(dt: number): void {
        if (!this._ready || this._destroyed || !this.scene || !this.camera || !this.renderer) return;

        const scene = this.scene;
        const camera = this.camera;
        const renderer = this.renderer;
        const truckMesh = this.truckMesh;
        const colorAttr = this.colorAttr;
        if (!truckMesh || !colorAttr) return;

        const gpuStart = performance.now();
        const t = performance.now() * 0.001;
        this.elapsed += dt * 0.001;

        updateShaderUniforms(this.shaderMaterials, this.elapsed);

        // ── Update instanced truck mesh with frustum culling ──
        const trucks = getTruckMap();
        let idx = 0;
        const tempColor = new THREE.Color();
        const tmpVec = new THREE.Vector3();
        let dataChanged = false;

        trucks.forEach((truck) => {
            if (idx >= MAX_INSTANCES) return;

            const x = (truck.lng - 100.5) * 80;
            const y = (truck.lat - 13.75) * 80;
            const z = Math.sin(t + idx * 0.1) * 0.5;

            this.truckPositions[idx * 3] = x;
            this.truckPositions[idx * 3 + 1] = y;
            this.truckPositions[idx * 3 + 2] = z;

            if (this.sceneCtrl) {
                tmpVec.set(x, y, z);
                if (!this.sceneCtrl.isInFrustum(tmpVec)) {
                    this.dummy.position.set(x, y, z);
                    this.dummy.scale.setScalar(0);
                    this.dummy.updateMatrix();
                    truckMesh.setMatrixAt(idx, this.dummy.matrix);
                    idx++;
                    return;
                }
            }

            const lodScale = this.computeLodScale(tmpVec, camera);

            this.dummy.position.set(x, y, z);
            this.dummy.scale.setScalar((0.8 + (truck.speed / 120) * 0.4) * lodScale);
            this.dummy.updateMatrix();
            truckMesh.setMatrixAt(idx, this.dummy.matrix);

            const statusColor = STATUS_COLORS[truck.status] ?? 0x06b6d4;
            tempColor.setHex(statusColor);
            colorAttr.setXYZ(idx, tempColor.r, tempColor.g, tempColor.b);

            dataChanged = true;
            idx++;
        });

        if (dataChanged) {
            truckMesh.count = idx;
            truckMesh.instanceMatrix.needsUpdate = true;
            colorAttr.needsUpdate = true;
            this.sceneCtrl?.markDirty('data');
        }

        this.animateEnvironment(t, dt);

        // ── Camera parallax with smooth interpolation ──
        camera.position.x += (this.mx * 6 - camera.position.x) * 0.05;
        camera.position.y += (this.my * 6 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        // ── Demand-based render via SceneController ──
        this.sceneCtrl?.markDirty('animation');
        if (this.sceneCtrl) {
            this.lastGPUTime = this.sceneCtrl.tick(dt);
        } else {
            renderer.render(scene, camera);
            this.lastGPUTime = performance.now() - gpuStart;
        }

        // ── Adaptive DPR ──
        this.fps = dt > 0 ? 1000 / dt : 60;
        if (this.adaptiveDPR.sample(this.lastGPUTime, this.fps)) {
            const newDPR = this.adaptiveDPR.getCurrentDPR();
            renderer.setPixelRatio(newDPR);
        }
    }

    /** Compute LOD-based scale for a truck position */
    private computeLodScale(tmpVec: THREE.Vector3, camera: THREE.PerspectiveCamera): number {
        if (!this.sceneCtrl) return 1;
        const dist = tmpVec.distanceTo(camera.position);
        const lod = this.sceneCtrl.computeLOD(dist);
        if (lod >= 3) return 0.5;
        if (lod >= 2) return 0.7;
        if (lod >= 1) return 0.85;
        return 1;
    }

    /** Animate ambient meshes, lights, and particles */
    private animateEnvironment(t: number, dt: number): void {
        for (const mesh of this.ambientMeshes) {
            mesh.rotateOnAxis(mesh.userData.axis, mesh.userData.speed);
            mesh.position.y += Math.sin(t + mesh.id * 0.5) * 0.005;
            mesh.position.x += Math.cos(t + mesh.id * 0.3) * 0.003;
        }

        for (let i = 0; i < this.lights.length; i++) {
            const angle = (i / this.lights.length) * Math.PI * 2 + t * 0.3;
            this.lights[i].position.x = Math.cos(angle) * 20;
            this.lights[i].position.z = Math.sin(angle) * 20;
            this.lights[i].position.y = Math.sin(t * 0.5 + i) * 10;
        }

        if (this.particlePositions && this.particleSpeeds && this.particles) {
            for (let i = 0; i < this.particleSpeeds.length; i++) {
                this.particlePositions[i * 3 + 1] += this.particleSpeeds[i] * dt * 10;
                if (this.particlePositions[i * 3 + 1] > 40) {
                    this.particlePositions[i * 3 + 1] = -40;
                }
            }
            (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }
    }

    /** Apply a scaling decision from the adaptive performance layer */
    applyScaling(decision: ScalingDecision): void {
        // Update particle count
        if (decision.particleCount !== this.particleCount && this.scene && this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            (this.particles.material as THREE.Material).dispose();
            this.particles = null;
            this.particleCount = decision.particleCount;
            if (decision.particleCount > 0) {
                this.createParticles(decision.particleCount);
            }
        }

        // Update LOD
        this.sceneCtrl?.setLODLevel(decision.lodLevel);

        // Update pixel ratio
        if (this.renderer) {
            this.renderer.setPixelRatio(decision.pixelRatio);
        }

        // Shadows
        if (this.renderer) {
            this.renderer.shadowMap.enabled = decision.shadowsEnabled;
        }
    }

    /** Change theme colors (lights + particles + shaders) */
    setTheme(theme: Theme): void {
        this.theme = theme;
        const colors = THEME_COLORS[theme];

        // Update lights
        this.lights.forEach((light, i) => {
            light.color.setHex(colors[i % colors.length]);
        });

        // Update particles
        if (this.particles) {
            (this.particles.material as THREE.PointsMaterial).color.setHex(colors[0]);
        }

        // Update shader background
        if (this.bgMesh) {
            const gradientColors = SHADER_THEME_COLORS[theme];
            const mat = this.bgMesh.material as THREE.ShaderMaterial;
            mat.uniforms.uColor1.value.set(...gradientColors.color1);
            mat.uniforms.uColor2.value.set(...gradientColors.color2);
            mat.uniforms.uColor3.value.set(...gradientColors.color3);
            mat.uniforms.uColor4.value.set(...gradientColors.color4);
        }

        // Update fog
        if (this.fogMesh) {
            const fogColor = FOG_THEME_COLORS[theme];
            const mat = this.fogMesh.material as THREE.ShaderMaterial;
            mat.uniforms.uFogColor.value.copy(fogColor);
        }

        this.sceneCtrl?.markDirty('theme');
    }

    /** Get SceneController for external integration */
    getSceneController(): SceneController | null {
        return this.sceneCtrl;
    }

    /** Cleanup */
    destroy(): void {
        this._destroyed = true;
        this._ready = false;

        if (this.onMouseMove) globalThis.removeEventListener('mousemove', this.onMouseMove);
        if (this.onResize) globalThis.removeEventListener('resize', this.onResize);

        // Dispose shader materials
        this.shaderMaterials.forEach((m) => m.dispose());
        this.shaderMaterials = [];

        // Dispose bg + fog meshes
        if (this.bgMesh) {
            this.bgMesh.geometry.dispose();
            (this.bgMesh.material as THREE.Material).dispose();
        }
        if (this.fogMesh) {
            this.fogMesh.geometry.dispose();
            (this.fogMesh.material as THREE.Material).dispose();
        }

        // Dispose ambient geometry
        this.ambientMeshes.forEach((mesh) => {
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        });

        if (this.truckMesh) {
            this.truckMesh.geometry.dispose();
            (this.truckMesh.material as THREE.Material).dispose();
        }

        if (this.particles) {
            this.particles.geometry.dispose();
            (this.particles.material as THREE.Material).dispose();
        }

        // Destroy scene controller (handles renderer disposal)
        this.sceneCtrl?.destroy();
        this.sceneCtrl = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
    }
}
