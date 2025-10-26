'use client';

import { useEffect } from 'react';

export default function MapLibreBoot() {
  useEffect(() => {
    const w = window as any;

    // ใส่ CSS แบบ dynamic (กัน head SSR mismatch)
    const id = 'maplibre-gl-css';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://api.tomtom.com/maps-sdk-for-web/cdn/5.x/5.69.0/lib/maplibre-gl.css';
      document.head.appendChild(link);
    }

    // รอให้สคริปต์โหลดแล้วค่อย expose
    const t = window.setInterval(() => {
      if (w.maplibre || w.maplibregl) {
        w.maplibre = w.maplibre ?? w.maplibregl;
        window.clearInterval(t);
      }
    }, 50);

    return () => window.clearInterval(t);
  }, []);

  return null;
}
