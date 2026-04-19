import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveApiBaseV1 } from '@/lib/backendUrl';
type Truck = {
  id: string;
  latitude: number;
  longitude: number;
  driver_name?: string;
  speed?: number;
  temp?: number;
  updatedAt?: string;
};
type Alert = { id?: string; level?: string; message?: string; ts?: string } & Record<string, unknown>;
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  || "ws://localhost:5000";
const isBrowser = (): boolean => globalThis.window !== undefined;
const API_BASE = resolveApiBaseV1();

function trimTrailingSlashes(url: URL): void {
  while (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
}

function isLocalHostLike(rawUrl: string): boolean {
  return /^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(rawUrl);
}

function toWebSocketProtocol(url: URL): string {
  if (url.protocol === 'http:') {
    url.protocol = 'ws:';
  } else if (url.protocol === 'https:') {
    url.protocol = 'wss:';
  }

  trimTrailingSlashes(url);
  return url.toString();
}

function parseWebSocketCandidate(candidate: string): string | null {
  try {
    return toWebSocketProtocol(new URL(candidate));
  } catch {
    try {
      const scheme = isLocalHostLike(candidate) ? 'http' : 'https';
      return toWebSocketProtocol(new URL(`${scheme}://${candidate}`));
    } catch {
      return null;
    }
  }
}

function toWebSocketUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'ws://localhost:5000';

  return parseWebSocketCandidate(trimmed) ?? 'ws://localhost:5000';
}

function resolveWebSocketUrl(): string {
  if (globalThis.window === undefined) {
    const apiRoot = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (process.env.NEXT_PUBLIC_WS_URL) return toWebSocketUrl(process.env.NEXT_PUBLIC_WS_URL);
    if (apiRoot) return toWebSocketUrl(apiRoot);
    return toWebSocketUrl(WS_URL);
  }

  if (process.env.NEXT_PUBLIC_WS_URL) {
    return toWebSocketUrl(process.env.NEXT_PUBLIC_WS_URL);
  }

  const apiRoot = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiRoot) {
    return toWebSocketUrl(apiRoot);
  }

  const protocol = globalThis.window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${globalThis.window.location.host}`;
}
export function useRealTimeData() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const trucksRef = useRef<Truck[]>([]);
  const alertsRef = useRef<Alert[]>([]);
  const flushRafRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const retryRef = useRef<number>(0);
  const maxRetry = 5;

  const scheduleFlush = useCallback(() => {
    if (flushRafRef.current !== null || !isBrowser()) return;
    flushRafRef.current = globalThis.window.requestAnimationFrame(() => {
      flushRafRef.current = null;
      setTrucks(trucksRef.current);
      setAlerts(alertsRef.current);
    });
  }, []);

  const applyTrucks = useCallback((next: Truck[]) => {
    trucksRef.current = next;
    scheduleFlush();
  }, [scheduleFlush]);

  const applyAlerts = useCallback((next: Alert[]) => {
    alertsRef.current = next;
    scheduleFlush();
  }, [scheduleFlush]);

  const handleWsMessage = useCallback((ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      if (Array.isArray(data?.trucks)) applyTrucks(data.trucks);
      if (Array.isArray(data?.alerts)) applyAlerts(data.alerts);
      if (data?.type === "truck" && data?.payload) {
        const map = new Map(trucksRef.current.map(t => [t.id, t]));
          map.set(data.payload.id, { ...map.get(data.payload.id), ...data.payload });
        applyTrucks(Array.from(map.values()));
      }
      if (data?.type === "alert" && data?.payload) {
        applyAlerts([data.payload, ...alertsRef.current].slice(0, 100));
      }
    } catch { /* ignore parse errors */ }
  }, [applyAlerts, applyTrucks]);
  const connect = useMemo(() => {
    return () => {
      if (!isBrowser()) return;
      try {
        if (reconnectTimeoutRef.current !== null) {
          globalThis.window.clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        wsRef.current?.close();
        const ws = new WebSocket(resolveWebSocketUrl());
        wsRef.current = ws;
        ws.onopen = () => { setIsConnected(true); retryRef.current = 0; };
        ws.onmessage = handleWsMessage;
        ws.onclose = () => {
          setIsConnected(false);
          if (retryRef.current < maxRetry) {
            const wait = Math.min(1000 * 2 ** retryRef.current, 10000);
            retryRef.current += 1;
            reconnectTimeoutRef.current = globalThis.window.setTimeout(connect, wait);
          }
        };
        ws.onerror = () => { /* let onclose handle retry */ };
      } catch { /* noop */ }
    };
  }, [handleWsMessage]);
  useEffect(() => {
    trucksRef.current = trucks;
    alertsRef.current = alerts;
  }, [trucks, alerts]);

  useEffect(() => {
    connect();
    return () => {
      if (flushRafRef.current !== null) {
        globalThis.window.cancelAnimationFrame(flushRafRef.current);
      }
      if (reconnectTimeoutRef.current !== null) {
        globalThis.window.clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);
  // Fallback polling (???????????????????? WS)
useEffect(() => {
  if (!isBrowser()) return;
  let tm: number | undefined;
  let aborted = false;
  const abortController = new AbortController();

  const poll = async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/trucks`, { signal: abortController.signal }).catch(() => null),
        fetch(`${API_BASE}/alerts`, { signal: abortController.signal }).catch(() => null),
      ]);
      if (aborted) return;
      if (tRes?.ok) applyTrucks(await tRes.json());
      if (aRes?.ok) applyAlerts(await aRes.json());
    } catch { /* polling error */ }
    // ???????????? WS ?????????
    if (!isConnected && !aborted) tm = globalThis.window.setTimeout(poll, 10000);
  };
  if (!isConnected) poll();
  return () => {
    aborted = true;
    abortController.abort();
    if (tm) globalThis.window.clearTimeout(tm);
  };
}, [applyAlerts, applyTrucks, isConnected]);

  const setTrucksState = (next: Truck[]) => applyTrucks(next);
  const setAlertsState = (next: Alert[]) => applyAlerts(next);

  return { trucks, alerts, isConnected, setTrucks: setTrucksState, setAlerts: setAlertsState };
}




