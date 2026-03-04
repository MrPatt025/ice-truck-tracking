/* ================================================================
 *  Ice-Truck IoT Engine — Orchestrator v2 (Masterpiece Architecture)
 *  ─────────────────────────────────────────────────────────────────
 *  Wires together all 5 engine layers:
 *
 *  ┌─ Worker Layer (off-thread, WebSocket) ─────────────────────┐
 *  │  telemetry.worker.ts ─► Binary / JSON batches              │
 *  └────────────┬───────────────────────────────────────────────┘
 *               ↓
 *  ┌─ Zustand Transient Store (mutable Map) ────────────────────┐
 *  │  store.ts → upsertTruckBatch → spatial index update        │
 *  └────────────┬───────────────────────────────────────────────┘
 *               ↓
 *  ┌─ Frame Scheduler (requestAnimationFrame) ──────────────────┐
 *  │  1. Adaptive perf monitor  (adaptive/index.ts)             │
 *  │  2. GPU 3D Layer           (threeLayer.ts + gpu/*)         │
 *  │  3. Map Layer              (mapLayer.ts)                   │
 *  │  4. Chart Engines          (chartEngine.ts)                │
 *  │  5. Perception Engine      (perception/index.ts)           │
 *  │  6. Perf Overlay           (perfOverlay.ts)                │
 *  └────────────────────────────────────────────────────────────┘
 *
 *  React only renders: Shell, Panels, Controls, Forms.
 * ================================================================ */

import type { WorkerOutbound, WorkerConfig, AlertLevel, SpatialEntity } from './types';
import {
    useIoTStore,
    upsertTruck,
    upsertTruckBatch,
    pushAlert,
    pushChartPoint,
} from './store';
import { frameScheduler } from './frameScheduler';
import { ImperativeThreeLayer } from './threeLayer';
import { ImperativeMapLayer } from './mapLayer';
import { ImperativeChart } from './chartEngine';
import { PerformanceOverlay } from './perfOverlay';
import { AdaptiveController } from './adaptive';
import { PerceptionEngine } from './perception';
import { SpatialIndex, EntityMap } from './dataViz/spatialIndex';

// ─── Craft Layer Imports ───────────────────────────────────────
import { LightDirector } from './craft/lightSystem';
import { TextureCompositor } from './craft/textureSystem';
import { CursorPhysicsEngine } from './craft/cursorPhysics';
import { CinematicScrollEngine } from './craft/cinematicScroll';
import { MicroInteractionController } from './craft/microInteractions';
import { TemporalUIEngine } from './craft/temporalBehavior';
import { PredictiveRenderer } from './craft/predictiveRenderer';
import { ParticleMicroSystem } from './craft/particleMicroSystem';
import { SceneGraphController } from './craft/sceneGraph';
import { MapVisualController } from './craft/mapVisualMode';
import { VisualSilenceController } from './craft/visualSilence';
import { AnimationBudgetGovernor } from './craft/animationBudget';
import { ColorIntelligenceEngine } from './craft/colorIntelligence';
import { LayoutDensityController } from './craft/layoutDensity';

// ─── Singleton instances ───────────────────────────────────────
let worker: Worker | null = null;
let threeLayer: ImperativeThreeLayer | null = null;
let mapLayer: ImperativeMapLayer | null = null;
let perfOverlay: PerformanceOverlay | null = null;
const charts = new Map<string, ImperativeChart>();

// ─── Masterpiece engine layers ─────────────────────────────────
let adaptiveCtrl: AdaptiveController | null = null;
let perceptionEngine: PerceptionEngine | null = null;
let spatialIndex: SpatialIndex | null = null;
let entityMap: EntityMap<SpatialEntity> | null = null;
let _booted = false;

// ─── Craft Layer singletons ────────────────────────────────────
let lightDirector: LightDirector | null = null;
let textureCompositor: TextureCompositor | null = null;
let cursorPhysics: CursorPhysicsEngine | null = null;
let cinematicScroll: CinematicScrollEngine | null = null;
let microInteractions: MicroInteractionController | null = null;
let temporalUI: TemporalUIEngine | null = null;
let predictiveRenderer: PredictiveRenderer | null = null;
let particleSystem: ParticleMicroSystem | null = null;
let sceneGraph: SceneGraphController | null = null;
let mapVisuals: MapVisualController | null = null;
let visualSilence: VisualSilenceController | null = null;
let budgetGovernor: AnimationBudgetGovernor | null = null;
let colorIntelligence: ColorIntelligenceEngine | null = null;
let layoutDensity: LayoutDensityController | null = null;

// ─── Perf-aware alert level tracking ──────────────────────────
let _currentAlertLevel: AlertLevel | null = null;

// ─── Public API ────────────────────────────────────────────────

/** Boot the entire IoT engine. Call once from the dashboard mount. */
export function bootEngine(config?: Partial<WorkerConfig>): void {
    if (_booted) return;
    _booted = true;

    const fullConfig: WorkerConfig = {
        wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000',
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
        metricsInterval: 500,
        chartDownsample: 1000,
        maxTrucks: 10_000,
        ...config,
    };

    // 1) Adaptive Performance Intelligence Layer
    adaptiveCtrl = new AdaptiveController();
    adaptiveCtrl.onScale((decision) => {
        // Apply scaling to 3D layer
        threeLayer?.applyScaling(decision);
        console.debug('[Adaptive] Scaling applied:', decision.reason);
    });

    // 2) Spatial index for fast range queries
    spatialIndex = new SpatialIndex();
    entityMap = new EntityMap<SpatialEntity>();

    // 3) Perception Engine (mounted lazily with DOM containers)
    perceptionEngine = new PerceptionEngine();

    // 4) Spawn Web Worker
    try {
        worker = new Worker(
            new URL('./telemetry.worker.ts', import.meta.url),
            { type: 'module' },
        );

        worker.onmessage = (ev: MessageEvent<WorkerOutbound>) => {
            handleWorkerMessage(ev.data);
        };

        worker.onerror = (err) => {
            console.error('[IoT Engine] Worker error:', err);
        };

        // Send config to worker
        worker.postMessage({ type: 'config', payload: fullConfig });
    } catch (err) {
        console.warn('[IoT Engine] Worker init failed, running in-thread fallback:', err);
    }

    // 5) Start frame scheduler
    frameScheduler.start();

    // 6) Performance overlay
    perfOverlay = new PerformanceOverlay();
    frameScheduler.register('perf', (dt) => perfOverlay?.update(dt));

    // 7) Adaptive monitor tick (runs before other layers)
    frameScheduler.register('adaptive', () => {
        adaptiveCtrl?.tick();
    });

    // 8) Perception engine tick (runs after rendering)
    frameScheduler.register('perception', (dt) => {
        // Perception updates are event-driven via updateContext
        // Tick drives spring animations for tint/typography/depth
        perceptionEngine?.tick(dt);
    });

    console.log('[IoT Engine] Booted with Masterpiece Architecture ✓');

    // ── CRAFT LAYER BOOT ──────────────────────────────────────────
    // Scene graph (central nervous system)
    sceneGraph = new SceneGraphController();
    sceneGraph.mount();

    // Animation budget governor (must boot early — regulates everything)
    budgetGovernor = new AnimationBudgetGovernor();
    budgetGovernor.mount();

    // Light system
    lightDirector = new LightDirector();
    lightDirector.setTheme(useIoTStore.getState().theme);

    // Texture compositor
    textureCompositor = new TextureCompositor();

    // Color intelligence
    colorIntelligence = new ColorIntelligenceEngine();

    // Temporal UI
    temporalUI = new TemporalUIEngine();
    temporalUI.mount();

    // Layout density
    layoutDensity = new LayoutDensityController();
    layoutDensity.mount();

    // Visual silence
    visualSilence = new VisualSilenceController();
    visualSilence.mount();

    // Micro-interactions
    microInteractions = new MicroInteractionController();
    microInteractions.mount();

    // Predictive renderer
    predictiveRenderer = new PredictiveRenderer();
    predictiveRenderer.mount();

    // Map visuals
    mapVisuals = new MapVisualController();
    mapVisuals.mount();

    // Register craft tick (particle + budget monitoring)
    frameScheduler.register('craft-budget', () => {
        budgetGovernor?.reportFPS(60);
    });

    console.log('[IoT Engine] Craft Layer v5.0 mounted ✓');
}

/** Shutdown the engine. Call on unmount. */
export function shutdownEngine(): void {
    _booted = false;

    frameScheduler.stop();
    worker?.terminate();
    worker = null;

    threeLayer?.destroy();
    threeLayer = null;

    mapLayer?.destroy();
    mapLayer = null;

    charts.forEach((c) => c.destroy());
    charts.clear();

    perfOverlay?.destroy();
    perfOverlay = null;

    // Cleanup masterpiece layers
    adaptiveCtrl = null;

    perceptionEngine?.destroy();
    perceptionEngine = null;

    spatialIndex = null;
    entityMap = null;

    // Cleanup craft layers
    lightDirector?.destroy();
    lightDirector = null;
    textureCompositor?.destroy();
    textureCompositor = null;
    cursorPhysics?.destroy();
    cursorPhysics = null;
    cinematicScroll?.destroy();
    cinematicScroll = null;
    microInteractions?.destroy();
    microInteractions = null;
    temporalUI?.destroy();
    temporalUI = null;
    predictiveRenderer?.destroy();
    predictiveRenderer = null;
    particleSystem?.destroy();
    particleSystem = null;
    sceneGraph?.destroy();
    sceneGraph = null;
    mapVisuals?.destroy();
    mapVisuals = null;
    visualSilence?.destroy();
    visualSilence = null;
    budgetGovernor?.destroy();
    budgetGovernor = null;
    colorIntelligence = null;
    layoutDensity?.destroy();
    layoutDensity = null;
    frameScheduler.unregister('craft-budget');

    console.log('[IoT Engine] Shutdown ✓');
}

// ─── Layer mounting (called by React refs) ─────────────────────

/** Mount the Three.js 3D background into a container */
export function mount3D(container: HTMLElement): void {
    if (threeLayer) return;
    const theme = useIoTStore.getState().theme;
    threeLayer = new ImperativeThreeLayer();
    threeLayer.init(container, theme);
    frameScheduler.register('three', (dt) => threeLayer?.update(dt));

    // Mount perception overlays (tint + noise to document.body)
    perceptionEngine?.mount();

    // Mount craft visual layers into DOM
    lightDirector?.mount(container);
    textureCompositor?.mount(container);

    // Cursor physics (opt-in — mount globally)
    cursorPhysics = new CursorPhysicsEngine();
    cursorPhysics.mount();

    // Cinematic scroll
    cinematicScroll = new CinematicScrollEngine();
    cinematicScroll.mount();

    // Particle system (ambient atmosphere)
    particleSystem = new ParticleMicroSystem();
    particleSystem.mount(container);

    // Register craft tick for light/particle animation
    frameScheduler.register('craft-light', (dt) => lightDirector?.tick(dt));
}

export function unmount3D(): void {
    frameScheduler.unregister('three');
    perceptionEngine?.destroy();
    threeLayer?.destroy();
    threeLayer = null;
}

/** Mount the Mapbox GL map into a container */
export function mountMap(container: HTMLElement): void {
    if (mapLayer) return;
    const theme = useIoTStore.getState().theme;
    mapLayer = new ImperativeMapLayer();
    mapLayer.init(container, theme);
    frameScheduler.register('map', (dt) => mapLayer?.update(dt));
}

export function unmountMap(): void {
    frameScheduler.unregister('map');
    mapLayer?.destroy();
    mapLayer = null;
}

/** Register an imperative chart canvas */
export function mountChart(
    id: string,
    canvas: HTMLCanvasElement,
    config: Omit<ConstructorParameters<typeof ImperativeChart>[0], 'canvas'>,
): void {
    if (charts.has(id)) return;
    const chart = new ImperativeChart({ canvas, ...config });
    charts.set(id, chart);
    frameScheduler.register(`chart-${id}`, (dt) => chart.update(dt));
}

export function unmountChart(id: string): void {
    const chart = charts.get(id);
    if (!chart) return;
    frameScheduler.unregister(`chart-${id}`);
    chart.destroy();
    charts.delete(id);
}

/** Push data to a specific chart series */
export function pushToChart(chartId: string, seriesId: string, point: { timestamp: number; value: number }): void {
    const chart = charts.get(chartId);
    if (chart) chart.push(seriesId, point);
}

// ─── Accessors for layers ──────────────────────────────────────
export function getMapLayer(): ImperativeMapLayer | null {
    return mapLayer;
}

export function getThreeLayer(): ImperativeThreeLayer | null {
    return threeLayer;
}

export function getPerfOverlay(): PerformanceOverlay | null {
    return perfOverlay;
}

export function getFrameScheduler() {
    return frameScheduler;
}

export function getAdaptiveController(): AdaptiveController | null {
    return adaptiveCtrl;
}

export function getPerceptionEngine(): PerceptionEngine | null {
    return perceptionEngine;
}

export function getSpatialIndex(): SpatialIndex | null {
    return spatialIndex;
}

export function getEntityMap(): EntityMap<SpatialEntity> | null {
    return entityMap;
}

// ─── Craft Layer Accessors ─────────────────────────────────────
export function getLightDirector(): LightDirector | null { return lightDirector; }
export function getTextureCompositor(): TextureCompositor | null { return textureCompositor; }
export function getCursorPhysics(): CursorPhysicsEngine | null { return cursorPhysics; }
export function getCinematicScroll(): CinematicScrollEngine | null { return cinematicScroll; }
export function getMicroInteractions(): MicroInteractionController | null { return microInteractions; }
export function getTemporalUI(): TemporalUIEngine | null { return temporalUI; }
export function getPredictiveRenderer(): PredictiveRenderer | null { return predictiveRenderer; }
export function getParticleSystem(): ParticleMicroSystem | null { return particleSystem; }
export function getSceneGraph(): SceneGraphController | null { return sceneGraph; }
export function getMapVisuals(): MapVisualController | null { return mapVisuals; }
export function getVisualSilence(): VisualSilenceController | null { return visualSilence; }
export function getBudgetGovernor(): AnimationBudgetGovernor | null { return budgetGovernor; }
export function getColorIntelligence(): ColorIntelligenceEngine | null { return colorIntelligence; }
export function getLayoutDensity(): LayoutDensityController | null { return layoutDensity; }

// ─── Worker message handler helpers ────────────────────────────
function handleTruckUpdate(payload: WorkerOutbound & { type: 'truck-update' }): void {
    upsertTruck(payload.payload);
    if (entityMap && spatialIndex) {
        const t = payload.payload;
        entityMap.set(t.id, { id: t.id, x: t.lng, y: t.lat, data: t });
    }
}

function handleTruckBatch(payload: WorkerOutbound & { type: 'truck-batch' }): void {
    upsertTruckBatch(payload.payload);
    if (entityMap && spatialIndex) {
        const entities: SpatialEntity[] = payload.payload.map((t) => ({
            id: t.id, x: t.lng, y: t.lat, data: t,
        }));
        entityMap.setBatch(entities);
        if (entityMap.getDirtyIds().size > 0) {
            spatialIndex.bulkLoad(Array.from(entityMap.values()));
            entityMap.flushDirty();
        }
    }
}

function computeSystemLoad(m: { criticalAlerts: number; warningAlerts: number }): number {
    if (m.criticalAlerts > 0) return 0.9;
    if (m.warningAlerts > 0) return 0.5;
    return 0.2;
}

// ─── Worker message handler ────────────────────────────────────
function handleWorkerMessage(msg: WorkerOutbound): void {
    const store = useIoTStore;

    // Record event for perf overlay
    perfOverlay?.recordEvent();

    switch (msg.type) {
        case 'truck-update':
            handleTruckUpdate(msg as WorkerOutbound & { type: 'truck-update' });
            break;

        case 'truck-batch':
            handleTruckBatch(msg as WorkerOutbound & { type: 'truck-batch' });
            break;

        case 'alert': {
            pushAlert(msg.payload);
            store.getState().incrementUnacknowledgedAlerts();
            _currentAlertLevel = msg.payload.level;
            perceptionEngine?.updateContext({
                alertLevel: _currentAlertLevel,
                focusedTruckId: msg.payload.truckId || null,
                systemLoad: 0,
            });
            break;
        }

        case 'metrics':
            store.getState().setMetrics(msg.payload);
            if (perceptionEngine) {
                perceptionEngine.updateContext({
                    alertLevel: _currentAlertLevel,
                    focusedTruckId: null,
                    systemLoad: computeSystemLoad(msg.payload),
                });
            }
            break;

        case 'geofence-event':
            console.debug('[Geofence]', msg.payload);
            break;

        case 'chart-delta': {
            const { series, point } = msg.payload;
            pushChartPoint(series, point);
            charts.forEach((chart) => {
                chart.push(series, point);
            });
            break;
        }

        case 'connection-status':
            store.getState().setConnectionStatus(msg.payload);
            break;
    }
}

// ─── Store subscriptions for imperative layers ─────────────────
// When theme changes, update 3D, map, and perception
useIoTStore.subscribe(
    (s) => s.theme,
    (theme) => {
        threeLayer?.setTheme(theme);
        mapLayer?.setStyle(theme);
        // Perception engine reacts to theme implicitly through alert context
        // Craft layer theme sync
        lightDirector?.setTheme(theme);
        textureCompositor?.setTheme(theme);
        colorIntelligence?.setTheme(theme);
        mapVisuals?.setTheme(theme);
        sceneGraph?.setTheme(theme);
    },
);

// When pause changes, pause/resume frame scheduler
useIoTStore.subscribe(
    (s) => s.paused,
    (paused) => {
        if (paused) frameScheduler.pause();
        else frameScheduler.resume();
    },
);
