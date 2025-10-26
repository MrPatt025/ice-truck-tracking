// dashboard/src/hooks/useRealtimeTrucks.ts
'use client';

import { useEffect, useRef, useState } from 'react';

/** ---------- Types ---------- */
export type Truck = Readonly<{
  id: string;
  latitude: number;
  longitude: number;
  temperature?: number;
  status?: string;
  updatedAt?: string;
}>;

/** ลอก readonly ออกเพื่อใช้ทำ "patch" */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type TruckPatch = { id: string } & Partial<Mutable<Omit<Truck, 'id'>>>;

type TelemetryWindow = Window & {
  __telemetryBufferCount?: number;
  Cypress?: unknown;
};

/** ---------- Utils ---------- */
const nowIso = () => new Date().toISOString();

function toNumber(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeTruck(raw: any): Truck | null {
  if (!raw) return null;
  const id = String(
    raw.id ?? raw.truck_id ?? raw.uid ?? raw.code ?? raw.name ?? '',
  ).trim();
  if (!id) return null;

  const latitude = toNumber(raw.latitude ?? raw.lat ?? raw.y) ?? NaN;
  const longitude =
    toNumber(raw.longitude ?? raw.lon ?? raw.lng ?? raw.x) ?? NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const temperature = toNumber(raw.temperature ?? raw.temp ?? raw.t);
  const status = (raw.status ??
    raw.truck_status ??
    raw.state ??
    raw.health ??
    undefined) as string | undefined;

  const updatedAt = (raw.updatedAt ??
    raw.updated_at ??
    raw.timestamp ??
    raw.ts ??
    raw.createdAt ??
    raw.created_at ??
    undefined) as string | undefined;

  return Object.freeze({
    id,
    latitude,
    longitude,
    ...(temperature !== undefined ? { temperature } : null),
    ...(status ? { status: String(status) } : null),
    ...(updatedAt ? { updatedAt: String(updatedAt) } : { updatedAt: nowIso() }),
  } as Truck);
}

/** สร้างแพตช์แบบ mutable (ไม่ติด readonly) เพื่อให้อัปเดตฟิลด์ได้ */
function normalizePatch(patch: any): TruckPatch | null {
  if (!patch) return null;
  const id = String(
    patch.id ?? patch.truck_id ?? patch.uid ?? patch.code ?? '',
  ).trim();
  if (!id) return null;

  const partial: TruckPatch = { id };

  const lat = toNumber(patch.latitude ?? patch.lat ?? patch.y);
  const lon = toNumber(patch.longitude ?? patch.lon ?? patch.lng ?? patch.x);
  if (lat !== undefined) partial.latitude = lat;
  if (lon !== undefined) partial.longitude = lon;

  const temp = toNumber(patch.temperature ?? patch.temp ?? patch.t);
  if (temp !== undefined) partial.temperature = temp;

  const status =
    patch.status ?? patch.truck_status ?? patch.state ?? patch.health;
  if (status !== undefined) partial.status = String(status);

  const ts =
    patch.updatedAt ??
    patch.updated_at ??
    patch.timestamp ??
    patch.ts ??
    patch.createdAt ??
    patch.created_at;
  if (ts !== undefined) partial.updatedAt = String(ts);

  return partial;
}

function httpToWs(base: string, wsPath = '/ws'): string {
  const u = new URL(base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = `${u.pathname.replace(/\/+$/, '')}${
    wsPath.startsWith('/') ? wsPath : `/${wsPath}`
  }`;
  return u.toString();
}

/** ---------- Hook ---------- */
/**
 * ดึงข้อมูลรถแบบโพลลิ่ง + รับเรียลไทม์ผ่าน WebSocket (best-effort)
 * - ใช้ Map ใน ref เป็น canonical store แล้ว batch flush เข้าสถานะ React เพื่อลด re-render
 * - SSR-safe, ยกเลิก fetch ได้, กันออฟไลน์, เร่งโพลเวลาทดสอบ
 */
export function useRealtimeTrucks(
  intervalMs = 10_000,
  apiBase: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
): { trucks: ReadonlyArray<Truck>; lastDataTimestamp: number | null } {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [lastDataTimestamp, setTs] = useState<number | null>(null);

  const mapRef = useRef<Map<string, Truck>>(new Map());
  const bufferRef = useRef<TruckPatch[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const destroyedRef = useRef(false);

  const scheduleFlush = (delay = 120) => {
    if (typeof window === 'undefined') return;
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      if (destroyedRef.current) return;

      // แปลง Map → Array พร้อมรักษา reference stability ให้มากที่สุด
      const arr = Array.from(mapRef.current.values());
      setTrucks(arr);
      setTs(Date.now());
      window.dispatchEvent(new CustomEvent('telemetry:update'));
    }, delay);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // In automated e2e/test environments, avoid making network calls (fetch/WebSocket)
    // to keep console clean and tests deterministic when backend isn't running.
    const isE2E =
      (typeof navigator !== 'undefined' && (navigator as any).webdriver) ||
      process.env.NEXT_PUBLIC_E2E === '1' ||
      process.env.NEXT_PUBLIC_DISABLE_API === '1';
    if (isE2E) {
      // still emit a minimal telemetry:update so UI that listens won't hang
      try {
        window.dispatchEvent(new CustomEvent('telemetry:update'));
      } catch {}
      return;
    }
    destroyedRef.current = false;

    let cancelled = false;
    const w = window as TelemetryWindow;

    // indicator สำหรับทดสอบ/UX
    if (typeof w.__telemetryBufferCount !== 'number')
      w.__telemetryBufferCount = 0;
    const notifyBuffer = () => {
      w.__telemetryBufferCount = bufferRef.current.length;
      w.dispatchEvent(
        new CustomEvent('telemetry:buffer', {
          detail: { count: bufferRef.current.length },
        }),
      );
    };

    const fetchNow = async () => {
      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const res = await fetch(
          `${apiBase.replace(/\/+$/, '')}/api/v1/trucks`,
          {
            cache: 'no-store',
            signal: ac.signal,
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const raw = await res.json();
        if (cancelled) return;

        const list: Truck[] = Array.isArray(raw)
          ? (raw.map(normalizeTruck).filter(Boolean) as Truck[])
          : Array.isArray((raw as any)?.trucks)
            ? (((raw as any).trucks as any[])
                .map(normalizeTruck)
                .filter(Boolean) as Truck[])
            : [];

        // เขียนลง Map (replace snapshot)
        const m = mapRef.current;
        m.clear();
        for (const t of list) m.set(t.id, t);

        scheduleFlush(0); // flush ทันทีหลัง snapshot
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e ?? 'Error');
        w.dispatchEvent(new CustomEvent('test:error', { detail: { message } }));
      }
    };

    // initial fetch
    fetchNow();

    // เร่งโพลเมื่อวิ่งใน Cypress
    const accelerated = w.Cypress
      ? Math.max(500, Math.floor(intervalMs / 2))
      : intervalMs;
    const intervalId = w.setInterval(fetchNow, accelerated);

    // WebSocket (best-effort)
    try {
      const wsUrl = httpToWs(apiBase, '/ws');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (evt: MessageEvent<string>) => {
        try {
          const p = normalizePatch(JSON.parse(evt.data));
          if (!p) return;

          // ออฟไลน์? buffer แล้วรอ flush
          if (navigator.onLine === false) {
            bufferRef.current.push(p);
            notifyBuffer();
            return;
          }

          // merge ลง Map แบบปลอดภัย (freeze เสมอ)
          const m = mapRef.current;
          const current = m.get(p.id);
          if (current) {
            const merged: Truck = Object.freeze({
              ...current,
              ...p,
              id: current.id, // คง id เดิม
              updatedAt: p.updatedAt ?? current.updatedAt ?? nowIso(),
            });
            m.set(merged.id, merged);
          } else {
            const created = normalizeTruck(p);
            if (created) m.set(created.id, created);
          }
          scheduleFlush(); // batch
        } catch {
          /* ignore malformed payload */
        }
      };

      // ปิดเองเมื่อ error/close แล้วให้โพลลิ่งรับช่วงต่อ
      ws.onerror = () => {
        /* no-op */
      };
      ws.onclose = () => {
        /* no-op */
      };
    } catch {
      /* ignore ws init errors */
    }

    const onOnline = () => {
      if (bufferRef.current.length) {
        w.dispatchEvent(
          new CustomEvent('telemetry:flush', {
            detail: { count: bufferRef.current.length },
          }),
        );
        for (const p of bufferRef.current) {
          const m = mapRef.current;
          const current = m.get(p.id);
          if (current) {
            const merged: Truck = Object.freeze({
              ...current,
              ...p,
              id: current.id,
              updatedAt: p.updatedAt ?? current.updatedAt ?? nowIso(),
            });
            m.set(merged.id, merged);
          } else {
            const created = normalizeTruck(p);
            if (created) m.set(created.id, created);
          }
        }
        bufferRef.current = [];
        notifyBuffer();
        scheduleFlush(0);
      }
    };
    const onOffline = () => notifyBuffer();

    w.addEventListener('online', onOnline);
    w.addEventListener('offline', onOffline);

    return () => {
      cancelled = true;
      destroyedRef.current = true;

      // timers
      w.clearInterval(intervalId);
      if (flushTimerRef.current) w.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;

      // fetch
      try {
        abortRef.current?.abort();
      } catch {}
      abortRef.current = null;
      abortRef.current = null;

      // ws
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;

      // events
      w.removeEventListener('online', onOnline);
      w.removeEventListener('offline', onOffline);
    };
  }, [intervalMs, apiBase]);

  return { trucks, lastDataTimestamp };
}
