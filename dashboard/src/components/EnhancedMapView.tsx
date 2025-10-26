'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type React from 'react';
import type { UiTruck } from '@/types/truck';

type MapStyle = 'streets' | 'satellite' | 'terrain' | 'dark';

/** รองรับพิกัดทางเลือกและชื่อ field อุณหภูมิ */
type Truck = UiTruck & {
  latitude?: number;
  longitude?: number;
  temperature?: number;
  status?: 'active' | 'inactive';
};

type MapViewProps = Readonly<{
  trucks: ReadonlyArray<Truck>;
  selectedTruck: string | number | null;
  onSelectTruck: (truckId: string | number | null) => void;
  geofences: ReadonlyArray<unknown>;
}>;

export function EnhancedMapView({
  trucks,
  selectedTruck,
  onSelectTruck,
  geofences: _geofences, // eslint config อนุญาตตัวแปรขึ้นต้น _
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [showClusters, setShowClusters] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    truck?: Truck;
  } | null>(null);

  const mapStyles = useMemo<Record<MapStyle, string>>(
    () => ({
      streets: 'bg-green-100',
      satellite: 'bg-blue-200',
      terrain: 'bg-yellow-100',
      dark: 'bg-gray-800',
    }),
    [],
  );

  const getLatLon = (t: Truck) => {
    const lat = (t.lat ?? t.latitude) as number | undefined;
    const lon = (t.lon ?? t.longitude) as number | undefined;
    return { lat, lon };
  };

  const toPercentXY = (lat: number, lon: number) => {
    const x = ((lon + 180) * 100) / 360;
    const y = ((90 - lat) * 100) / 180;
    return { x, y };
  };

  const plotted = useMemo(() => {
    return trucks
      .map((t) => {
        const { lat, lon } = getLatLon(t);
        if (lat == null || lon == null) return null;
        const { x, y } = toPercentXY(lat, lon);
        return { t, x, y };
      })
      .filter(Boolean) as Array<{ t: Truck; x: number; y: number }>;
  }, [trucks]);

  const findTruckNear = useCallback(
    (px: number, py: number, rect: DOMRect) => {
      const HIT_RADIUS = 20;
      for (const { t } of plotted) {
        const { lat, lon } = getLatLon(t);
        if (lat == null || lon == null) continue;
        const tx = (lon + 180) * (rect.width / 360);
        const ty = (90 - lat) * (rect.height / 180);
        if (Math.hypot(px - tx, py - ty) < HIT_RADIUS) return t;
      }
      return undefined;
    },
    [plotted],
  );

  const handleMapClick = useCallback<
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  >(
    (event) => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const clicked = findTruckNear(x, y, rect);
      onSelectTruck(clicked ? clicked.id : null);
    },
    [findTruckNear, onSelectTruck],
  );

  const handleContextMenu = useCallback<
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  >(
    (event) => {
      event.preventDefault();
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const clicked = findTruckNear(x, y, rect);

      const next: { x: number; y: number; truck?: Truck } = {
        x: event.clientX,
        y: event.clientY,
      };
      if (clicked) next.truck = clicked;
      setContextMenu(next);
    },
    [findTruckNear],
  );

  useEffect(() => {
    const close = () => setContextMenu(null);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-w-0">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-sm p-2">
          <label className="sr-only" htmlFor="map-style">
            Map style
          </label>
          <select
            id="map-style"
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as MapStyle)}
            className="text-sm rounded-md border border-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="streets">🗺️ Streets</option>
            <option value="satellite">🛰️ Satellite</option>
            <option value="terrain">⛰️ Terrain</option>
            <option value="dark">🌙 Dark</option>
          </select>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-xl shadow-sm p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showClusters}
              onChange={(e) => setShowClusters(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Clustering
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Heatmap
          </label>
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className={`w-full h-full ${mapStyles[mapStyle]} relative overflow-hidden cursor-crosshair rounded-xl`}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        role="application"
        aria-label="Fleet map"
      >
        {/* Trucks */}
        {plotted.map(({ t, x, y }) => {
          const isSelected =
            selectedTruck != null && String(selectedTruck) === String(t.id);
          const scale = isSelected ? 1.25 : showClusters ? 1 : 0.95;
          const active = t.status === 'active';

          return (
            <div
              key={t.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={t.driver_name ?? 'Truck'}
              aria-label={`Truck ${t.driver_name ?? t.id}`}
            >
              <div
                className={`transition-transform duration-300 ${
                  isSelected ? 'z-20 ring-4 ring-blue-300 rounded-full' : 'z-10'
                }`}
                style={{ transform: `scale(${scale})` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTruck(t.id);
                }}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    active
                      ? 'bg-green-500 border-green-600 text-white'
                      : 'bg-gray-400 border-gray-500 text-white'
                  }`}
                >
                  🚚
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 z-30 border">
                  <h3 className="font-semibold text-sm">
                    {t.driver_name ?? '—'}
                  </h3>
                  <p className="text-xs text-gray-600">ID: {String(t.id)}</p>
                  <p className="text-xs text-gray-600">
                    Speed:{' '}
                    {typeof t.speed === 'number'
                      ? `${Math.round(t.speed)} km/h`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-600">
                    Temp:{' '}
                    {typeof t.temp === 'number'
                      ? `${t.temp.toFixed(1)}°C`
                      : typeof t.temperature === 'number'
                        ? `${t.temperature.toFixed(1)}°C`
                        : '—'}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      active ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    Status: {t.status ?? '—'}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Heatmap Overlay */}
        {showHeatmap && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.2), rgba(234,179,8,0.1), transparent 60%)',
            }}
          />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          role="menu"
          className="fixed bg-white rounded-lg shadow-lg border py-2 z-50 min-w-40"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.truck ? (
            <>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => setContextMenu(null)}
                role="menuitem"
              >
                🔍 Zoom to Truck
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => setContextMenu(null)}
                role="menuitem"
              >
                📊 View History
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => setContextMenu(null)}
                role="menuitem"
              >
                🚨 Create Alert
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => setContextMenu(null)}
                role="menuitem"
              >
                📍 Add Geofence
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => setContextMenu(null)}
                role="menuitem"
              >
                🎯 Center Map
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
