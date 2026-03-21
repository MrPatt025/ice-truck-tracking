import { useEffect, useMemo, useRef, useState } from "react";
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
const API_BASE = '/api/v1';

function resolveWebSocketUrl(): string {
  if (globalThis.window === undefined) return WS_URL.replace(/^http/i, 'ws');

  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/^http/i, 'ws');
  }

  const protocol = globalThis.window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${globalThis.window.location.host}`;
}
export function useRealTimeData() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);
  const maxRetry = 5;
  const handleWsMessage = (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      if (Array.isArray(data?.trucks)) setTrucks(data.trucks);
      if (Array.isArray(data?.alerts)) setAlerts(data.alerts);
      if (data?.type === "truck" && data?.payload) {
        setTrucks((prev) => {
          const map = new Map(prev.map(t => [t.id, t]));
          map.set(data.payload.id, { ...map.get(data.payload.id), ...data.payload });
          return Array.from(map.values());
        });
      }
      if (data?.type === "alert" && data?.payload) {
        setAlerts((prev) => [data.payload, ...prev].slice(0, 100));
      }
    } catch { /* ignore parse errors */ }
  };
  const connect = useMemo(() => {
    return () => {
      if (globalThis.window === undefined) return;
      try {
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
            globalThis.setTimeout(connect, wait);
          }
        };
        ws.onerror = () => { /* let onclose handle retry */ };
      } catch { /* noop */ }
    };
  }, []);
  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);
  // Fallback polling (???????????????????? WS)
useEffect(() => {
  if (globalThis.window === undefined) return;
  let tm: number | undefined;
  const poll = async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/trucks`).catch(() => null),
        fetch(`${API_BASE}/alerts`).catch(() => null),
      ]);
      if (tRes?.ok) setTrucks(await tRes.json());
      if (aRes?.ok) setAlerts(await aRes.json());
    } catch { /* polling error */ }
    // ???????????? WS ?????????
    if (!isConnected) tm = globalThis.window.setTimeout(poll, 10000);
  };
  if (!isConnected) poll();
  return () => { if (tm) globalThis.window.clearTimeout(tm); };
}, [isConnected]);
  return { trucks, alerts, isConnected, setTrucks, setAlerts };
}




