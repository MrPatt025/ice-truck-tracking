/* ================================================================
 *  Ice-Truck IoT Engine — Public API (Masterpiece Architecture)
 *  ─────────────────────────────────────────────────────────────
 *  Import everything from '@/engine' or '@/engine/index'.
 *
 *  5-Layer Architecture:
 *    1. GPU Rendering Engine      (gpu/*)
 *    2. Motion Physics Engine     (motion/*)
 *    3. Data Visualization Engine (dataViz/*)
 *    4. Perception Engine         (perception/*)
 *    5. Adaptive Performance      (adaptive/*)
 * ================================================================ */

// Types
export type {
    TruckTelemetry,
    TruckStatus,
    AlertLevel,
    TelemetryAlert,
    Geofence,
    GeofenceEvent,
    FleetMetrics,
    TimeSeriesPoint,
    ChartDataset,
    WorkerInbound,
    WorkerOutbound,
    WorkerConfig,
    Theme,
    ThemeColors,
    FrameCallback,
    PerfSnapshot,
    LODLevel,
    DeviceTier,
    GPUSceneConfig,
    SceneDirtyFlags,
    CullResult,
    SpringConfig,
    SpringState,
    Velocity2D,
    MotionTier,
    GestureState,
    AABB,
    SpatialEntity,
    PoolStats,
    HeatmapConfig,
    GlowConfig,
    TintState,
    NoiseConfig,
    TypographyConfig,
    PerceptionContext,
    EnvSnapshot,
    ScalingDecision,
    FrameBudget,
    PerfViolation,
} from './types';

// Store
export {
    useIoTStore,
    getTruckMap,
    getAlerts,
    getChartBuffer,
    upsertTruck,
    upsertTruckBatch,
    pushAlert,
    acknowledgeAlert,
    pushChartPoint,
} from './store';
export type { IoTStoreState } from './store';

// Frame Scheduler
export { frameScheduler } from './frameScheduler';

// Ring Buffer
export { RingBuffer } from './ringBuffer';

// ─── Layer 1: GPU Rendering Engine ─────────────────────────────
export { SceneController } from './gpu/sceneController';
export {
    createMeshGradientMaterial,
    createParticleGlowMaterial,
    createDataGlowMaterial,
    createDepthFogMaterial,
    updateShaderUniforms,
    SHADER_THEME_COLORS,
    PARTICLE_THEME_COLORS,
    FOG_THEME_COLORS,
} from './gpu/shaderMaterials';
export { AdaptiveDPR, PerformanceGuard, detectDeviceTier } from './gpu/adaptiveDPR';
export { ImperativeThreeLayer } from './threeLayer';

// ─── Layer 2: Motion Physics Engine ────────────────────────────
export {
    SpringValue,
    Spring2D,
    VelocityTracker,
    GestureEngine,
    SpringGroup,
    SPRING_PRESETS,
    MOTION_TIER_PRESETS,
} from './motion/springPhysics';
export {
    useSpring,
    useSpring2D,
    MagneticButton,
    InertiaPanel,
    SpringNumber,
} from './motion/components';

// ─── Layer 3: Data Visualization Engine ────────────────────────
export { SpatialIndex, EntityMap } from './dataViz/spatialIndex';
export {
    ObjectPool,
    featurePool,
    vec3Pool,
    HeatmapRenderer,
    RouteRenderer,
    projectTrucksToScreen,
} from './dataViz/objectPool';

// ─── Layer 4: Perception Engine ────────────────────────────────
export {
    ContextualTint,
    NoiseOverlay,
    TypographyEngine,
    DepthLayering,
    PerceptionEngine,
} from './perception';

// ─── Layer 5: Adaptive Performance Intelligence ────────────────
export {
    EnvMonitor,
    ScalingStrategy,
    AdaptiveController,
    FRAME_BUDGET,
} from './adaptive';

// ─── Imperative Layers ─────────────────────────────────────────
export { ImperativeMapLayer } from './mapLayer';
export { ImperativeChart } from './chartEngine';
export type { ChartSeries, ChartConfig } from './chartEngine';
export { PerformanceOverlay } from './perfOverlay';

// Orchestrator (main entry point)
export {
    bootEngine,
    shutdownEngine,
    mount3D,
    setThreeCameraFov,
    unmount3D,
    mountMap,
    unmountMap,
    mountChart,
    unmountChart,
    pushToChart,
    getMapLayer,
    getThreeLayer,
    getPerfOverlay,
    getFrameScheduler,
    getAdaptiveController,
    getPerceptionEngine,
    getSpatialIndex,
    getEntityMap,
    // Craft Layer Accessors
    getLightDirector,
    getTextureCompositor,
    getCursorPhysics,
    getCinematicScroll,
    getMicroInteractions,
    getTemporalUI,
    getPredictiveRenderer,
    getParticleSystem,
    getSceneGraph,
    getMapVisuals,
    getVisualSilence,
    getBudgetGovernor,
    getColorIntelligence,
    getLayoutDensity,
} from './orchestrator';

// ═════════════════════════════════════════════════════════════════
//  LAYER 6+7 — Craft Layer (Perceptual + Emotional Narrative)
// ═════════════════════════════════════════════════════════════════
export * from './craft';

// Craft-specific types
export type {
    CraftLightNarrative,
    CraftSceneWorld,
    CraftCameraState,
    CraftOKLCH,
    CraftEmotionalTone,
    CraftEmotionalPhase,
    CraftTimeSegment,
    CraftDensityMode,
    CraftSilenceLevel,
    CraftBudgetAction,
} from './types';
