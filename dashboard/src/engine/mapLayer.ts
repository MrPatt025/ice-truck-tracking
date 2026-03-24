/* ================================================================
 *  Ice-Truck IoT Engine — Imperative Map Layer (Mapbox + deck.gl)
 *  ────────────────────────────────────────────────────────────────
 *  • Reads truck coordinates directly from transient Zustand map
 *  • Renders via deck.gl ScatterplotLayer (GPU instancing)
 *  • Color-codes trucks by temperature / speed risk
 *  • Zero React involvement in real-time marker updates
 * ================================================================ */

import mapboxgl from 'mapbox-gl';
import { ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Theme, TruckTelemetry } from './types';
import { getTruckMap } from './store';

type RGBA = [number, number, number, number];
type Position = [number, number];

interface TruckRenderPoint {
    id: string;
    position: Position;
    speed: number;
    temperature: number;
    driverName: string;
    status: string;
    color: RGBA;
    radius: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
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

function resolveMapStyle(theme: Theme): string {
    if (!MAPBOX_TOKEN) return OPEN_STYLE_URL;
    return MAPBOX_STYLES[theme] ?? MAPBOX_STYLES.dark;
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

    get ready(): boolean {
        return this._ready;
    }

    /** Mount the map into a DOM element */
    init(container: HTMLElement, style: Theme = 'dark'): void {
        if (this._destroyed) return;
        this.container = container;

        if (MAPBOX_TOKEN) {
            mapboxgl.accessToken = MAPBOX_TOKEN;
        } else {
            console.warn('NEXT_PUBLIC_MAPBOX_TOKEN missing. Using public open style fallback.');
        }

        this.map = new mapboxgl.Map({
            container,
            style: resolveMapStyle(style),
            center: [100.5018, 13.7563],
            zoom: 10,
            antialias: true,
            maxZoom: 18,
            minZoom: 3,
            attributionControl: false,
            fadeDuration: 0,
            trackResize: true,
        });

        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        this.map.on('load', () => {
            if (!this.map || this._destroyed) return;
            this.installDeckOverlay();
            this._ready = true;
            this.refreshDeckLayer();
        });
    }

    private installDeckOverlay(): void {
        if (!this.map) return;
        if (this.overlay) {
            this.map.removeControl(this.overlay);
            this.overlay.finalize();
            this.overlay = null;
        }
        this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
        this.map.addControl(this.overlay);
    }

    private buildLayer(): ScatterplotLayer<TruckRenderPoint> {
        return new ScatterplotLayer<TruckRenderPoint>({
            id: 'trucks-scatter',
            data: this.renderData,
            pickable: true,
            stroked: true,
            filled: true,
            radiusUnits: 'pixels',
            getPosition: (d) => d.position,
            getFillColor: (d) => d.color,
            getLineColor: [255, 255, 255, 180],
            getLineWidth: 1,
            lineWidthUnits: 'pixels',
            getRadius: (d) => d.radius,
            radiusMinPixels: 4,
            radiusMaxPixels: 14,
            updateTriggers: {
                getPosition: this.dataVersion,
                getFillColor: this.dataVersion,
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

    private showTruckPopup(info: PickingInfo<TruckRenderPoint>): void {
        if (!this.map || !info.object || !info.coordinate) return;

        const [lng, lat] = info.coordinate as [number, number];
        const truck = info.object;
        this.popup?.remove();

        this.popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '300px' })
            .setLngLat([lng, lat])
            .setHTML(
                `<div class="p-2 text-sm">`
                + `<strong>${truck.id}</strong><br/>`
                + `Driver: ${truck.driverName || 'N/A'}<br/>`
                + `Speed: ${truck.speed.toFixed(0)} km/h<br/>`
                + `Temp: ${truck.temperature.toFixed(1)}°C<br/>`
                + `Status: <span class="font-semibold">${truck.status}</span>`
                + `</div>`,
            )
            .addTo(this.map);
    }

    private syncFromTransientStore(): void {
        const trucks = getTruckMap();
        this.renderData.length = 0;

        trucks.forEach((truck) => {
            this.renderData.push({
                id: truck.id,
                position: [truck.lng, truck.lat],
                speed: truck.speed,
                temperature: truck.temperature,
                driverName: truck.driverName,
                status: truck.status,
                color: getTruckColor(truck),
                radius: getTruckRadius(truck.speed),
            });
        });

        this.dataVersion += 1;
    }

    private refreshDeckLayer(): void {
        this.syncFromTransientStore();
        if (!this.overlay) return;
        this.overlay.setProps({
            layers: [this.buildLayer()],
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
        this.map.setStyle(resolveMapStyle(style));
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
