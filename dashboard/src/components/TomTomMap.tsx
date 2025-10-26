'use client';

import { useEffect, useRef } from 'react';

type Truck = {
  id: string;
  latitude: number;
  longitude: number;
  driver_name: string;
  speed: number;
  temp: number;
};

export default function TomTomMap({
  trucks,
  center = [100.5018, 13.7563] as [number, number],
  zoom = 11,
}: {
  trucks: Truck[];
  center?: [number, number];
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  // สร้างแผนที่เฉพาะฝั่ง client
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let destroyed = false;

    (async () => {
      // โหลด SDK และ CSS แบบไดนามิก (ไม่โดน SSR)
      const tt = await import('@tomtom-international/web-sdk-maps');
      await import('@tomtom-international/web-sdk-maps/dist/maps.css');

      if (destroyed) return;
      mapRef.current = tt.default.map({
        key: process.env.NEXT_PUBLIC_TOMTOM_API_KEY!,
        container: containerRef.current!,
        center,
        zoom,
      });
    })();

    return () => {
      destroyed = true;
      Object.values(markersRef.current).forEach((m) => m.remove());
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom]);

  // อัปเดตมาร์คเกอร์
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (async () => {
      const tt = await import('@tomtom-international/web-sdk-maps');
      const seen: Record<string, true> = {};

      trucks.forEach((t) => {
        seen[t.id] = true;
        const lngLat: [number, number] = [t.longitude, t.latitude];

        if (!markersRef.current[t.id]) {
          const el = document.createElement('div');
          el.setAttribute('data-testid', 'truck-marker');
          el.className =
            'w-3 h-3 rounded-full bg-blue-600 border border-white shadow';

          const marker = new tt.default.Marker({ element: el })
            .setLngLat(lngLat)
            .addTo(map);

          markersRef.current[t.id] = marker;
        } else {
          markersRef.current[t.id].setLngLat(lngLat);
        }
      });

      // ลบมาร์คเกอร์ที่ไม่อยู่แล้ว
      Object.keys(markersRef.current).forEach((id) => {
        if (!seen[id]) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      });
    })();
  }, [trucks]);

  return (
    <div
      data-testid="map-container"
      className="w-full h-80 rounded border overflow-hidden"
      ref={containerRef}
      role="img"
      aria-label="map"
    />
  );
}
