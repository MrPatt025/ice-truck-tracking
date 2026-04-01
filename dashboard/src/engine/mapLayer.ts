/* ================================================================
 *  Ice-Truck IoT Engine — Imperative Map Layer (Mapbox + deck.gl)
 *  ────────────────────────────────────────────────────────────────
 *  • Reads truck coordinates directly from transient Zustand map
 *  • Renders via deck.gl ScatterplotLayer (GPU instancing)
 *  • Color-codes trucks by temperature / speed risk
 *  • Zero React involvement in real-time marker updates
 * ================================================================ */

import mapboxgl from 'mapbox-gl';
import { HeatmapLayer, ScreenGridLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Theme, TruckTelemetry } from './types';
import type {
    CinematicCameraFlyToPayload,
    CinematicMapModePayload,
} from '../workers/cinematicMessages';
import { readFleetSnapshot, writeFleetSnapshot } from './offlineFleetCache';
import { getTruckMap, useIoTStore } from './store';
import { useCameraSelectionStore } from '../stores/cameraSelectionStore';

type RGBA = [number, number, number, number];
type Position = [number, number];

interface TruckRenderPoint {
    id: string;
    position: Position;
    startPosition: Position;
    targetPosition: Position;
    lerpStartAt: number;
    lerpDurationMs: number;
    lastPacketAt: number;
    speed: number;
    temperature: number;
    driverName: string;
    status: string;
    baseColor: RGBA;
    color: RGBA;
    radius: number;
}

interface HeatmapPoint {
    position: Position;
    weight: number;
    at: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
const E2E_LIGHT_MODE = process.env.NEXT_PUBLIC_E2E_LIGHT === 'true';
const OPEN_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
const MAPBOX_STYLES: Record<Theme, string> = {
    dark: 'mapbox://styles/mapbox/dark-v11',
    neon: 'mapbox://styles/mapbox/dark-v11',
    ocean: 'mapbox://styles/mapbox/dark-v11',
    forest: 'mapbox://styles/mapbox/dark-v11',
};

const TEMP_HIGH_LIMIT = -2;
const TEMP_LOW_LIMIT = -25;
const SPEED_WARNING_LIMIT = 95;
const UPDATE_INTERVAL_MS = 32;
const LERP_BASE_DURATION_MS = 170;
const LERP_MIN_DURATION_MS = 80;
const LERP_MAX_DURATION_MS = 260;
const POSITION_EPSILON = 0.000001;
const STALE_PACKET_THRESHOLD_MS = 5 * 60 * 1000;
const STALE_FADE_DURATION_MS = 90 * 1000;
const STALE_TARGET_ALPHA = 128;
const STALE_COLOR_TARGET: readonly [number, number, number] = [148, 163, 184];
const GLOW_COLOR: readonly [number, number, number] = [56, 189, 248];
const HEATMAP_HISTORY_LIMIT = 7_500;
const HEATMAP_POINT_TTL_MS = 8 * 60 * 1000;
const HEATMAP_ALPHA_EPSILON = 0.02;
const MODE_TRANSITION_DURATION_MS = 500;
const OPACITY_EPSILON = 0.01;
const CACHE_PERSIST_INTERVAL_MS = 5_000;
const TRUCK_CLUSTER_THRESHOLD = 100_000;

const HEATMAP_BASE_COLOR_RANGE: readonly RGBA[] = [
    [14, 116, 144, 8],
    [6, 182, 212, 36],
    [45, 212, 191, 72],
    [132, 204, 22, 112],
    [250, 204, 21, 162],
    [249, 115, 22, 204],
    [239, 68, 68, 236],
];

function resolveMapStyle(theme: Theme): string {
    if (E2E_LIGHT_MODE) return OPEN_STYLE_URL;
    if (!MAPBOX_TOKEN) return OPEN_STYLE_URL;
    return MAPBOX_STYLES[theme] ?? MAPBOX_STYLES.dark;
}

function createMapInstance(container: HTMLElement, style: string): mapboxgl.Map {
    return new mapboxgl.Map({
        container,
        style,
        center: [100.5018, 13.7563],
        zoom: 10,
        antialias: true,
        maxZoom: 18,
        minZoom: 3,
        attributionControl: false,
        fadeDuration: 0,
        trackResize: true,
    });
}

function getTruckColor(truck: TruckTelemetry): RGBA {
    if (truck.temperature > TEMP_HIGH_LIMIT || truck.temperature < TEMP_LOW_LIMIT) {
        return [239, 68, 68, 230];
    }
    if (truck.speed >= SPEED_WARNING_LIMIT) {
        return [245, 158, 11, 220];
    }
    if (truck.status === 'offline') {
        return [107, 114, 128, 210];
    }
    if (truck.status === 'maintenance') {
        return [139, 92, 246, 220];
    }
    return [16, 185, 129, 215];
}

function getTruckRadius(speed: number): number {
    const clampedSpeed = Math.max(0, Math.min(speed, 130));
    return 5 + (clampedSpeed / 130) * 4;
}

function resolveHeatmapWeight(speed: number, temperature: number, status: string): number {
    const speedFactor = clampUnit(speed / 120);
    const thermalFactor = clampUnit(Math.abs(temperature + 12) / 20);
    let statusBoost = 0;
    if (status === 'alert') {
        statusBoost = 0.4;
    } else if (status === 'maintenance') {
        statusBoost = 0.2;
    }
    return 0.35 + speedFactor * 0.45 + thermalFactor * 0.45 + statusBoost;
}

function resolveHeatmapColorRange(alphaScale: number): RGBA[] {
    return HEATMAP_BASE_COLOR_RANGE.map(([r, g, b, a]) => [
        r,
        g,
        b,
        Math.max(0, Math.min(255, Math.round(a * alphaScale))),
    ]);
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function resolveStaleFactor(ageMs: number): number {
    if (ageMs <= STALE_PACKET_THRESHOLD_MS) return 0;
    return clampUnit((ageMs - STALE_PACKET_THRESHOLD_MS) / STALE_FADE_DURATION_MS);
}

function mixChannel(from: number, to: number, factor: number): number {
    return Math.round(from + (to - from) * factor);
}

function applyStaleVisual(base: RGBA, staleFactor: number): RGBA {
    const [r, g, b, a] = base;
    return [
        mixChannel(r, STALE_COLOR_TARGET[0], staleFactor),
        mixChannel(g, STALE_COLOR_TARGET[1], staleFactor),
        mixChannel(b, STALE_COLOR_TARGET[2], staleFactor),
        mixChannel(a, STALE_TARGET_ALPHA, staleFactor),
    ];
}

function resolveTelemetryTimestampMs(truck: TruckTelemetry, fallback: number): number {
    if (Number.isFinite(truck.timestamp) && truck.timestamp > 0) {
        return truck.timestamp;
    }
    return fallback;
}

function formatStatusLabel(status: string): string {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusPillStyles(status: string): string {
    switch (status) {
        case 'offline':
            return 'background: rgba(239, 68, 68, 0.18); color: rgba(254, 202, 202, 0.98); border: 1px solid rgba(248, 113, 113, 0.4);';
        case 'maintenance':
            return 'background: rgba(139, 92, 246, 0.2); color: rgba(221, 214, 254, 0.98); border: 1px solid rgba(167, 139, 250, 0.45);';
        default:
            return 'background: rgba(16, 185, 129, 0.2); color: rgba(167, 243, 208, 0.98); border: 1px solid rgba(52, 211, 153, 0.45);';
    }
}

function appendMetricRow(root: HTMLElement, label: string, value: string): void {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.gap = '10px';

    const key = document.createElement('span');
    key.textContent = label;
    key.style.fontSize = '11px';
    key.style.textTransform = 'uppercase';
    key.style.letterSpacing = '0.08em';
    key.style.color = 'rgba(148, 163, 184, 0.95)';

    const val = document.createElement('span');
    val.textContent = value;
    val.style.fontSize = '13px';
    val.style.fontWeight = '600';
    val.style.color = 'rgba(226, 232, 240, 0.98)';

    row.append(key, val);
    root.appendChild(row);
}

function createTruckPopupContent(truck: TruckRenderPoint): HTMLElement {
    const card = document.createElement('div');
    card.style.width = '250px';
    card.style.padding = '12px';
    card.style.borderRadius = '14px';
    card.style.color = 'rgba(241, 245, 249, 0.98)';
    card.style.background = 'linear-gradient(145deg, rgba(15, 23, 42, 0.86), rgba(30, 41, 59, 0.7))';
    card.style.border = '1px solid rgba(148, 163, 184, 0.32)';
    card.style.boxShadow = '0 18px 40px rgba(2, 6, 23, 0.45)';
    card.style.backdropFilter = 'blur(12px)';
    (card.style as unknown as Record<string, string>).webkitBackdropFilter = 'blur(12px)';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '10px';
    card.style.opacity = '0';
    card.style.transform = 'translateY(8px) scale(0.985)';
    card.style.willChange = 'transform, opacity';
    card.style.transition = 'opacity 170ms ease-out, transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.gap = '8px';

    const truckId = document.createElement('strong');
    truckId.textContent = truck.id;
    truckId.style.fontSize = '14px';
    truckId.style.letterSpacing = '0.03em';

    const status = document.createElement('span');
    status.textContent = formatStatusLabel(truck.status);
    status.style.fontSize = '11px';
    status.style.fontWeight = '700';
    status.style.padding = '3px 8px';
    status.style.borderRadius = '999px';
    status.style.cssText += statusPillStyles(truck.status);

    header.append(truckId, status);

    const metrics = document.createElement('div');
    metrics.style.display = 'flex';
    metrics.style.flexDirection = 'column';
    metrics.style.gap = '7px';

    appendMetricRow(metrics, 'Driver', truck.driverName || 'N/A');
    appendMetricRow(metrics, 'Speed', `${truck.speed.toFixed(0)} km/h`);
    appendMetricRow(metrics, 'Temp', `${truck.temperature.toFixed(1)}°C`);

    card.append(header, metrics);

    requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
    });

    return card;
}

export class ImperativeMapLayer {
    private map: mapboxgl.Map | null = null;
    private container: HTMLElement | null = null;
    private popup: mapboxgl.Popup | null = null;
    private overlay: MapboxOverlay | null = null;
    private _ready = false;
    private _destroyed = false;
    private lastSyncAt = 0;
    private dataVersion = 0;
    private readonly renderData: TruckRenderPoint[] = [];
    private readonly renderPointById = new Map<string, TruckRenderPoint>();
    private overlayDisabled = false;
    private cinematicWorker: Worker | null = null;
    private selectedTruckId: string | null = null;
    private readonly heatmapTrail: HeatmapPoint[] = [];
    private modeBlend = useIoTStore.getState().showHeatmap ? 1 : 0;
    private heatmapVisibility = this.modeBlend;
    private liveVisibility = 1 - this.modeBlend;
    private modeTransitionStartedAt = 0;
    private modeTransitionFrom = this.modeBlend;
    private modeTransitionTo = this.modeBlend;
    private lastSentModeBlend = -1;
    private lastSentModeTarget: 'live' | 'historical' =
        this.modeBlend >= 0.5 ? 'historical' : 'live';
    private cacheHydrationRequested = false;
    private readonly cachedTruckMap = new Map<string, TruckTelemetry>();
    private lastCachePersistAt = 0;
    private usingFallbackStyle = false;
    private readonly mapErrorHandler = (event: mapboxgl.ErrorEvent): void => {
        if (!this.map || this._destroyed || this.usingFallbackStyle) return;

        const errorLike = event.error as { status?: number; message?: string } | undefined;
        const sourceId = (event as { sourceId?: string }).sourceId ?? '';
        const message = `${errorLike?.message ?? ''} ${sourceId}`.toLowerCase();
        const isUnauthorized = errorLike?.status === 401
            || message.includes('401')
            || message.includes('unauthorized')
            || message.includes('access token')
            || message.includes('forbidden');

        if (!isUnauthorized) return;

        this.usingFallbackStyle = true;
        console.warn('Mapbox style request unauthorized. Falling back to open map style.');
        this.map.setStyle(OPEN_STYLE_URL);
        this.map.once('style.load', () => {
            this.installDeckOverlay();
            this.refreshDeckLayer();
        });
    };

    get ready(): boolean {
        return this._ready;
    }

    /** Mount the map into a DOM element */
    init(container: HTMLElement, style: Theme = 'dark'): void {
        if (this._destroyed) return;
        if (globalThis.window === undefined) return;
        this.container = container;

        if (!E2E_LIGHT_MODE && MAPBOX_TOKEN) {
            mapboxgl.accessToken = MAPBOX_TOKEN;
        } else if (!E2E_LIGHT_MODE) {
            console.warn('NEXT_PUBLIC_MAPBOX_TOKEN missing. Using public open style fallback.');
        }

        const resolvedStyle = resolveMapStyle(style);
        this.usingFallbackStyle = resolvedStyle === OPEN_STYLE_URL;

        try {
            this.map = createMapInstance(container, resolvedStyle);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const needsTokenFallback = message.toLowerCase().includes('access token');
            if (!needsTokenFallback) throw error;

            this.map = createMapInstance(container, OPEN_STYLE_URL);
        }

        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
        this.map.on('error', this.mapErrorHandler);

        this.map.on('load', () => {
            if (!this.map || this._destroyed) return;
            this.installDeckOverlay();
            this._ready = true;
            this.refreshDeckLayer();
        });
    }

    private installDeckOverlay(): void {
        if (!this.map || this.overlayDisabled) return;
        if (this.overlay) {
            this.map.removeControl(this.overlay);
            this.overlay.finalize();
            this.overlay = null;
        }
        try {
            this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
            this.map.addControl(this.overlay);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.toLowerCase().includes('touchaction')) {
                this.overlayDisabled = true;
                this.overlay = null;
                console.warn('Deck overlay disabled due to TouchAction runtime mismatch.');
                return;
            }
            throw error;
        }
    }

    private buildLayer(): ScatterplotLayer<TruckRenderPoint> {
        const liveAlphaScale = this.liveVisibility;

        return new ScatterplotLayer<TruckRenderPoint>({
            id: 'trucks-scatter',
            data: this.renderData,
            pickable: true,
            stroked: true,
            filled: true,
            radiusUnits: 'pixels',
            getPosition: (d) => d.position,
            getFillColor: (d) => [
                d.color[0],
                d.color[1],
                d.color[2],
                Math.round(d.color[3] * liveAlphaScale),
            ],
            getLineColor: [255, 255, 255, 180],
            getLineWidth: 1,
            lineWidthUnits: 'pixels',
            getRadius: (d) => d.radius,
            radiusMinPixels: 4,
            radiusMaxPixels: 14,
            updateTriggers: {
                getPosition: this.dataVersion,
                getFillColor: [this.dataVersion, Math.round(liveAlphaScale * 100)],
                getRadius: this.dataVersion,
            },
            onClick: (info: PickingInfo<TruckRenderPoint>) => {
                this.showTruckPopup(info);
            },
            onHover: (info: PickingInfo<TruckRenderPoint>) => {
                if (!this.map) return;
                this.map.getCanvas().style.cursor = info.object ? 'pointer' : '';
            },
        });
    }

    private buildSelectedGlowLayer(nowMs: number): ScatterplotLayer<TruckRenderPoint> | null {
        const storeSelectionId = useCameraSelectionStore.getState().selectedTruckId;
        const selectedId = storeSelectionId ?? this.selectedTruckId;
        if (!selectedId) return null;

        const selected = this.renderPointById.get(selectedId);
        if (!selected) return null;

        const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.008);
        const haloRadius = selected.radius + 5 + pulse * 5;
        const haloAlpha = Math.round((110 + pulse * 110) * this.liveVisibility);

        return new ScatterplotLayer<TruckRenderPoint>({
            id: 'trucks-selected-glow',
            data: [selected],
            pickable: false,
            stroked: true,
            filled: false,
            radiusUnits: 'pixels',
            lineWidthUnits: 'pixels',
            lineWidthMinPixels: 2,
            lineWidthMaxPixels: 4,
            radiusMinPixels: 10,
            radiusMaxPixels: 28,
            getPosition: (d) => d.position,
            getRadius: () => haloRadius,
            getLineColor: () => [GLOW_COLOR[0], GLOW_COLOR[1], GLOW_COLOR[2], haloAlpha],
            updateTriggers: {
                getPosition: this.dataVersion,
                getRadius: [this.dataVersion, haloRadius],
                getLineColor: [this.dataVersion, haloAlpha],
            },
        });
    }

    private buildHeatmapLayer(): HeatmapLayer<HeatmapPoint> | null {
        if (this.heatmapTrail.length === 0) return null;
        if (this.heatmapVisibility < HEATMAP_ALPHA_EPSILON) return null;

        return new HeatmapLayer<HeatmapPoint>({
            id: 'trucks-heatmap',
            data: this.heatmapTrail,
            pickable: false,
            aggregation: 'SUM',
            getPosition: (point) => point.position,
            getWeight: (point) => point.weight,
            radiusPixels: 44,
            intensity: 1,
            threshold: 0.04,
            colorRange: resolveHeatmapColorRange(this.heatmapVisibility),
            updateTriggers: {
                getWeight: this.dataVersion,
                colorRange: Math.round(this.heatmapVisibility * 100),
            },
        });
    }

    private buildClusterLayer(): ScreenGridLayer<TruckRenderPoint> {
        return new ScreenGridLayer<TruckRenderPoint>({
            id: 'trucks-screen-grid-cluster',
            data: this.renderData,
            pickable: false,
            cellSizePixels: 22,
            opacity: this.liveVisibility,
            getPosition: (d) => d.position,
            getWeight: (d) => 1 + clampUnit(d.speed / 120) + clampUnit(Math.abs(d.temperature + 12) / 20),
            colorRange: [
                [8, 47, 73, 70],
                [14, 116, 144, 92],
                [6, 182, 212, 116],
                [34, 197, 94, 150],
                [250, 204, 21, 184],
                [249, 115, 22, 212],
                [239, 68, 68, 236],
            ],
            updateTriggers: {
                getPosition: this.dataVersion,
                getWeight: this.dataVersion,
                opacity: Math.round(this.liveVisibility * 100),
            },
        });
    }

    private loadCachedFleetIfNeeded(): void {
        if (this.cacheHydrationRequested) return;
        this.cacheHydrationRequested = true;

        void readFleetSnapshot().then((cached) => {
            this.cacheHydrationRequested = false;
            if (cached.length === 0) return;

            const liveTrucks = getTruckMap();
            const { connectionStatus } = useIoTStore.getState();
            const browserOffline = globalThis.navigator.onLine === false;
            if (liveTrucks.size > 0 || (connectionStatus === 'connected' && !browserOffline)) {
                return;
            }

            this.cachedTruckMap.clear();
            for (const truck of cached) {
                this.cachedTruckMap.set(truck.id, truck);
            }
            this.refreshDeckLayer();
        });
    }

    private persistLiveFleetSnapshot(liveTrucks: ReadonlyMap<string, TruckTelemetry>, now: number): void {
        if (liveTrucks.size === 0) return;
        if (now - this.lastCachePersistAt < CACHE_PERSIST_INTERVAL_MS) return;

        this.lastCachePersistAt = now;
        const snapshot = Array.from(liveTrucks.values());
        void writeFleetSnapshot(snapshot);
    }

    private trimHeatmapTrail(now: number): void {
        while (this.heatmapTrail.length > 0) {
            const head = this.heatmapTrail[0];
            if (now - head.at <= HEATMAP_POINT_TTL_MS && this.heatmapTrail.length <= HEATMAP_HISTORY_LIMIT) {
                break;
            }
            this.heatmapTrail.shift();
        }
    }

    private pushHeatmapPoint(position: Position, weight: number, now: number): void {
        this.heatmapTrail.push({
            position: [position[0], position[1]],
            weight,
            at: now,
        });
    }

    private resolveTruckSource(): ReadonlyMap<string, TruckTelemetry> {
        const liveTrucks = getTruckMap();
        if (liveTrucks.size > 0) {
            this.cachedTruckMap.clear();
            return liveTrucks;
        }

        const { connectionStatus } = useIoTStore.getState();
        const browserOffline = globalThis.navigator.onLine === false;
        const disconnected = connectionStatus !== 'connected' || browserOffline;

        if (disconnected && this.cachedTruckMap.size === 0) {
            this.loadCachedFleetIfNeeded();
        }

        return disconnected ? this.cachedTruckMap : liveTrucks;
    }

    private updateHeatmapFade(): void {
        const now = performance.now();
        const targetBlend = useIoTStore.getState().showHeatmap ? 1 : 0;

        if (targetBlend !== this.modeTransitionTo) {
            this.modeTransitionFrom = this.modeBlend;
            this.modeTransitionTo = targetBlend;
            this.modeTransitionStartedAt = now;
        }

        if (this.modeBlend !== this.modeTransitionTo) {
            const elapsed = now - this.modeTransitionStartedAt;
            const rawProgress = Math.max(0, Math.min(1, elapsed / MODE_TRANSITION_DURATION_MS));
            const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
            this.modeBlend = this.modeTransitionFrom
                + (this.modeTransitionTo - this.modeTransitionFrom) * easedProgress;

            if (rawProgress >= 1) {
                this.modeBlend = this.modeTransitionTo;
            }
        }

        this.heatmapVisibility = this.modeBlend;
        this.liveVisibility = 1 - this.modeBlend;
        this.syncCinematicModeBlend();
    }

    private syncCinematicModeBlend(): void {
        if (!this.cinematicWorker) return;

        const targetMode: 'live' | 'historical' = this.modeTransitionTo >= 0.5 ? 'historical' : 'live';
        const blendDelta = Math.abs(this.modeBlend - this.lastSentModeBlend);
        const modeChanged = targetMode !== this.lastSentModeTarget;

        if (!modeChanged && blendDelta < 0.03) return;

        const payload: CinematicMapModePayload = {
            mode: targetMode,
            blend: this.modeBlend,
        };

        this.cinematicWorker.postMessage({
            type: 'cinematic:map-mode',
            payload,
        });

        this.lastSentModeBlend = this.modeBlend;
        this.lastSentModeTarget = targetMode;
    }

    private showTruckPopup(info: PickingInfo<TruckRenderPoint>): void {
        if (!this.map || !info.object || !info.coordinate) return;

        const [lng, lat] = info.coordinate as [number, number];
        const truck = info.object;
        this.popup?.remove();

        this.popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '300px', className: 'truck-popup-glass' })
            .setLngLat([lng, lat])
            .setDOMContent(createTruckPopupContent(truck))
            .addTo(this.map);

        // Trigger cinematic camera tracking to the selected truck
        this.selectTruckForCinematicView(truck.id, lat, lng);
    }

    private syncFromTransientStore(): void {
        const trucks = this.resolveTruckSource();
        const now = performance.now();
        const seen = new Set<string>();

        this.persistLiveFleetSnapshot(getTruckMap(), now);

        trucks.forEach((truck) => {
            seen.add(truck.id);
            const existingPoint = this.renderPointById.get(truck.id);
            const nextPosition: Position = [truck.lng, truck.lat];
            const packetTimestamp = resolveTelemetryTimestampMs(truck, now);
            const nextBaseColor = getTruckColor(truck);

            if (existingPoint) {
                const [targetLng, targetLat] = existingPoint.targetPosition;
                const moved =
                    Math.abs(targetLng - nextPosition[0]) > POSITION_EPSILON
                    || Math.abs(targetLat - nextPosition[1]) > POSITION_EPSILON;

                const hasFreshPacket = packetTimestamp > existingPoint.lastPacketAt;

                if (moved) {
                    existingPoint.startPosition = [...existingPoint.position] as Position;
                    existingPoint.targetPosition = nextPosition;
                    existingPoint.lerpStartAt = now;
                    existingPoint.lerpDurationMs = Math.min(
                        LERP_MAX_DURATION_MS,
                        Math.max(
                            LERP_MIN_DURATION_MS,
                            (packetTimestamp - existingPoint.lastPacketAt) * 0.9 || LERP_BASE_DURATION_MS,
                        ),
                    );
                }

                if (hasFreshPacket) {
                    existingPoint.lastPacketAt = packetTimestamp;
                }
                existingPoint.speed = truck.speed;
                existingPoint.temperature = truck.temperature;
                existingPoint.driverName = truck.driverName;
                existingPoint.status = truck.status;
                existingPoint.baseColor = nextBaseColor;
                this.pushHeatmapPoint(nextPosition, resolveHeatmapWeight(truck.speed, truck.temperature, truck.status), now);

                const staleFactor = resolveStaleFactor(now - existingPoint.lastPacketAt);
                existingPoint.color = applyStaleVisual(nextBaseColor, staleFactor);
                existingPoint.radius = getTruckRadius(truck.speed);
                return;
            }

            const initialPacketTimestamp = resolveTelemetryTimestampMs(truck, now);
            const initialStaleFactor = resolveStaleFactor(now - initialPacketTimestamp);

            this.renderPointById.set(truck.id, {
                id: truck.id,
                position: [...nextPosition] as Position,
                startPosition: [...nextPosition] as Position,
                targetPosition: [...nextPosition] as Position,
                lerpStartAt: now,
                lerpDurationMs: LERP_BASE_DURATION_MS,
                lastPacketAt: initialPacketTimestamp,
                speed: truck.speed,
                temperature: truck.temperature,
                driverName: truck.driverName,
                status: truck.status,
                baseColor: nextBaseColor,
                color: applyStaleVisual(nextBaseColor, initialStaleFactor),
                radius: getTruckRadius(truck.speed),
            });

            this.pushHeatmapPoint(nextPosition, resolveHeatmapWeight(truck.speed, truck.temperature, truck.status), now);
        });

        for (const [truckId] of this.renderPointById) {
            if (seen.has(truckId)) continue;
            this.renderPointById.delete(truckId);
        }

        this.renderData.length = 0;
        this.renderData.push(...this.renderPointById.values());

        for (const point of this.renderData) {
            const elapsed = now - point.lerpStartAt;
            if (elapsed > 0) {
                if (elapsed >= point.lerpDurationMs) {
                    point.position[0] = point.targetPosition[0];
                    point.position[1] = point.targetPosition[1];
                } else {
                    const progress = elapsed / point.lerpDurationMs;
                    point.position[0] =
                        point.startPosition[0]
                        + (point.targetPosition[0] - point.startPosition[0]) * progress;
                    point.position[1] =
                        point.startPosition[1]
                        + (point.targetPosition[1] - point.startPosition[1]) * progress;
                }
            }

            const staleFactor = resolveStaleFactor(now - point.lastPacketAt);
            point.color = applyStaleVisual(point.baseColor, staleFactor);
            point.radius = getTruckRadius(point.speed) * (1 - staleFactor * 0.08);
        }

        this.trimHeatmapTrail(now);
        this.updateHeatmapFade();
        this.dataVersion += 1;
    }

    private refreshDeckLayer(): void {
        const now = performance.now();
        this.syncFromTransientStore();
        if (!this.overlay) return;
        const layers: Array<
            ScatterplotLayer<TruckRenderPoint>
            | ScreenGridLayer<TruckRenderPoint>
            | HeatmapLayer<HeatmapPoint>
        > = [];
        const useClusterLayer = this.renderData.length >= TRUCK_CLUSTER_THRESHOLD;

        if (this.liveVisibility > OPACITY_EPSILON) {
            if (useClusterLayer) {
                layers.push(this.buildClusterLayer());
            } else {
                layers.push(this.buildLayer());
            }
        }

        const heatmapLayer = this.buildHeatmapLayer();
        if (heatmapLayer) {
            layers.push(heatmapLayer);
        }

        const glowLayer = this.buildSelectedGlowLayer(now);
        if (glowLayer && this.liveVisibility > OPACITY_EPSILON && !useClusterLayer) {
            layers.push(glowLayer);
        }
        this.overlay.setProps({
            layers,
        });
    }

    /** Called by frame scheduler — reads directly from transient store */
    update(_dt: number): void {
        if (!this._ready || this._destroyed) return;
        const now = performance.now();
        if (now - this.lastSyncAt < UPDATE_INTERVAL_MS) return;
        this.lastSyncAt = now;
        this.refreshDeckLayer();
    }

    /** Change map style */
    setStyle(style: Theme): void {
        if (!this.map) return;
        const nextStyle = resolveMapStyle(style);
        this.usingFallbackStyle = nextStyle === OPEN_STYLE_URL;
        this.map.setStyle(nextStyle);
        this.map.once('style.load', () => {
            this.installDeckOverlay();
            this.refreshDeckLayer();
        });
    }

    /** Fly to a specific truck */
    flyToTruck(truckId: string): void {
        const truck = getTruckMap().get(truckId);
        if (!truck || !this.map) return;
        this.map.flyTo({
            center: [truck.lng, truck.lat],
            zoom: 15,
            duration: 1500,
        });
    }

    /** Register the cinematic worker for camera tracking */
    setCinematicWorker(worker: Worker | null): void {
        this.cinematicWorker = worker;
    }

    /** Select a truck for cinematic camera tracking */
    private selectTruckForCinematicView(truckId: string, latitude: number, longitude: number): void {
        useCameraSelectionStore.getState().selectTruck(truckId, latitude, longitude);
        if (!this.cinematicWorker) return;
        if (this.selectedTruckId === truckId) return;

        this.selectedTruckId = truckId;

        const payload: CinematicCameraFlyToPayload = {
            truckId,
            targetLatitude: latitude,
            targetLongitude: longitude,
            durationMs: 1200,
        };

        this.cinematicWorker.postMessage({
            type: 'cinematic:camera-flyto',
            payload,
        });
    }

    /** Deselect truck and return camera to overview */
    deselectTruck(): void {
        useCameraSelectionStore.getState().deselectTruck();
        if (!this.cinematicWorker) return;
        if (this.selectedTruckId === null) return;

        this.selectedTruckId = null;
        this.popup?.remove();

        const payload: CinematicCameraFlyToPayload = {
            truckId: null,
            targetLatitude: null,
            targetLongitude: null,
            durationMs: 0,
        };

        this.cinematicWorker.postMessage({
            type: 'cinematic:camera-flyto',
            payload,
        });
    }

    /** Fit all trucks in view */
    fitAll(): void {
        if (!this.map) return;
        const trucks = getTruckMap();
        if (trucks.size === 0) return;

        const bounds = new mapboxgl.LngLatBounds();
        trucks.forEach((truck) => bounds.extend([truck.lng, truck.lat]));
        this.map.fitBounds(bounds, { padding: 60, duration: 1000 });
    }

    resize(): void {
        this.map?.resize();
    }

    destroy(): void {
        this._destroyed = true;
        this._ready = false;
        this.map?.off('error', this.mapErrorHandler);
        this.heatmapTrail.length = 0;
        this.cachedTruckMap.clear();
        this.cacheHydrationRequested = false;
        this.popup?.remove();
        if (this.map && this.overlay) {
            this.map.removeControl(this.overlay);
        }
        this.overlay?.finalize();
        this.overlay = null;
        this.map?.remove();
        this.map = null;
    }
}
