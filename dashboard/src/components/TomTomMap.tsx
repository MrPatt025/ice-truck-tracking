// dashboard/src/components/TomTomMap.tsx
'use client';

import type { JSX } from 'react';
import { useEffect, useRef } from 'react';

/** ----- Types ----- */
export type TruckPoint = Readonly<{
  id: number | string;
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  driver_name?: string;
  speed?: number; // km/h
  temp?: number; // °C
}>;

export type TomTomMapProps = Readonly<{
  trucks: ReadonlyArray<TruckPoint>;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  autoFit?: boolean;
  cluster?: boolean;
}>;

/** ----- Minimal TT SDK shapes ----- */
type BoundsLike = {
  extend(lnglat: [number, number]): void;
  isEmpty(): boolean;
};
type PopupLike = { setHTML(html: string): PopupLike };
type SourceLike = { setData(data: any): void };
type MapLike = {
  remove(): void;
  resize(): void;
  fitBounds(
    bounds: BoundsLike,
    options?: { padding?: number; maxZoom?: number; duration?: number },
  ): void;
  addSource(id: string, spec: any): void;
  getSource(id: string): SourceLike | undefined;
  addLayer(layer: any, beforeId?: string): void;
  getLayer(id: string): any;
  removeLayer(id: string): void;
  // TomTom SDK v6 mirrors the Mapbox GL style API for sources/layers
};
type MarkerLike = {
  setLngLat(lnglat: [number, number]): MarkerLike;
  addTo(map: MapLike): MarkerLike;
  setPopup(popup: PopupLike): MarkerLike;
  remove(): void;
};
type MapOptions = {
  key: string;
  container: HTMLElement;
  center: [number, number];
  zoom: number;
};
type TTGlobal = {
  map(opts: MapOptions): MapLike;
  Marker: new (opts: { element: HTMLElement }) => MarkerLike;
  Popup: new (opts?: { offset?: number }) => PopupLike;
  LngLatBounds: new () => BoundsLike;
};

declare global {
  interface Window {
    tt?: TTGlobal;
  }
}

async function ensureTomTomLoaded(version = '6.25.0'): Promise<TTGlobal> {
  if (typeof window === 'undefined') throw new Error('no-window');
  if (window.tt) return window.tt;

  // inject CSS once
  const cssHref = `https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/${version}/maps/maps.css`;
  let _cssLoaded = false;
  const existing = document.querySelector(
    `link[href='${cssHref}']`,
  ) as HTMLLinkElement | null;
  if (existing) {
    _cssLoaded = true; // assume existing link is already applied
  } else {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    _cssLoaded = await new Promise<boolean>((resolve) => {
      link.onload = () => resolve(true);
      link.onerror = () => resolve(false);
      // Fallback resolve after 1500ms to avoid blocking forever in dev
      setTimeout(() => resolve(true), 1500);
      document.head.appendChild(link);
    });
  }

  // load JS
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/${version}/maps/maps-web.min.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TomTom SDK'));
    document.body.appendChild(script);
  });

  if (!window.tt) throw new Error('TomTom SDK not available');
  return window.tt;
}

/** ----- Utils (pure) ----- */
function getLngLat(t: TruckPoint): [number, number] | null {
  const lat = typeof t.lat === 'number' ? t.lat : t.latitude;
  const lon = typeof t.lon === 'number' ? t.lon : t.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return [lon, lat];
}
function escHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ]!,
  );
}
function buildPopupHtml(t: TruckPoint): string {
  const hasDriver =
    typeof t.driver_name === 'string' && t.driver_name.trim().length > 0;
  const hasSpeed = typeof t.speed === 'number' && Number.isFinite(t.speed);
  const hasTemp = typeof t.temp === 'number' && Number.isFinite(t.temp);
  if (!hasDriver && !hasSpeed && !hasTemp) return '';
  return `<div style="font:12px/1.35 system-ui,-apple-system,Segoe UI,Roboto">
    ${hasDriver ? `<div><strong>Driver:</strong> ${escHtml(t.driver_name!)}</div>` : ''}
    ${hasSpeed ? `<div>⏱ ${Math.round(t.speed!)} km/h</div>` : ''}
    ${hasTemp ? `<div>🌡 ${t.temp!.toFixed(1)}°C</div>` : ''}
  </div>`;
}
function signatureFor(trucks: ReadonlyArray<TruckPoint>): string {
  return trucks
    .map((t) => {
      const p = getLngLat(t);
      return p ? `${String(t.id)}:${p[0].toFixed(4)},${p[1].toFixed(4)}` : '';
    })
    .filter(Boolean)
    .sort()
    .join('|');
}

/** GeoJSON helpers (pure) */
type FeaturePoint = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, any>;
};
type FeatureLine = {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  properties: Record<string, any>;
};
type FeatureCollection = {
  type: 'FeatureCollection';
  features: Array<FeaturePoint | FeatureLine>;
};

function cellDegForZoom(z: number): number {
  const zoom = Math.max(0, Math.min(22, z));
  if (zoom >= 14) return 0.02; // ~2km cells
  if (zoom >= 12) return 0.05;
  if (zoom >= 10) return 0.1;
  if (zoom >= 8) return 0.25;
  if (zoom >= 6) return 0.5;
  return 1.0;
}

type BuiltCluster = {
  id: string;
  lngLat: [number, number];
  count: number;
  sample?: TruckPoint;
};

function buildClusters(
  trucks: ReadonlyArray<TruckPoint>,
  zoom: number,
): BuiltCluster[] {
  const cellDeg = cellDegForZoom(zoom);
  type Acc = {
    key: string;
    count: number;
    lng: number;
    lat: number;
    ids: string[];
    sample?: TruckPoint;
  };
  const acc = new Map<string, Acc>();
  for (const t of trucks) {
    const p = getLngLat(t);
    if (!p) continue;
    const [lng, lat] = p;
    const cx = Math.floor(lng / cellDeg);
    const cy = Math.floor(lat / cellDeg);
    const k = `${cx},${cy}`;
    const id = String(t.id);
    let c = acc.get(k);
    if (!c) {
      c = { key: k, count: 0, lng: 0, lat: 0, ids: [], sample: t };
      acc.set(k, c);
    }
    c.count += 1;
    c.lng += lng;
    c.lat += lat;
    c.ids.push(id);
  }
  const out: BuiltCluster[] = [];
  for (const c of acc.values()) {
    const avg: [number, number] = [c.lng / c.count, c.lat / c.count];
    const cid = c.count > 1 ? `cluster:${c.key}` : (c.ids[0] ?? `pt:${c.key}`);
    const base = { id: cid, lngLat: avg, count: c.count } as BuiltCluster;
    if (c.sample) {
      (base as any).sample = c.sample;
    }
    out.push(base);
  }
  return out;
}

// Optional workerized clustering for large datasets (feature-flagged)
async function buildClustersAsync(
  trucks: ReadonlyArray<TruckPoint>,
  zoom: number,
): Promise<BuiltCluster[]> {
  try {
    if (
      typeof window === 'undefined' ||
      typeof Worker === 'undefined' ||
      process.env.NEXT_PUBLIC_MAP_WORKER !== '1'
    ) {
      return buildClusters(trucks, zoom);
    }
    const code = `
      onmessage = (e) => {
        const { trucks, zoom } = e.data;
        const cellDeg = (z) => { z = Math.max(0, Math.min(22, z)); if (z >= 14) return 0.02; if (z >= 12) return 0.05; if (z >= 10) return 0.1; if (z >= 8) return 0.25; if (z >= 6) return 0.5; return 1.0; };
        const cd = cellDeg(zoom);
        const acc = new Map();
        for (const t of trucks) {
          const lat = typeof t.lat === 'number' ? t.lat : t.latitude;
          const lon = typeof t.lon === 'number' ? t.lon : t.longitude;
          if (typeof lat !== 'number' || typeof lon !== 'number') continue;
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
          if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
          const cx = Math.floor(lon / cd);
          const cy = Math.floor(lat / cd);
          const k = cx+','+cy;
          const id = String(t.id);
          let c = acc.get(k);
          if (!c) { c = { key:k, count:0, lng:0, lat:0, ids:[], sample:t }; acc.set(k,c); }
          c.count += 1; c.lng += lon; c.lat += lat; c.ids.push(id);
        }
        const out = [];
        for (const c of acc.values()) {
          const avg = [c.lng / c.count, c.lat / c.count];
          const cid = c.count > 1 ? 'cluster:'+c.key : (c.ids[0] ?? 'pt:'+c.key);
          out.push({ id: cid, lngLat: avg, count: c.count, sample: c.sample });
        }
        postMessage(out);
      };
    `;
    const blob = new Blob([code], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    const result: BuiltCluster[] = await new Promise((resolve) => {
      worker.onmessage = (ev) => {
        try {
          resolve(ev.data as BuiltCluster[]);
        } finally {
          worker.terminate();
        }
      };
      worker.postMessage({ trucks, zoom });
    });
    return result;
  } catch {
    return buildClusters(trucks, zoom);
  }
}
function maybeFitBounds(
  map: MapLike,
  bounds: BoundsLike,
  nextSig: string,
  autoFit: boolean,
  zoom: number,
  fittedSigRef: { current: string },
): void {
  if (!autoFit || bounds.isEmpty() || !nextSig) return;
  if (nextSig === fittedSigRef.current) return;
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  map.fitBounds(bounds, {
    padding: 48,
    maxZoom: Math.max(zoom, 6),
    duration: prefersReduced ? 0 : 400,
  });
  fittedSigRef.current = nextSig;
}

function ensureSourcesAndLayers(tt: TTGlobal, map: MapLike): void {
  // Single shared source for points/lines/heat
  const sourceId = 'trucks-src';
  const ptsLayerId = 'trucks-pts';
  const heatLayerId = 'trucks-heat';
  const lineLayerId = 'trucks-lines';

  // Source
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  // Heat layer (behind points), default hidden for perf unless enabled later
  if (!map.getLayer(heatLayerId)) {
    map.addLayer({
      id: heatLayerId,
      type: 'heatmap',
      source: sourceId,
      layout: { visibility: 'none' },
      paint: {
        'heatmap-radius': 20,
        'heatmap-opacity': 0.6,
      },
    });
  }

  // Line layer (paths)
  if (!map.getLayer(lineLayerId)) {
    map.addLayer(
      {
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': '#38bdf8',
          'line-width': 2,
          'line-opacity': 0.8,
        },
      },
      heatLayerId,
    );
  }

  // Point layer (trucks/clusters)
  if (!map.getLayer(ptsLayerId)) {
    map.addLayer(
      {
        id: ptsLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': ['case', ['has', 'count'], '#2563eb', '#2563eb'],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'count'], 1],
            1,
            5,
            5,
            8,
            20,
            14,
            100,
            18,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
      },
      lineLayerId,
    );
  }
}

/** ----- Component ----- */
export default function TomTomMap({
  trucks,
  center = [100.5018, 13.7563], // Bangkok
  zoom = 11,
  autoFit = true,
  cluster = true,
}: TomTomMapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLike | null>(null);
  const fittedSignatureRef = useRef<string>('');
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const updateRafRef = useRef<number | null>(null);
  const sdkRef = useRef<TTGlobal | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const lastDataSigRef = useRef<string>('');
  const initCenterRef = useRef(center);
  const initZoomRef = useRef(zoom);
  const mapLoadedRef = useRef(false);

  // init map once (never re-create on prop changes)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // In automated e2e environments, skip external SDK initialization to keep tests deterministic
    // and avoid network-related console noise.
    if (
      (typeof navigator !== 'undefined' && (navigator as any).webdriver) ||
      process.env.NEXT_PUBLIC_E2E === '1' ||
      process.env.NEXT_PUBLIC_DISABLE_MAP === '1'
    ) {
      return;
    }
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    if (!apiKey) return;

    let destroyed = false;

    (async () => {
      try {
        const tt = await ensureTomTomLoaded();
        sdkRef.current = tt;
        if (destroyed) return;

        const map = tt.map({
          key: apiKey,
          container: el,
          center: initCenterRef.current,
          zoom: initZoomRef.current,
        });
        mapRef.current = map;

        // Wait until style is fully loaded before adding sources/layers
        try {
          (map as any).on?.('load', () => {
            try {
              ensureSourcesAndLayers(tt, map);
              mapLoadedRef.current = true;
              // ensure initial resize after load
              try {
                (map as any).resize?.();
              } catch {
                /* noop */
              }
            } catch {
              /* ignore */
            }
          });
        } catch {
          // Fallback: attempt immediately if event binding fails
          try {
            ensureSourcesAndLayers(tt, map);
            mapLoadedRef.current = true;
          } catch {
            /* ignore */
          }
        }

        // resize observer
        if ('ResizeObserver' in window) {
          const ro = new ResizeObserver(() => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => map.resize());
          });
          ro.observe(el);
          resizeObsRef.current = ro;
        }
      } catch (err) {
        // เงียบข้อผิดพลาดของ SDK (เช่น Failed to fetch ในสภาพแวดล้อมทดสอบ/ออฟไลน์)
        // ปล่อยให้คอมโพเนนต์เรนเดอร์กรอบว่างโดยไม่ทำให้แอปล่ม
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[TomTomMap] init failed:', err);
        }
      }
    })();

    return () => {
      destroyed = true;

      // unobserve & cancel RAF
      if (resizeObsRef.current && el) resizeObsRef.current.unobserve(el);
      resizeObsRef.current = null;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // run only once
  }, []);

  // reflect center/zoom prop changes without re-creating map
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    try {
      if (Array.isArray(center) && center.length === 2) {
        if (typeof map.setCenter === 'function') map.setCenter(center);
      }
      if (typeof zoom === 'number') {
        if (typeof map.setZoom === 'function') map.setZoom(zoom);
      }
    } catch {
      /* no-op */
    }
  }, [center, zoom]);

  // update markers + optional auto-fit (ผ่านลินต์ exhaustive-deps แล้ว)
  // Update GeoJSON source data + optional auto-fit, debounced to avoid thrash
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // If map style isn't loaded yet, wait for the load event once
    if (!mapLoadedRef.current) {
      try {
        (map as any).once?.('load', () => {
          mapLoadedRef.current = true;
          // trigger a debounced update after load
          if (debounceTimerRef.current != null) {
            window.clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = window.setTimeout(() => {
            // force a run by mutating signature
            lastDataSigRef.current = '';
            // no-op; the effect body below will run on next props change
          }, 0);
        });
      } catch {
        /* ignore */
      }
      return;
    }

    let cancelled = false;

    const schedule = () => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(async () => {
        const tt = sdkRef.current ?? (await ensureTomTomLoaded());
        if (cancelled) return;

        // skip if data signature unchanged (avoid unnecessary DOM work)
        const nextSig = signatureFor(trucks);
        if (nextSig === lastDataSigRef.current) return;

        const bounds = new tt.LngLatBounds();

        const runDom = async () => {
          // Build a single FeatureCollection for points (and future lines)
          let features: FeatureCollection['features'] = [];
          if (cluster) {
            const clusterList = await buildClustersAsync(trucks, zoom);
            features = clusterList.map((c) => {
              const props: Record<string, any> = { id: c.id, count: c.count };
              if (c.sample) {
                const html = buildPopupHtml(c.sample);
                if (html) props.popup = html;
              }
              bounds.extend(c.lngLat);
              return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: c.lngLat },
                properties: props,
              } satisfies FeaturePoint;
            });
          } else {
            features = trucks
              .map((t) => {
                const p = getLngLat(t);
                if (!p) return null;
                bounds.extend(p);
                const html = buildPopupHtml(t);
                const props: Record<string, any> = { id: String(t.id) };
                if (html) props.popup = html;
                return {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: p },
                  properties: props,
                } satisfies FeaturePoint;
              })
              .filter(Boolean) as FeaturePoint[];
          }

          // Ensure source and layers exist
          ensureSourcesAndLayers(tt, map);
          const src = map.getSource('trucks-src');
          if (src) src.setData({ type: 'FeatureCollection', features });

          maybeFitBounds(
            map,
            bounds,
            nextSig,
            autoFit,
            zoom,
            fittedSignatureRef,
          );
          lastDataSigRef.current = nextSig;
        };

        if (updateRafRef.current != null)
          cancelAnimationFrame(updateRafRef.current);
        updateRafRef.current = requestAnimationFrame(() => {
          void runDom();
        });
      }, 300);
    };

    schedule();

    return () => {
      cancelled = true;
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (updateRafRef.current != null) {
        cancelAnimationFrame(updateRafRef.current);
        updateRafRef.current = null;
      }
    };
  }, [trucks, autoFit, zoom, cluster]);

  return (
    <div
      ref={containerRef}
      data-testid="map-container"
      className="w-full h-[420px] md:h-[520px] lg:h-[600px] rounded-map border overflow-hidden"
      role="img"
      aria-label="map"
    />
  );
}
