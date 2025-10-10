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
type Alert = { id?: string; level?: string; message?: string; ts?: string } & Record<string, any>;
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  || "ws://localhost:5000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export function useRealTimeData() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);
  const maxRetry = 5;
  const connect = useMemo(() => {
    return () => {
      if (typeof window === "undefined") return;
      try {
        wsRef.current?.close();
        const ws = new WebSocket(WS_URL.replace(/^http/, "ws"));
        wsRef.current = ws;
        ws.onopen = () => { setIsConnected(true); retryRef.current = 0; };
        ws.onmessage = (ev) => {
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
          } catch (_) { /* ignore parse errors */ }
        };
        ws.onclose = () => {
          setIsConnected(false);
          if (retryRef.current < maxRetry) {
            const wait = Math.min(1000 * 2 ** retryRef.current, 10000);
            retryRef.current += 1;
            setTimeout(connect, wait);
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
  if (typeof window === 'undefined') return;
  let tm: number | undefined;
  const poll = async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/trucks`).catch(() => null),
        fetch(`${API_URL}/api/v1/alerts`).catch(() => null),
      ]);
      if (tRes?.ok) setTrucks(await tRes.json());
      if (aRes?.ok) setAlerts(await aRes.json());
    } catch {}
    // ???????????? WS ?????????
    if (!isConnected) tm = window.setTimeout(poll, 10000);
  };
  if (!isConnected) poll();
  return () => { if (tm) window.clearTimeout(tm); };
}, [isConnected]);
  return { trucks, alerts, isConnected, setTrucks, setAlerts };
}




