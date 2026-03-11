/* ================================================================
 *  Ice-Truck IoT Engine — Imperative Mapbox GL Layer
 *  ──────────────────────────────────────────────────
 *  • Initializes a Mapbox GL JS map imperatively (no React tree)
 *  • Uses GeoJSON source + symbol layer for truck markers
 *  • Updates marker positions via setData() — zero React renders
 *  • Supports clustering at low zoom levels
 *  • Frame scheduler drives the update loop
 * ================================================================ */

import mapboxgl from 'mapbox-gl';
import type { TruckTelemetry } from './types';
import { getTruckMap } from './store';

// Mapbox token — uses env var or a placeholder for dev
const MAPBOX_TOKEN =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    'pk.eyJ1IjoiaWNlLXRydWNrLWRldiIsImEiOiJjbHRlc3QifQ.demo';

const MAP_STYLES: Record<string, string> = {
    dark: 'mapbox://styles/mapbox/dark-v11',
    neon: 'mapbox://styles/mapbox/dark-v11',
    ocean: 'mapbox://styles/mapbox/dark-v11',
    forest: 'mapbox://styles/mapbox/dark-v11',
};

export class ImperativeMapLayer {
    private map: mapboxgl.Map | null = null;
    private container: HTMLElement | null = null;
    private readonly sourceId = 'trucks-source';
    private readonly layerId = 'trucks-layer';
    private readonly clusterLayerId = 'trucks-cluster';
    private readonly clusterCountId = 'trucks-cluster-count';
    private popup: mapboxgl.Popup | null = null;
    private _ready = false;
    private _destroyed = false;

    get ready(): boolean {
        return this._ready;
    }

    /** Mount the map into a DOM element */
    init(container: HTMLElement, style: string = 'dark'): void {
        if (this._destroyed) return;
        this.container = container;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        this.map = new mapboxgl.Map({
            container,
            style: MAP_STYLES[style] || MAP_STYLES.dark,
            center: [100.5018, 13.7563], // Bangkok
            zoom: 10,
            antialias: true,
            maxZoom: 18,
            minZoom: 3,
            attributionControl: false,
            fadeDuration: 0,        // no fade = better perf
            trackResize: true,
        });

        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        this.map.on('load', () => {
            if (!this.map || this._destroyed) return;
            this.setupLayers();
            this._ready = true;
        });

        // Click on truck marker
        this.map.on('click', this.layerId, (e) => {
            if (!e.features?.length) return;
            const f = e.features[0];
            const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
            const props = f.properties;

            this.popup?.remove();
            if (!this.map) return;
            this.popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '300px' })
                .setLngLat(coords)
                .setHTML(
                    `<div class="p-2 text-sm">
            <strong>${props?.id}</strong><br/>
            Driver: ${props?.driverName}<br/>
            Speed: ${props?.speed?.toFixed?.(0) ?? props?.speed} km/h<br/>
            Temp: ${props?.temperature?.toFixed?.(1) ?? props?.temperature}°C<br/>
            Status: <span class="font-semibold">${props?.status}</span>
          </div>`,
                )
                .addTo(this.map);
        });

        // Cluster click → zoom in
        this.map.on('click', this.clusterLayerId, (e) => {
            if (!this.map) return;
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: [this.clusterLayerId],
            });
            if (!features.length) return;
            const clusterId = features[0].properties?.cluster_id;
            const src = this.map.getSource(this.sourceId);
            if (!src || !('getClusterExpansionZoom' in src)) return;
            src.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err || !this.map) return;
                this.map.easeTo({
                    center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
                    zoom: zoom ?? 14,
                });
            });
        });

        // Cursor style
        this.map.on('mouseenter', this.layerId, () => {
            if (this.map) this.map.getCanvas().style.cursor = 'pointer';
        });
        this.map.on('mouseleave', this.layerId, () => {
            if (this.map) this.map.getCanvas().style.cursor = '';
        });
    }

    private setupLayers(): void {
        if (!this.map) return;

        // Add empty GeoJSON source with clustering
        this.map.addSource(this.sourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
        });

        // Cluster circles
        this.map.addLayer({
            id: this.clusterLayerId,
            type: 'circle',
            source: this.sourceId,
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step', ['get', 'point_count'],
                    '#06b6d4', 10,
                    '#8b5cf6', 30,
                    '#ef4444',
                ],
                'circle-radius': [
                    'step', ['get', 'point_count'],
                    20, 10,
                    30, 30,
                    40,
                ],
                'circle-opacity': 0.8,
                'circle-stroke-width': 2,
                'circle-stroke-color': 'rgba(255,255,255,0.3)',
            },
        });

        // Cluster count labels
        this.map.addLayer({
            id: this.clusterCountId,
            type: 'symbol',
            source: this.sourceId,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 14,
            },
            paint: { 'text-color': '#ffffff' },
        });

        // Individual truck markers (unclustered)
        this.map.addLayer({
            id: this.layerId,
            type: 'circle',
            source: this.sourceId,
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': [
                    'match', ['get', 'status'],
                    'active', '#10b981',
                    'idle', '#f59e0b',
                    'offline', '#6b7280',
                    'maintenance', '#8b5cf6',
                    'alert', '#ef4444',
                    '#06b6d4',
                ],
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': 'rgba(255,255,255,0.5)',
                'circle-opacity': 0.9,
            },
        });
    }

    /** Called by the frame scheduler every frame — reads from mutable truck map */
    update(_dt: number): void {
        if (!this._ready || !this.map || this._destroyed) return;

        const trucks = getTruckMap();
        const features: GeoJSON.Feature[] = [];

        trucks.forEach((t: TruckTelemetry) => {
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
                properties: {
                    id: t.id,
                    status: t.status,
                    speed: t.speed,
                    temperature: t.temperature,
                    driverName: t.driverName,
                    heading: t.heading,
                },
            });
        });

        const src = this.map.getSource(this.sourceId);
        if (src) {
            (src as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
        }
    }

    /** Change map style */
    setStyle(style: string): void {
        if (!this.map) return;
        this.map.setStyle(MAP_STYLES[style] || MAP_STYLES.dark);
        // Re-add layers after style change
        this.map.once('style.load', () => this.setupLayers());
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
        trucks.forEach((t) => bounds.extend([t.lng, t.lat]));
        this.map.fitBounds(bounds, { padding: 60, duration: 1000 });
    }

    /** Resize (call when container size changes) */
    resize(): void {
        this.map?.resize();
    }

    /** Cleanup */
    destroy(): void {
        this._destroyed = true;
        this._ready = false;
        this.popup?.remove();
        this.map?.remove();
        this.map = null;
    }
}
