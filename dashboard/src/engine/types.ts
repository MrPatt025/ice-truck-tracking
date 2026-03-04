/* ================================================================
 *  Ice-Truck IoT Engine — Shared Type Definitions
 *  All types live here so every module imports from one source.
 * ================================================================ */

// ─── Vehicle Telemetry ─────────────────────────────────────────
export interface TruckTelemetry {
    id: string;
    lat: number;
    lng: number;
    speed: number;          // km/h
    heading: number;        // 0-360 degrees
    temperature: number;    // cargo temp °C
    fuelLevel: number;      // 0-100%
    engineRpm: number;
    odometer: number;       // km
    status: TruckStatus;
    driverName: string;
    routeId: string;
    timestamp: number;      // epoch ms
}

export type TruckStatus = 'active' | 'idle' | 'offline' | 'maintenance' | 'alert';

// ─── Alerts ────────────────────────────────────────────────────
export type AlertLevel = 'critical' | 'warning' | 'info';

export interface TelemetryAlert {
    id: string;
    truckId: string;
    level: AlertLevel;
    message: string;
    timestamp: number;
    acknowledged: boolean;
    location?: { lat: number; lng: number };
}

// ─── Geofence ──────────────────────────────────────────────────
export interface Geofence {
    id: string;
    name: string;
    type: 'circle' | 'polygon';
    center?: { lat: number; lng: number };
    radius?: number;        // metres
    points?: { lat: number; lng: number }[];
}

export interface GeofenceEvent {
    id: string;
    truckId: string;
    geofenceId: string;
    type: 'entry' | 'exit' | 'dwell';
    timestamp: number;
    location: { lat: number; lng: number };
}

// ─── Aggregated Metrics (computed by Worker) ───────────────────
export interface FleetMetrics {
    activeTrucks: number;
    idleTrucks: number;
    offlineTrucks: number;
    avgTemperature: number;
    minTemperature: number;
    maxTemperature: number;
    avgSpeed: number;
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    avgFuelLevel: number;
    onTimeRate: number;
    totalDeliveries: number;
    revenueToday: number;
    activeDrivers: number;
    fuelEfficiency: number;
    timestamp: number;
}

// ─── Ring Buffer entry for charts ──────────────────────────────
export interface TimeSeriesPoint {
    timestamp: number;
    value: number;
    label?: string;
}

export interface ChartDataset {
    id: string;
    label: string;
    color: string;
    points: TimeSeriesPoint[];
}

// ─── Worker Messages ───────────────────────────────────────────
export type WorkerInbound =
    | { type: 'ws-message'; payload: string }
    | { type: 'config'; payload: WorkerConfig }
    | { type: 'reset' };

export type WorkerOutbound =
    | { type: 'truck-update'; payload: TruckTelemetry }
    | { type: 'truck-batch'; payload: TruckTelemetry[] }
    | { type: 'alert'; payload: TelemetryAlert }
    | { type: 'metrics'; payload: FleetMetrics }
    | { type: 'geofence-event'; payload: GeofenceEvent }
    | { type: 'chart-delta'; payload: { series: string; point: TimeSeriesPoint } }
    | { type: 'connection-status'; payload: 'connected' | 'disconnected' | 'reconnecting' };

export interface WorkerConfig {
    wsUrl: string;
    apiUrl: string;
    metricsInterval: number;  // ms between aggregated metrics pushes
    chartDownsample: number;  // ms between chart point emissions
    maxTrucks: number;
}

// ─── Theme ─────────────────────────────────────────────────────
export type Theme = 'dark' | 'neon' | 'ocean' | 'forest';

export interface ThemeColors {
    primary: number[];
    gradient: string;
    accent: string;
    mapStyle: string;
}

// ─── Frame Scheduler ───────────────────────────────────────────
export type FrameCallback = (dt: number) => void;

// ─── Performance Metrics ───────────────────────────────────────
export interface PerfSnapshot {
    fps: number;
    frameTime: number;       // ms
    heapUsed: number;        // MB
    heapTotal: number;       // MB
    domNodes: number;
    timestamp: number;
}

// ═════════════════════════════════════════════════════════════════
//  LAYER 1 — GPU Rendering Engine Types
// ═════════════════════════════════════════════════════════════════

/** LOD levels for adaptive quality */
export type LODLevel = 'ultra' | 'high' | 'medium' | 'low' | 'minimal';

/** Device performance tier (auto-detected) */
export type DeviceTier = 'high-end' | 'mid-range' | 'low-end' | 'potato';

/** Configuration for the GPU scene controller */
export interface GPUSceneConfig {
    maxInstances: number;
    particleCount: number;
    ambientGeometryCount: number;
    enableShadows: boolean;
    enablePostProcessing: boolean;
    enableParticles: boolean;
    antialias: boolean;
    pixelRatio: number;
    lodLevel: LODLevel;
}

/** Scene dirty flags — render only when something changed */
export interface SceneDirtyFlags {
    camera: boolean;
    data: boolean;
    animation: boolean;
    resize: boolean;
    theme: boolean;
}

/** Frustum culling result */
export interface CullResult {
    visibleCount: number;
    totalCount: number;
    culledCount: number;
}

// ═════════════════════════════════════════════════════════════════
//  LAYER 2 — Motion Physics Engine Types
// ═════════════════════════════════════════════════════════════════

/** Spring configuration (critically-damped by default) */
export interface SpringConfig {
    mass: number;          // kg (default 1)
    stiffness: number;     // N/m (default 170)
    damping: number;       // Ns/m (default 26 — critically damped)
    precision: number;     // rest threshold (default 0.01)
}

/** Spring state for a single value */
export interface SpringState {
    position: number;
    velocity: number;
    target: number;
    atRest: boolean;
}

/** 2D velocity vector */
export interface Velocity2D {
    x: number;
    y: number;
    magnitude: number;
    angle: number;         // radians
    timestamp: number;
}

/** Motion hierarchy timing tiers */
export type MotionTier = 'macro' | 'meso' | 'micro' | 'nano';

/** Motion budget per tier (ms) */
export const MOTION_BUDGET: Record<MotionTier, number> = {
    macro: 300,   // Page transitions, panels
    meso: 200,    // Cards, modals
    micro: 120,   // Buttons, toggles
    nano: 80,     // Hover, focus
};

/** Gesture tracking state */
export interface GestureState {
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    velocityX: number;
    velocityY: number;
    offsetX: number;
    offsetY: number;
    timestamp: number;
}

// ═════════════════════════════════════════════════════════════════
//  LAYER 3 — Data Visualization Engine Types
// ═════════════════════════════════════════════════════════════════

/** Axis-aligned bounding box for spatial queries */
export interface AABB {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/** Spatial entity with position for R-Tree indexing */
export interface SpatialEntity {
    id: string;
    x: number;         // projected X (lng)
    y: number;         // projected Y (lat)
    data: TruckTelemetry;
}

/** Object pool statistics */
export interface PoolStats {
    capacity: number;
    active: number;
    available: number;
    totalCreated: number;
    totalRecycled: number;
}

/** Heatmap configuration */
export interface HeatmapConfig {
    radius: number;           // pixels
    intensity: number;        // 0-1
    gradient: Record<number, string>;  // stop → color
    opacity: number;
    maxZoom: number;
}

/** Data-driven glow configuration */
export interface GlowConfig {
    baseIntensity: number;
    pulseSpeed: number;       // Hz
    colorByMetric: 'speed' | 'temperature' | 'fuel' | 'status';
    maxGlow: number;
}

// ═════════════════════════════════════════════════════════════════
//  LAYER 4 — Perception Engine Types
// ═════════════════════════════════════════════════════════════════

/** Contextual UI tint state */
export interface TintState {
    hue: number;              // 0-360
    saturation: number;       // 0-100
    lightness: number;        // 0-100
    opacity: number;          // 0-1
    transitionMs: number;
}

/** Noise/grain overlay config */
export interface NoiseConfig {
    opacity: number;          // 0.02-0.05 typical
    frequency: number;        // SVG feTurbulence base frequency
    octaves: number;          // feTurbulence numOctaves
    animated: boolean;        // animate seed for film grain effect
    blendMode: string;        // CSS mix-blend-mode
}

/** Typography dynamics config */
export interface TypographyConfig {
    enableWeightMorph: boolean;
    enableTabularNums: boolean;
    weightRange: [number, number];  // e.g. [300, 700]
    morphDuration: number;          // ms
}

/** Perception alert context */
export interface PerceptionContext {
    alertLevel: AlertLevel | null;
    focusedTruckId: string | null;
    systemLoad: number;            // 0-1 (from adaptive layer)
    timeOfDay: 'day' | 'night';
    theme: Theme;
}

// ═════════════════════════════════════════════════════════════════
//  LAYER 5 — Adaptive Performance Intelligence Types
// ═════════════════════════════════════════════════════════════════

/** Full environment snapshot */
export interface EnvSnapshot {
    fps: number;
    frameTime: number;         // ms (rolling average)
    heapUsedMB: number;
    heapLimitMB: number;
    memoryPressure: number;    // 0-1
    devicePixelRatio: number;
    batteryLevel: number;      // 0-1 (1.0 if plugged in / unavailable)
    isCharging: boolean;
    thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
    connectionType: string;    // 'wifi' | '4g' | '3g' etc.
    deviceTier: DeviceTier;
    gpuTier: 'high' | 'medium' | 'low';
    coreCount: number;
    timestamp: number;
}

/** Scaling decision from the adaptive layer */
export interface ScalingDecision {
    lodLevel: LODLevel;
    particleCount: number;
    shadowsEnabled: boolean;
    postProcessing: boolean;
    pixelRatio: number;
    mapQuality: 'high' | 'medium' | 'low';
    chartFidelity: 'full' | 'reduced' | 'minimal';
    motionReduced: boolean;
    reason: string;
    timestamp: number;
}

/** Performance budget allocation (16.6ms frame) */
export interface FrameBudget {
    react: number;       // 3ms
    worker: number;      // 4ms
    gpu: number;         // 6ms
    motion: number;      // 2ms
    overhead: number;    // 1.6ms
    total: number;       // 16.6ms
}

/** Performance rule violation */
export interface PerfViolation {
    rule: string;
    severity: 'warn' | 'critical';
    value: number;
    threshold: number;
    message: string;
    timestamp: number;
}
