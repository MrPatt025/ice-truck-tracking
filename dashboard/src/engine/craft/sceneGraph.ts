/* ================================================================
 *  CRAFT LAYER — Unified Scene Graph (#20)
 *  ─────────────────────────────────────────────────────────────
 *  One logical graph governs DOM + GPU worlds.
 *
 *  Features:
 *    • Unified depth ordering    — z-index + Three.js renderOrder
 *    • Shared camera state       — FOV, position, zoom synced
 *    • Cross-world transitions   — DOM ↔ WebGL element handoff
 *    • Consistent lighting       — CSS shadows + Three.js lights
 *    • Theme propagation         — single source for both worlds
 *
 *  Acts as the central nervous system connecting all craft layers.
 * ================================================================ */

import type { Theme } from '../types';

// ─── Types ─────────────────────────────────────────────────────

export type SceneWorld = 'dom' | 'webgl' | 'map' | 'overlay';

export interface SceneNode {
  id: string;
  world: SceneWorld;
  depth: number;            // unified depth (0 = nearest)
  visible: boolean;
  opacity: number;
  transform: {
    x: number;
    y: number;
    z: number;
    scale: number;
    rotation: number;       // degrees
  };
  metadata: Record<string, unknown>;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  fov: number;
  bearing: number;
  pitch: number;
}

export interface SceneGraphConfig {
  depthLayers: number;      // total depth layers
  syncCameraToMap: boolean;
  syncLightToTheme: boolean;
}

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_CONFIG: SceneGraphConfig = {
  depthLayers: 10,
  syncCameraToMap: true,
  syncLightToTheme: true,
};

// Z-index mapping for DOM depth layers
const DOM_Z_BASE = 1000;
const DOM_Z_STEP = 100;

// ─── Scene Graph Controller ──────────────────────────────────

export class SceneGraphController {
  private readonly _config: SceneGraphConfig;
  private readonly _nodes = new Map<string, SceneNode>();
  private readonly _camera: CameraState = { x: 0, y: 0, zoom: 1, fov: 60, bearing: 0, pitch: 0 };
  private _theme: Theme = 'dark';
  private _mounted = false;

  // Sync callbacks
  private _onCameraSync: ((cam: CameraState) => void) | null = null;
  private _onThemeSync: ((theme: Theme) => void) | null = null;
  private _onDepthChange: ((nodes: SceneNode[]) => void) | null = null;

  constructor(config?: Partial<SceneGraphConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted) return;
    this._mounted = true;
  }

  destroy(): void {
    this._mounted = false;
    this._nodes.clear();
  }

  /* ── Node Management ───────────────────────────────────────── */

  addNode(node: SceneNode): void {
    this._nodes.set(node.id, { ...node });
    this._notifyDepthChange();
  }

  removeNode(id: string): void {
    this._nodes.delete(id);
    this._notifyDepthChange();
  }

  getNode(id: string): SceneNode | undefined {
    return this._nodes.get(id);
  }

  updateNode(id: string, updates: Partial<Omit<SceneNode, 'id'>>): void {
    const node = this._nodes.get(id);
    if (!node) return;

    if (updates.transform) {
      Object.assign(node.transform, updates.transform);
    }
    if (updates.depth !== undefined) node.depth = updates.depth;
    if (updates.visible !== undefined) node.visible = updates.visible;
    if (updates.opacity !== undefined) node.opacity = updates.opacity;
    if (updates.world !== undefined) node.world = updates.world;

    this._notifyDepthChange();
  }

  /** Get all nodes sorted by depth */
  getDepthSorted(): SceneNode[] {
    return Array.from(this._nodes.values()).sort((a, b) => a.depth - b.depth);
  }

  /** Get nodes in a specific world */
  getWorldNodes(world: SceneWorld): SceneNode[] {
    return Array.from(this._nodes.values()).filter((n) => n.world === world);
  }

  /* ── Camera ────────────────────────────────────────────────── */

  setCamera(state: Partial<CameraState>): void {
    Object.assign(this._camera, state);
    this._onCameraSync?.(this._camera);
    this._applyCameraCSSVars();
  }

  getCamera(): Readonly<CameraState> {
    return this._camera;
  }

  onCameraSync(cb: (cam: CameraState) => void): void {
    this._onCameraSync = cb;
  }

  /* ── Theme ─────────────────────────────────────────────────── */

  setTheme(theme: Theme): void {
    this._theme = theme;
    this._onThemeSync?.(theme);
  }

  getTheme(): Theme {
    return this._theme;
  }

  onThemeSync(cb: (theme: Theme) => void): void {
    this._onThemeSync = cb;
  }

  /* ── Depth Callbacks ───────────────────────────────────────── */

  onDepthChange(cb: (nodes: SceneNode[]) => void): void {
    this._onDepthChange = cb;
  }

  /* ── Cross-World Transition ────────────────────────────────── */

  /**
   * Transfer a node between worlds (e.g., DOM card → WebGL 3D object).
   * Returns the projected position in the target world coordinate system.
   */
  transferNode(id: string, toWorld: SceneWorld): { x: number; y: number; z: number } | null {
    const node = this._nodes.get(id);
    if (!node) return null;

    const prevWorld = node.world;
    node.world = toWorld;

    // Project position based on camera state
    const projected = this._projectPosition(node, prevWorld, toWorld);
    node.transform.x = projected.x;
    node.transform.y = projected.y;
    node.transform.z = projected.z;

    this._notifyDepthChange();
    return projected;
  }

  /* ── DOM Z-Index Utility ───────────────────────────────────── */

  /** Convert unified depth to CSS z-index */
  depthToZIndex(depth: number): number {
    return DOM_Z_BASE + (this._config.depthLayers - depth) * DOM_Z_STEP;
  }

  /** Convert unified depth to Three.js renderOrder */
  depthToRenderOrder(depth: number): number {
    return this._config.depthLayers - depth;
  }

  /* ── Internal ──────────────────────────────────────────────── */

  private _projectPosition(
    node: SceneNode,
    _from: SceneWorld,
    _to: SceneWorld,
  ): { x: number; y: number; z: number } {
    // Simplified projection — in real use, this would use camera matrices
    return {
      x: node.transform.x,
      y: node.transform.y,
      z: node.transform.z + (node.depth * 10),
    };
  }

  private _notifyDepthChange(): void {
    this._onDepthChange?.(this.getDepthSorted());
  }

  private _applyCameraCSSVars(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--scene-camera-x', String(this._camera.x));
    root.style.setProperty('--scene-camera-y', String(this._camera.y));
    root.style.setProperty('--scene-camera-zoom', String(this._camera.zoom));
    root.style.setProperty('--scene-camera-fov', String(this._camera.fov));
    root.style.setProperty('--scene-camera-bearing', String(this._camera.bearing));
  }
}
