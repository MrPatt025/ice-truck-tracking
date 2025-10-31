// dashboard/src/hooks/useTelemetry.ts
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/shared/lib/apiClient';
import { useAuth } from '@/shared/auth/AuthContext';
import type { UiTruck } from '@/types/truck';
import { toUiTruck } from '@/types/truck';

export type Health = 'connected' | 'disconnected';

export type Alert = Readonly<{
  id: string | number;
  level: string;
  message: string;
  ts?: string;
  createdAt?: string;
}>;

/* ----------------------------- helpers ----------------------------- */

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object';
}

function isHealthy(h: unknown): boolean {
  if (!isObj(h)) return false;
  const status = (h as Record<string, unknown>).status;
  if (typeof status === 'string') {
    const s = status.toLowerCase();
    return s === 'healthy' || s === 'ok';
  }
  if (typeof (h as Record<string, unknown>).ok === 'boolean') {
    return (h as Record<string, unknown>).ok === true;
  }
  if ((h as Record<string, unknown>).apiHealthy === true) return true;
  return false;
}

function normalizeTrucks(payload: unknown): UiTruck[] {
  if (!Array.isArray(payload)) return [];
  const out: UiTruck[] = [];
  for (const item of payload) {
    try {
      out.push(toUiTruck(item));
    } catch {
      /* skip invalid rows */
    }
  }
  return out;
}

// WS parser removed while WebSocket is disabled; retained normalizeTrucks for REST payloads.

/* ------------------------------ hook ------------------------------- */

export function useTelemetry() {
  const { token, bootstrapped } = useAuth();
  const [trucks, setTrucks] = useState<UiTruck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [health, setHealth] = useState<Health>('connected');
  const [offline, setOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [mapStyle, setMapStyle] = useState<'default' | 'satellite'>('default');
  const [error, setError] = useState<string | null>(null);

  const trendRef = useRef<Array<{ time: number; avgSpeed: number }>>([]);
  const [trend, setTrend] = useState<Array<{ time: number; avgSpeed: number }>>(
    [],
  );

  const mounted = useRef(false);

  useEffect(() => {
    if (!token || !bootstrapped) {
      // Pause polling when not authenticated
      return;
    }
    mounted.current = true;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let alertTimer: ReturnType<typeof setInterval> | null = null;
    let visibilityHandler: (() => void) | null = null;

    const safeSet = <T>(setter: (v: T) => void, v: T) => {
      if (mounted.current) setter(v);
    };

    const pull = async () => {
      try {
        const [tRes, hRes] = await Promise.all([
          api.get('trucks'),
          api.get('health'),
        ]);
        if (!mounted.current) return;
        safeSet(setTrucks, normalizeTrucks(tRes.data));
        safeSet(setHealth, isHealthy(hRes.data) ? 'connected' : 'disconnected');
        safeSet(setError, null);
      } catch {
        if (!mounted.current) return;
        safeSet(setHealth, 'disconnected');
        safeSet(setError, 'fetch_failed');
      }
    };

    const pullAlerts = async () => {
      try {
        const res = await api.get('alerts');
        if (!mounted.current) return;
        const a = res.data;
        const arr = Array.isArray(a) ? (a as Alert[]).slice(0, 12) : [];
        safeSet(setAlerts, arr);
      } catch {
        /* ignore alert failures */
      }
    };

    // initial
    void pull();
    void pullAlerts();

    // polling (pause เมื่อ tab ไม่ active เพื่อลดโหลด)
    const startPolling = () => {
      if (!pollTimer) pollTimer = setInterval(pull, 2000);
      if (!alertTimer) alertTimer = setInterval(pullAlerts, 5000);
    };
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      if (alertTimer) clearInterval(alertTimer);
      pollTimer = null;
      alertTimer = null;
    };
    startPolling();

    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.visibilityState === 'hidden') stopPolling();
        else startPolling();
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    // online/offline
    const goOnline = () => safeSet(setOffline, false);
    const goOffline = () => safeSet(setOffline, true);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
    }

    return () => {
      mounted.current = false;
      stopPolling();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      }
      if (visibilityHandler && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
  }, [token, bootstrapped]);

  const metrics = useMemo(() => {
    const active = trucks.length;
    const sumSpeed = trucks.reduce(
      (s, t) =>
        s +
        (typeof t.speed === 'number' && Number.isFinite(t.speed) ? t.speed : 0),
      0,
    );
    const avgSpeed = active ? sumSpeed / active : 0;
    const totalDistance = sumSpeed * 0.2; // ประมาณช่วงเวลา 0.2h
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
      const res = await api.get('health');
      setHealth(isHealthy(res.data) ? 'connected' : 'disconnected');
    } catch {
      setHealth('disconnected');
      setError('retry_failed');
    }
  };

  return {
    trucks,
    alerts,
    health,
    offline,
    mapStyle,
    setMapStyle,
    metrics,
    trend,
    error,
    retry,
  };
}
