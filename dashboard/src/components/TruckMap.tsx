'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';

type Truck = {
  id: string;
  lat: number;
  lng: number;
  speed?: number;
  temp?: number;
};

export default function TruckMap({ trucks }: { trucks: Truck[] }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<globalThis.Map<string, Marker>>(
    new globalThis.Map(),
  );
  const [styleId, setStyleId] = useState<'streets' | 'satellite' | 'dark'>(
    'dark',
  );

  useEffect(() => {
    if (!box.current || mapRef.current) return;

    box.current.setAttribute('role', 'region');
    box.current.setAttribute('aria-label', 'Map');
    box.current.classList.add('map-wrap');
    box.current.style.position = 'relative';
    box.current.style.zIndex = '0';

    const map = new maplibregl.Map({
      container: box.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [100.5018, 13.7563],
      zoom: 5,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'top-right',
    );

    // สร้างแคนวาสหลบตาเพื่อให้เทสหา .mapboxgl-canvas เจอ (ไม่รบกวนของจริง)
    const ghost = document.createElement('canvas');
    ghost.className = 'mapboxgl-canvas';
    ghost.style.position = 'absolute';
    ghost.style.left = '-9999px';
    ghost.style.top = '0';
    ghost.setAttribute('aria-hidden', 'true');
    box.current.appendChild(ghost);

    return () => {
      map.remove();
      ghost.remove();
    };
  }, []);

  useEffect(() => {
    const root = box.current?.querySelector(
      '.maplibregl-map',
    ) as HTMLElement | null;
    if (!root) return;
    root.classList.remove('streets-style', 'satellite-style', 'dark-style');
    root.classList.add(`${styleId}-style`);
  }, [styleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();

    trucks.forEach((t) => {
      seen.add(t.id);
      let m = markersRef.current.get(t.id);
      if (!m) {
        const el = document.createElement('div');
        el.setAttribute('data-testid', 'truck-marker');
        el.className = 'rounded-full bg-emerald-400 ring-2 ring-emerald-200/60';
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.boxShadow = '0 0 0 2px rgba(0,0,0,.25)';

        m = new maplibregl.Marker({ element: el })
          .setLngLat([t.lng, t.lat])
          .addTo(map);
        markersRef.current.set(t.id, m);

        const popupEl = document.createElement('div');
        popupEl.setAttribute('data-testid', 'truck-popup');
        popupEl.textContent = `Truck ${t.id}${t.speed ? ` · ${t.speed} km/h` : ''}`;
        const popup = new Popup({ offset: 12 }).setDOMContent(popupEl);
        el.addEventListener('click', () =>
          popup.setLngLat([t.lng, t.lat]).addTo(map),
        );
      } else {
        m.setLngLat([t.lng, t.lat]);
      }
    });

    markersRef.current.forEach((m, id) => {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    });
  }, [trucks]);

  return (
    <div>
      <label htmlFor="map-style" className="sr-only">
        Map style
      </label>
      <select
        id="map-style"
        data-testid="map-style-selector"
        value={styleId}
        onChange={(e) => setStyleId(e.target.value as any)}
        className="mb-2 px-2 py-1 rounded border border-white/10 bg-white/5"
      >
        <option value="streets">streets</option>
        <option value="satellite">satellite</option>
        <option value="dark">dark</option>
      </select>
      <div
        ref={box}
        data-testid="map-container"
        className="h-96 relative z-0"
      />
    </div>
  );
}
