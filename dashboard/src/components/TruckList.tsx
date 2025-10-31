// src/components/TruckList.tsx
'use client';

import React, {
  memo,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import clsx from 'clsx';

export type Truck = {
  id: string;
  name?: string;
  driver?: string;
  speed?: number; // km/h
  temp?: number; // °C
  status?: 'online' | 'offline' | string;
  lat?: number;
  lng?: number;
  lastUpdate?: string | number | Date;
};

// ค่าคงที่สำหรับโหมดพัฒนา (อ้างอิงเดิมเพื่อให้ e2e/assert ได้)
const DEMO_TRUCKS: ReadonlyArray<Truck> = Object.freeze([
  {
    id: 'T-101',
    name: 'North Hauler',
    driver: 'Ann',
    speed: 54,
    temp: -12,
    status: 'online',
  },
  {
    id: 'T-102',
    name: 'East Rider',
    driver: 'Ben',
    speed: 0,
    temp: -10,
    status: 'offline',
  },
  {
    id: 'T-103',
    name: 'Cold Express',
    driver: 'Chan',
    speed: 38,
    temp: -15,
    status: 'online',
  },
]);
const EMPTY_TRUCKS: ReadonlyArray<Truck> = Object.freeze([]);

type SortKey = 'id' | 'speed' | 'temp' | 'status';

export default function TruckList({
  trucks,
  onSelect,
}: {
  trucks: Truck[] | null | undefined;
  onSelect?: (t: Truck) => void;
}) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('id');

  // ปรับให้พิมพ์ค้นหาลื่นขึ้นในลิสต์ยาว ๆ
  const deferredQuery = useDeferredValue(query);

  // เลือกแหล่งข้อมูลให้เสถียร และไม่มี conditional ใน deps อีกต่อไป
  const base: ReadonlyArray<Truck> = useMemo(() => {
    if (trucks && trucks.length > 0) return trucks;
    if (process.env.NODE_ENV !== 'production') return DEMO_TRUCKS;
    return EMPTY_TRUCKS;
  }, [trucks]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();

    let list = base;
    if (q) {
      list = base.filter((t) => {
        const pack = [t.id, t.name, t.driver, t.status].join(' ').toLowerCase();
        return pack.includes(q);
      });
    }

    const statusRank = (s?: string) =>
      s === 'online' ? 0 : s === 'offline' ? 1 : 2;

    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'speed':
          // มากไปน้อย, undefined ไปท้าย
          return (
            (b.speed ?? Number.NEGATIVE_INFINITY) -
            (a.speed ?? Number.NEGATIVE_INFINITY)
          );
        case 'temp':
          // หนาวกว่าก่อน, undefined ไปท้าย
          return (
            (a.temp ?? Number.POSITIVE_INFINITY) -
            (b.temp ?? Number.POSITIVE_INFINITY)
          );
        case 'status':
          // online ก่อน offline ก่อนสถานะอื่น แล้วค่อยเทียบข้อความ
          return (
            statusRank(a.status) - statusRank(b.status) ||
            (a.status ?? '').localeCompare(b.status ?? '', undefined, {
              sensitivity: 'base',
            })
          );
        default:
          return a.id.localeCompare(b.id, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
      }
    });

    return sorted;
  }, [base, deferredQuery, sortBy]);

  const handleSelect = useCallback((t: Truck) => onSelect?.(t), [onSelect]);

  return (
    <section
      data-testid="truck-list"
      aria-label="Truck list"
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 space-y-3"
    >
      <header className="flex items-center gap-3">
        <input
          data-testid="truck-search"
          type="search"
          placeholder="Search trucks, drivers, status…"
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search trucks"
        />
        <label htmlFor="truck-sort" className="sr-only">
          Sort by
        </label>
        <select
          id="truck-sort"
          data-testid="truck-sort"
          className="rounded-lg bg-black/30 border border-white/10 px-2 py-2"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort trucks"
        >
          <option value="id">ID</option>
          <option value="speed">Speed</option>
          <option value="temp">Temperature</option>
          <option value="status">Status</option>
        </select>
      </header>

      {filtered.length === 0 ? (
        <div
          data-testid="truck-list-empty"
          className="text-sm opacity-70 px-2 py-3"
          role="status"
          aria-live="polite"
        >
          No trucks found
        </div>
      ) : (
        <ul className="divide-y divide-white/10">
          {filtered.map((t) => (
            <TruckRow key={t.id} t={t} onSelect={handleSelect} />
          ))}
        </ul>
      )}
    </section>
  );
}

const TruckRow = memo(function TruckRow({
  t,
  onSelect,
}: {
  t: Truck;
  onSelect?: (t: Truck) => void;
}) {
  return (
    <li className="py-3">
      <button
        type="button"
        data-testid="truck-item"
        data-truck-id={t.id}
        className="w-full flex items-center justify-between gap-3 hover:bg-white/5 rounded-lg px-2 py-2 transition text-left"
        aria-label={`Truck ${t.id}${t.status ? ` ${t.status}` : ''}`}
        onClick={() => onSelect?.(t)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(t);
          }
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              data-testid="truck-status"
              className={clsx(
                'inline-block h-2 w-2 rounded-full',
                (t.status ?? 'online') === 'offline'
                  ? 'bg-red-500'
                  : 'bg-emerald-400',
              )}
              aria-hidden="true"
            />
            <span
              data-testid="truck-id"
              className="font-semibold text-sm truncate"
              title={t.id}
            >
              {t.id}
            </span>
          </div>
          <div className="text-xs opacity-70 truncate">
            <span data-testid="truck-name">{t.name ?? 'Unnamed'}</span>
            {t.driver ? (
              <span className="ml-2">• Driver: {t.driver}</span>
            ) : null}
            {t.status ? <span className="ml-2">• {t.status}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-3 items-center gap-4 text-right text-sm">
          <div>
            <div className="opacity-70 text-xs">Speed</div>
            <div data-testid="truck-speed">{fmtSpeed(t.speed)}</div>
          </div>
          <div>
            <div className="opacity-70 text-xs">Temp</div>
            <div data-testid="truck-temp">{fmtTemp(t.temp)}</div>
          </div>
          <div className="text-xs opacity-70">
            {t.lastUpdate ? (
              <time dateTime={toISO(t.lastUpdate)}>
                {timeAgo(t.lastUpdate)}
              </time>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
});

function fmtSpeed(v?: number) {
  if (v == null) return '—';
  try {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v)} km/h`;
  } catch {
    return `${v} km/h`;
  }
}

function fmtTemp(v?: number) {
  if (v == null) return '—';
  try {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v)}°C`;
  } catch {
    return `${v}°C`;
  }
}

function toISO(d: string | number | Date) {
  try {
    return new Date(d).toISOString();
  } catch {
    return '';
  }
}

function timeAgo(d: string | number | Date) {
  const dt = new Date(d).getTime();
  const diff = Date.now() - dt;
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.round(h / 24);
  return `${dd}d ago`;
}
