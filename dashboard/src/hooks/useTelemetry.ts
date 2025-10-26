'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAlerts, getHealth, getTrucks, type Truck } from '../lib/api';
import { deriveWsCandidates, openSocket } from '../lib/ws';

type Health = 'connected' | 'disconnected';

export function useTelemetry() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [alerts, setAlerts] = useState<
    { id: string | number; level: string; message: string; ts: string }[]
  >([]);
  const [health, setHealth] = useState<Health>('connected');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [mapStyle, setMapStyle] = useState<'default' | 'satellite'>('default');
  const [error, setError] = useState<string | null>(null);

  const trendRef = useRef<{ time: number; avgSpeed: number }[]>([]);
  const [trend, setTrend] = useState<{ time: number; avgSpeed: number }[]>([]);

  // Polling + WS
  useEffect(() => {
    const pollTimer = undefined;
    const alertTimer = undefined;
    let wsCloser: { close(): void } | null = null;
    let mounted = true;

    const pull = async () => {
      try {
        const [t, h] = await Promise.all([getTrucks(), getHealth()]);
        if (!mounted) return;
        setTrucks(t);
        setHealth(h.status === 'healthy' ? 'connected' : 'disconnected');
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setHealth('disconnected');
        setError('fetch_failed');
      }
    };

    const pullAlerts = async () => {
      try {
        const a = await getAlerts();
        if (!mounted) return;
        setAlerts(a.slice(0, 12));
      } catch {}
    };

    // เริ่มดึงทันที
    pull();
    pullAlerts();
    pollTimer = setInterval(pull, 2000);
    alertTimer = setInterval(pullAlerts, 5000);

    // WebSocket (ถ้าใช้ได้จะได้ real-time จริง)
    const wsUrls = deriveWsCandidates(process.env.NEXT_PUBLIC_API_URL);
    wsCloser = openSocket<any>({
      urlCandidates: wsUrls,
      onOpen: () => setHealth('connected'),
      onMessage: (raw) => {
        // รองรับ 2 ฟอร์แมตทั่วไป
        const maybeArr = Array.isArray(raw)
          ? raw
          : (raw?.payload ?? raw?.trucks);
        if (
          Array.isArray(maybeArr) &&
          maybeArr.length &&
          'latitude' in maybeArr[0]
        ) {
          setTrucks(maybeArr as Truck[]);
          setHealth('connected');
        }
      },
      onError: () => setHealth('disconnected'),
      onClose: () => setHealth('disconnected'),
    });

    // online/offline
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    return () => {
      mounted = false;
      clearInterval(pollTimer);
      clearInterval(alertTimer);
      wsCloser?.close();
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // คำนวณ metrics + เก็บ trend ให้กราฟลื่น
  const metrics = useMemo(() => {
    const active = trucks.length;
    const avgSpeed = active
      ? trucks.reduce((s, t) => s + t.speed, 0) / active
      : 0;
    const totalDistance =
      trucks.reduce((s, t) => s + Math.max(t.speed, 0), 0) * 0.2;
    return { active, avgSpeed, totalDistance };
  }, [trucks]);

  useEffect(() => {
    const now = Date.now();
    const arr = trendRef.current;
    arr.push({ time: now, avgSpeed: metrics.avgSpeed });
    while (arr.length > 60) arr.shift();
    setTrend([...arr]);
  }, [metrics.avgSpeed]);

  const retry = async () => {
    setError(null);
    try {
      const h = await getHealth();
      setHealth(h.status === 'healthy' ? 'connected' : 'disconnected');
    } catch {
      setHealth('disconnected');
      setError('retry_failed');
    }
  };

  return {
    // data
    trucks,
    alerts,
    health,
    offline,
    // ui state
    mapStyle,
    setMapStyle,
    // analytics
    metrics,
    trend,
    // errors
    error,
    retry,
  };
}
