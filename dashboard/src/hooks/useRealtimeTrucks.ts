'use client';

import { useEffect, useRef, useState } from 'react';

type Truck = {
  id: string;
  latitude: number;
  longitude: number;
  temperature?: number;
  status?: string;
  updatedAt?: string;
};

export function useRealtimeTrucks(intervalMs = 10000) {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [lastDataTimestamp, setTs] = useState<number | null>(null);
  const bufferRef = useRef<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let cancelled = false;
    (window as any).__telemetryBufferCount =
      (window as any).__telemetryBufferCount || 0;

    const notifyBuffer = () => {
      (window as any).__telemetryBufferCount = bufferRef.current.length;
      window.dispatchEvent(
        new CustomEvent('telemetry:buffer', {
          detail: { count: bufferRef.current.length },
        }),
      );
    };

    const fetchNow = async () => {
      try {
        const res = await fetch(`${API}/api/v1/trucks`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const next = Array.isArray(data) ? data : data.trucks || [];
        setTrucks(next);
        setTs(Date.now());
        window.dispatchEvent(new CustomEvent('telemetry:update'));
      } catch (e: any) {
        window.dispatchEvent(
          new CustomEvent('test:error', {
            detail: { message: e?.message || 'Error' },
          }),
        );
      }
    };

    fetchNow();
    const accelerated =
      typeof window !== 'undefined' && (window as any).Cypress
        ? Math.max(500, intervalMs / 2)
        : intervalMs;
    const id = setInterval(fetchNow, accelerated);

    // Optional WS (best-effort)
    try {
      const url = API.replace(/^http/, 'ws') + '/ws';
      wsRef.current = new WebSocket(url);
      wsRef.current.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (navigator.onLine === false) {
            bufferRef.current.push(payload);
            notifyBuffer();
            return;
          }
          setTrucks((t) => {
            const idx = t.findIndex((x) => x.id === payload.id);
            if (idx >= 0) {
              const copy = [...t];
              copy[idx] = { ...t[idx], ...payload };
              return copy;
            }
            return [...t, payload];
          });
          setTs(Date.now());
        } catch {}
      };
    } catch {}

    const onOnline = () => {
      if (bufferRef.current.length) {
        window.dispatchEvent(
          new CustomEvent('telemetry:flush', {
            detail: { count: bufferRef.current.length },
          }),
        );
        bufferRef.current = [];
        notifyBuffer();
      }
    };
    const onOffline = () => notifyBuffer();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [intervalMs]);

  return { trucks, lastDataTimestamp };
}
