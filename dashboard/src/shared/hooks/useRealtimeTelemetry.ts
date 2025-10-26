// dashboard/src/shared/hooks/useRealtimeTelemetry.ts
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
    const base = (
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const wsUrl = base.replace(/^http/, 'ws') + '/api/v1/telemetry';
    let stop = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (stop) return;
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;
        socket.addEventListener('open', () => {
          setConnected(true);
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
          if (!stop) {
            // fallback to polling via react-query: simply do nothing and queries will continue to work
            // schedule reconnect
            reconnectTimer = window.setTimeout(connect, 3000);
          }
        });
        socket.addEventListener('error', () => {
          try {
            socket?.close();
          } catch {}
        });
      } catch {
        // schedule reconnect
        reconnectTimer = window.setTimeout(connect, 3000);
      }
    };

    connect();
    return () => {
      stop = true;
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
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
