// dashboard/src/shared/hooks/useRealtimeTelemetry.ts
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildWsUrl } from '@/shared/lib/wsUrl';
import { useQueryClient } from '@tanstack/react-query';
import type {
  AlertDto,
  TelemetryMessage,
  TelemetryPoint,
} from '@/shared/types/api';

export type RealtimeState = Readonly<{
  connected: boolean;
  lastTs?: number;
}>;

/**
 * Subscribes to backend WebSocket telemetry and merges updates into query caches.
 * - Sets ['telemetry'] -> TelemetryPoint[]
 * - Updates ['alerts'] list if incoming alerts present (dedupe by id, keep newest first, cap 200)
 */
export function useRealtimeTelemetry(): RealtimeState {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastTs, setLastTs] = useState<number | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const paths = [
      process.env.NEXT_PUBLIC_WS_PATH || '/ws',
      '/api/v1/telemetry',
    ];
    const urlFor = (idx: number) =>
      buildWsUrl(paths[idx % paths.length] as string);
    let stop = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;
    let attempt = 0;

    const connect = () => {
      if (stop) return;
      try {
        socket = new WebSocket(urlFor(attempt));
        wsRef.current = socket;
        socket.addEventListener('open', () => {
          setConnected(true);
          // keepalive ping
          try {
            if (pingTimer != null) window.clearInterval(pingTimer);
          } catch {}
          pingTimer = window.setInterval(() => {
            try {
              if (socket && socket.readyState === socket.OPEN)
                socket.send('ping');
            } catch {}
          }, 25000);
        });
        socket.addEventListener('message', (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as TelemetryMessage;
            if (Array.isArray(msg.trucks)) {
              qc.setQueryData<TelemetryPoint[] | undefined>(
                ['telemetry'],
                (_prev) => msg.trucks,
              );
            }
            if (Array.isArray(msg.alerts) && msg.alerts.length > 0) {
              qc.setQueryData<AlertDto[] | undefined>(['alerts'], (prev) => {
                const existing = prev ?? [];
                const byId = new Map<number, AlertDto>();
                for (const a of existing) byId.set(a.id, a);
                for (const a of msg.alerts!) byId.set(a.id, a);
                const merged = Array.from(byId.values()).sort(
                  (a, b) => b.id - a.id,
                );
                return merged.slice(0, 200);
              });
            }
            setLastTs(Date.now());
          } catch {
            // ignore bad packets
          }
        });
        socket.addEventListener('close', () => {
          setConnected(false);
          wsRef.current = null;
          if (pingTimer != null) window.clearInterval(pingTimer);
          if (!stop) {
            // fallback to polling via react-query: simply do nothing and queries will continue to work
            // schedule reconnect
            attempt += 1; // rotate path as well
            reconnectTimer = window.setTimeout(
              connect,
              Math.min(30000, 1000 * Math.pow(2, attempt)),
            );
          }
        });
        socket.addEventListener('error', () => {
          if (pingTimer != null) window.clearInterval(pingTimer);
          try {
            socket?.close();
          } catch {}
        });
      } catch {
        // schedule reconnect
        attempt += 1;
        reconnectTimer = window.setTimeout(
          connect,
          Math.min(30000, 1000 * Math.pow(2, attempt)),
        );
      }
    };

    connect();
    return () => {
      stop = true;
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      if (pingTimer != null) window.clearInterval(pingTimer);
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
    };
  }, [qc]);

  return useMemo(() => {
    const base: RealtimeState = { connected };
    return lastTs === undefined ? base : { ...base, lastTs };
  }, [connected, lastTs]);
}
