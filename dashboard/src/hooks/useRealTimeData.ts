'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { buildWsUrl } from '@/shared/lib/wsUrl';
import { api } from '@/shared/lib/apiClient';

type Truck = {
  id: string;
  latitude: number;
  longitude: number;
  driver_name?: string;
  speed?: number;
  temp?: number;
  updatedAt?: string;
};

type Alert = {
  id?: string;
  level?: string;
  message?: string;
  ts?: string;
} & Record<string, any>;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || buildWsUrl();

export function useRealTimeData() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const pollTimerRef = useRef<number | undefined>(undefined);

  const maxRetry = 6;

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    // ?????????????? (?????)
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }
    wsRef.current?.close();

    try {
      const url = WS_URL;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        retryRef.current = 0;
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);

          if (Array.isArray(data?.trucks)) {
            setTrucks(data.trucks);
          }
          if (Array.isArray(data?.alerts)) {
            setAlerts(data.alerts);
          }

          if (data?.type === 'truck' && data?.payload?.id) {
            setTrucks((prev) => {
              const map = new Map(prev.map((t) => [t.id, t]));
              map.set(data.payload.id, {
                ...map.get(data.payload.id),
                ...data.payload,
              });
              return Array.from(map.values());
            });
          }

          if (data?.type === 'alert' && data?.payload) {
            setAlerts((prev) => {
              const seen = new Set<string>();
              const merged = [data.payload, ...prev];
              const out: Alert[] = [];
              for (const a of merged) {
                const key = a.id ?? `${a.level}-${a.message}-${a.ts}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  out.push(a);
                }
              }
              return out.slice(0, 100);
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (retryRef.current < maxRetry) {
          const wait =
            Math.min(1000 * 2 ** retryRef.current, 10000) +
            Math.floor(Math.random() * 300);
          retryRef.current += 1;
          reconnectTimerRef.current = window.setTimeout(connect, wait);
        }
      };

      ws.onerror = () => {
        // ??? onclose ????????? reconnect
      };
    } catch {
      // noop
    }
  }, []);

  // ????????????????? WS
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current)
        window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Fallback polling (?????????????????????????????? WS)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fetchOnce = async () => {
      try {
        const [tRes, aRes] = await Promise.all([
          api.get('trucks').catch(() => null),
          api.get('alerts').catch(() => null),
        ]);
        if (tRes?.status === 200) setTrucks(tRes.data);
        if (aRes?.status === 200) setAlerts(aRes.data);
      } catch {
        /* ignore */
      }
    };

    // ????????????????? ???????????? WS ???????????????????
    if (!isConnected) {
      fetchOnce();
      pollTimerRef.current = window.setInterval(
        fetchOnce,
        10000,
      ) as unknown as number;
    } else if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = undefined;
    }

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
    };
  }, [isConnected]);

  return { trucks, alerts, isConnected, setTrucks, setAlerts };
}
