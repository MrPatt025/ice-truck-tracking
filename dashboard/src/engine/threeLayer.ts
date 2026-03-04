/* ================================================================
 *  Ice-Truck IoT Engine — Imperative Three.js 3D Layer
 *  ─────────────────────────────────────────────────────
 *  • Uses InstancedMesh for 1000+ truck markers → 1 draw call
 *  • GPU particle system for ambient effects
 *  • Mouse-reactive camera (parallax)
 *  • Driven by frame scheduler — zero React involvement
 *  • Automatic cleanup on destroy
 * ================================================================ */

import * as THREE from 'three';
import { getTruckMap } from './store';
import type { Theme } from './types';

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
    private renderer: THREE.WebGLRenderer | null = null;
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private container: HTMLElement | null = null;
    private _destroyed = false;
    private _ready = false;

    // Instanced mesh for truck markers
    private truckMesh: THREE.InstancedMesh | null = null;
    private dummy = new THREE.Object3D();
    private colorAttr: THREE.InstancedBufferAttribute | null = null;

    // Ambient geometry
    private ambientMeshes: THREE.Mesh[] = [];
    private lights: THREE.PointLight[] = [];

    // Particle system
    private particles: THREE.Points | null = null;
    private particlePositions: Float32Array | null = null;
    private particleSpeeds: Float32Array | null = null;

    // Mouse parallax
    private mx = 0;
    private my = 0;
    private onMouseMove: ((e: MouseEvent) => void) | null = null;
    private onResize: (() => void) | null = null;

    private theme: Theme = 'dark';

    get ready(): boolean {
        return this._ready;
    }

    /** Mount into a DOM element */
    init(container: HTMLElement, theme: Theme = 'dark'): void {
        if (this._destroyed) return;
        this.container = container;
        this.theme = theme;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            container.clientWidth / container.clientHeight,
            0.5,
            1000,
        );
        this.camera.position.z = 35;

        // Lighting
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

        // Instanced mesh for trucks (GPU instancing = 1 draw call)
        const truckGeo = new THREE.SphereGeometry(0.3, 8, 6);
        const truckMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            shininess: 80,
        });
        this.truckMesh = new THREE.InstancedMesh(truckGeo, truckMat, MAX_INSTANCES);
        this.truckMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.truckMesh.count = 0; // will be set on update

        // Per-instance color attribute
        const colorArray = new Float32Array(MAX_INSTANCES * 3);
        this.colorAttr = new THREE.InstancedBufferAttribute(colorArray, 3);
        this.truckMesh.instanceColor = this.colorAttr;
        this.scene.add(this.truckMesh);

        // Ambient decorative meshes (icosahedrons + tori)
        this.createAmbientGeometry(colors);

        // Particle system
        this.createParticles(2000);

        // Mouse parallax
        this.onMouseMove = (e: MouseEvent) => {
            this.mx = (e.clientX / window.innerWidth) * 2 - 1;
            this.my = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', this.onMouseMove, { passive: true });

        // Resize handler
        this.onResize = () => {
            if (!this.camera || !this.renderer || !this.container) return;
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        };
        window.addEventListener('resize', this.onResize);

        this._ready = true;
    }

    private createAmbientGeometry(colors: number[]): void {
        if (!this.scene) return;

        // Icosahedrons
        for (let i = 0; i < 15; i++) {
            const g = new THREE.IcosahedronGeometry(Math.random() * 2 + 0.5, 1);
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

    /** Called by frame scheduler every frame */
    update(dt: number): void {
        if (!this._ready || this._destroyed || !this.scene || !this.camera || !this.renderer) return;

        const t = performance.now() * 0.001;

        // ── Update instanced truck mesh from mutable map ──
        const trucks = getTruckMap();
        let idx = 0;
        const tempColor = new THREE.Color();

        trucks.forEach((truck) => {
            if (idx >= MAX_INSTANCES) return;

            // Map lat/lng to 3D space (simple projection for visualization)
            const x = (truck.lng - 100.5) * 80;
            const y = (truck.lat - 13.75) * 80;
            const z = Math.sin(t + idx * 0.1) * 0.5; // gentle float

            this.dummy.position.set(x, y, z);
            this.dummy.scale.setScalar(0.8 + (truck.speed / 120) * 0.4);
            this.dummy.updateMatrix();
            this.truckMesh!.setMatrixAt(idx, this.dummy.matrix);

            // Per-instance color based on status
            const statusColor = STATUS_COLORS[truck.status] ?? 0x06b6d4;
            tempColor.setHex(statusColor);
            this.colorAttr!.setXYZ(idx, tempColor.r, tempColor.g, tempColor.b);

            idx++;
        });

        this.truckMesh!.count = idx;
        this.truckMesh!.instanceMatrix.needsUpdate = true;
        if (this.colorAttr) this.colorAttr.needsUpdate = true;

        // ── Animate ambient meshes ──
        for (const mesh of this.ambientMeshes) {
            mesh.rotateOnAxis(mesh.userData.axis, mesh.userData.speed);
            mesh.position.y += Math.sin(t + mesh.id * 0.5) * 0.005;
            mesh.position.x += Math.cos(t + mesh.id * 0.3) * 0.003;
        }

        // ── Animate lights ──
        for (let i = 0; i < this.lights.length; i++) {
            const angle = (i / this.lights.length) * Math.PI * 2 + t * 0.3;
            this.lights[i].position.x = Math.cos(angle) * 20;
            this.lights[i].position.z = Math.sin(angle) * 20;
            this.lights[i].position.y = Math.sin(t * 0.5 + i) * 10;
        }

        // ── Animate particles ──
        if (this.particlePositions && this.particleSpeeds && this.particles) {
            for (let i = 0; i < this.particleSpeeds.length; i++) {
                this.particlePositions[i * 3 + 1] += this.particleSpeeds[i] * dt * 10;
                if (this.particlePositions[i * 3 + 1] > 40) {
                    this.particlePositions[i * 3 + 1] = -40;
                }
            }
            (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }

        // ── Camera parallax ──
        this.camera.position.x += (this.mx * 6 - this.camera.position.x) * 0.05;
        this.camera.position.y += (this.my * 6 - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);

        // ── Render ──
        this.renderer.render(this.scene, this.camera);
    }

    /** Change theme colors (lights + particles) */
    setTheme(theme: Theme): void {
        this.theme = theme;
        const colors = THEME_COLORS[theme];
        this.lights.forEach((light, i) => {
            light.color.setHex(colors[i % colors.length]);
        });
        if (this.particles) {
            (this.particles.material as THREE.PointsMaterial).color.setHex(colors[0]);
        }
    }

    /** Cleanup */
    destroy(): void {
        this._destroyed = true;
        this._ready = false;

        if (this.onMouseMove) window.removeEventListener('mousemove', this.onMouseMove);
        if (this.onResize) window.removeEventListener('resize', this.onResize);

        // Dispose geometry & materials
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

        this.renderer?.dispose();
        if (this.renderer?.domElement && this.container?.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }

        this.renderer = null;
        this.scene = null;
        this.camera = null;
    }
}
