/**
 * Strong UI-facing truck model + helpers
 * - ปลอดภัยกับ `exactOptionalPropertyTypes`
 * - ไม่กำหนดค่า `undefined` ลง optional fields
 * - ครอบคลุมชื่อฟิลด์หลายแบบจากแหล่งข้อมูล (temperature/velocity/latitude/longitude ฯลฯ)
 * - มีตัวช่วย normalize/merge/format/compare พร้อมแคช updatedAt
 */

/////////////////////////
// Types
/////////////////////////

export type UiTruck = Readonly<{
  id: number;
  name: string;

  // เสริมจาก realtime/telemetry
  driver_name?: string;
  speed?: number; // km/h
  temp?: number; // °C

  // รองรับ lat/lon หรือ latitude/longitude (normalize เป็น lat/lon)
  lat?: number;
  lon?: number;

  // เวลาจากแหล่งข้อมูลหลักหรือ realtime ล่าสุด
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
}>;

/** alias เพื่อให้ import ใช้เป็น Truck ได้ทันที */
export type Truck = UiTruck;

/** โครงจาก API หลัก (base) */
export type ApiTruck = Readonly<{
  id: number;
  name: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}>;

/** โครงจาก telemetry/realtime (ยืดหยุ่นกับชื่อฟิลด์ยอดฮิต) */
export type Telemetry = Readonly<{
  driver_name?: string;
  speed?: number; // หรืออาจมาเป็น velocity
  temp?: number; // หรืออาจมาเป็น temperature

  // อาจส่งมาทั้งสองแบบ
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;

  // บาง backend ใช้ชื่ออื่น ๆ
  velocity?: number;
  temperature?: number;

  updatedAt?: string; // ISO (สถานะล่าสุดจาก realtime)
}>;

/** บังคับ field บางชุดให้เป็น required */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
/** comparator signature */
export type Comparator<T> = (a: T, b: T) => number;

/////////////////////////
// Type guards
/////////////////////////

export function isUiTruck(x: unknown): x is UiTruck {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    Number.isFinite(o.id) &&
    typeof o.name === 'string'
  );
}

export function isApiTruck(x: unknown): x is ApiTruck {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    Number.isFinite(o.id) &&
    typeof o.name === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.updatedAt === 'string'
  );
}

export function isTelemetry(x: unknown): x is Telemetry {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    'driver_name' in o ||
    'speed' in o ||
    'velocity' in o ||
    'temp' in o ||
    'temperature' in o ||
    'lat' in o ||
    'lon' in o ||
    'latitude' in o ||
    'longitude' in o ||
    'updatedAt' in o
  );
}

export function hasCoords(
  t: UiTruck,
): t is WithRequired<UiTruck, 'lat' | 'lon'> {
  return (
    typeof t.lat === 'number' &&
    Number.isFinite(t.lat) &&
    typeof t.lon === 'number' &&
    Number.isFinite(t.lon) &&
    isValidLatLon(t.lat, t.lon)
  );
}

export function hasVitals(
  t: UiTruck,
): t is WithRequired<UiTruck, 'speed' | 'temp'> {
  return (
    typeof t.speed === 'number' &&
    Number.isFinite(t.speed) &&
    typeof t.temp === 'number' &&
    Number.isFinite(t.temp)
  );
}

/////////////////////////
// Normalizers
/////////////////////////

const NAME_FALLBACK_PREFIX = 'Truck';

/**
 * แปลง input ที่อย่างน้อยมี id → UiTruck
 * จะ "ไม่" ใส่ undefined ลง optional fields
 */
export function toUiTruck(input: unknown): UiTruck {
  if (!input || typeof input !== 'object')
    throw new Error('toUiTruck: invalid input');
  const o = input as Record<string, unknown>;

  const id = toFiniteNumber(o.id);
  if (id === undefined) throw new Error('toUiTruck: missing/invalid id');

  // รองรับชื่อฟิลด์ชื่อรถหลายแบบ
  const name =
    toNonEmptyString(
      o.name ??
        (o as any).truck_name ??
        (o as any).title ??
        (o as any).label ??
        (o as any).displayName,
    ) ?? `${NAME_FALLBACK_PREFIX} ${id}`;

  const driver_name = toNonEmptyString(o.driver_name);

  // speed/velocity
  const speed = coalesceFiniteNumber(o.speed, (o as any).velocity);

  // temp/temperature
  const temp = coalesceFiniteNumber(o.temp, (o as any).temperature);

  // รองรับ latitude/longitude และ normalize เป็น lat/lon
  const latRaw = coalesceFiniteNumber(o.lat, (o as any).latitude);
  const lonRaw = coalesceFiniteNumber(o.lon, (o as any).longitude);
  const hasValidCoords =
    latRaw !== undefined &&
    lonRaw !== undefined &&
    isValidLatLon(latRaw, lonRaw);
  const lat = hasValidCoords ? latRaw : undefined;
  const lon = hasValidCoords ? lonRaw : undefined;

  // created/updated (รองรับชื่อสำรองผ่าน helper ปลอดภัย)
  const createdAtParsed =
    toIsoString(o.createdAt) ??
    toIsoStringFromKeys(o, ['created_at', 'created']);
  const updatedAtParsed =
    toIsoString((o as any).updatedAt ?? (o as any).lastUpdate) ??
    toIsoStringFromKeys(o, ['updated_at', 'last_updated', 'time', 'ts']);

  // ประกอบ object แบบเลี่ยง undefined (สำคัญต่อ exactOptionalPropertyTypes)
  const out: {
    id: number;
    name: string;
    driver_name?: string;
    speed?: number;
    temp?: number;
    lat?: number;
    lon?: number;
    createdAt?: string;
    updatedAt?: string;
  } = { id, name };

  if (driver_name !== undefined) out.driver_name = driver_name;
  if (speed !== undefined) out.speed = speed;
  if (temp !== undefined) out.temp = temp;
  if (lat !== undefined) out.lat = lat;
  if (lon !== undefined) out.lon = lon;
  if (createdAtParsed !== undefined) out.createdAt = createdAtParsed;
  if (updatedAtParsed !== undefined) out.updatedAt = updatedAtParsed;

  return out;
}

/** แปลงลิสต์ unknown → UiTruck[] (ข้ามตัวที่ invalid อย่างปลอดภัย) */
export function toUiTruckList(inputs: readonly unknown[]): UiTruck[] {
  const out: UiTruck[] = [];
  for (let i = 0; i < inputs.length; i++) {
    try {
      out.push(toUiTruck(inputs[i]));
    } catch {
      // skip invalid row
    }
  }
  return out;
}

/** รวมข้อมูล base จาก API กับ telemetry ให้เป็น UiTruck เดียว (normalize + merge) */
export function mergeTruckTelemetry(
  base: ApiTruck | UiTruck,
  telem?: Telemetry | null,
): UiTruck {
  const b = toUiTruck(base);
  if (!telem || !isTelemetry(telem)) return b;

  const latRaw = coalesceFiniteNumber(telem.lat, telem.latitude);
  const lonRaw = coalesceFiniteNumber(telem.lon, telem.longitude);
  const hasValidCoords =
    latRaw !== undefined &&
    lonRaw !== undefined &&
    isValidLatLon(latRaw, lonRaw);
  const lat = hasValidCoords ? latRaw : undefined;
  const lon = hasValidCoords ? lonRaw : undefined;

  const speed = coalesceFiniteNumber(telem.speed, telem.velocity);
  const temp = coalesceFiniteNumber(telem.temp, telem.temperature);
  const upd = toIsoString(telem.updatedAt);

  const out: UiTruck = {
    ...b,
    ...(telem.driver_name !== undefined
      ? { driver_name: telem.driver_name }
      : {}),
    ...(speed !== undefined ? { speed } : {}),
    ...(temp !== undefined ? { temp } : {}),
    ...(lat !== undefined ? { lat } : {}),
    ...(lon !== undefined ? { lon } : {}),
    ...(upd !== undefined ? { updatedAt: upd } : {}),
  };

  return out;
}

/**
 * รวมรายการ base หลายตัวเข้ากับ telemetry ตาม id (ไม่ซ้ำ, เรียงตาม comparator)
 * รองรับ key ของ telemetry ทั้ง number และ string
 */
export function mergeTruckCollections(
  bases: readonly (ApiTruck | UiTruck | unknown)[],
  telemetryById?:
    | Readonly<Record<number, Telemetry>>
    | Readonly<Record<string, Telemetry>>
    | null,
  sort: Comparator<UiTruck> = compareByUpdatedDesc,
): UiTruck[] {
  const acc = new Map<number, UiTruck>();
  for (let i = 0; i < bases.length; i++) {
    let base: UiTruck;
    try {
      base = toUiTruck(bases[i]);
    } catch {
      continue;
    }
    if (acc.has(base.id)) continue;

    const tNum =
      telemetryById &&
      (telemetryById as Readonly<Record<number, Telemetry>>)[base.id];
    const tStr =
      telemetryById &&
      (telemetryById as Readonly<Record<string, Telemetry>>)[String(base.id)];

    acc.set(base.id, mergeTruckTelemetry(base, tNum ?? tStr ?? undefined));
  }
  const list = Array.from(acc.values());
  list.sort(sort);
  return list;
}

/////////////////////////
// Comparators (with cache)
/////////////////////////

// แคช epoch ของ updatedAt เพื่อลด Date.parse ซ้ำ ๆ ตอน sort
const __updatedAtEpochCache = new WeakMap<object, number>();

function updatedAtEpoch(t: UiTruck): number {
  const cached = __updatedAtEpochCache.get(t as object);
  if (cached !== undefined) return cached;

  // fallback ไป createdAt ถ้าไม่มี updatedAt
  const src = t.updatedAt ?? t.createdAt;
  const v = src ? Date.parse(src) || 0 : 0;
  __updatedAtEpochCache.set(t as object, v);
  return v;
}

export function compareByUpdatedDesc(a: UiTruck, b: UiTruck): number {
  const ta = updatedAtEpoch(a);
  const tb = updatedAtEpoch(b);
  return tb - ta || a.id - b.id;
}

export function compareByNameAsc(a: UiTruck, b: UiTruck): number {
  const n = a.name.localeCompare(b.name);
  return n || a.id - b.id;
}

export function compareByIdAsc(a: UiTruck, b: UiTruck): number {
  return a.id - b.id;
}

export const Sorters = {
  updatedDesc: compareByUpdatedDesc,
  nameAsc: compareByNameAsc,
  idAsc: compareByIdAsc,
} satisfies Readonly<
  Record<'updatedDesc' | 'nameAsc' | 'idAsc', Comparator<UiTruck>>
>;

/////////////////////////
// Validators + Formatters
/////////////////////////

export function isValidLatLon(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function formatSpeed(t: UiTruck, fallback = '0'): string {
  return typeof t.speed === 'number' && Number.isFinite(t.speed)
    ? Math.round(t.speed).toString()
    : fallback;
}

export function formatTemp(t: UiTruck, digits = 1, fallback = '0.0'): string {
  return typeof t.temp === 'number' && Number.isFinite(t.temp)
    ? t.temp.toFixed(digits)
    : fallback;
}

/** ส่ง [lng, lat] เฉพาะเมื่อมีพิกัดและถูกต้อง (เหมาะกับ map หลาย lib) */
export function toLngLat(t: UiTruck): readonly [number, number] | null {
  return hasCoords(t) ? ([t.lon, t.lat] as const) : null;
}

/////////////////////////
// GeoJSON (minimal, no namespace)
/////////////////////////

type MinimalGeoPointGeometry = Readonly<{
  type: 'Point';
  coordinates: readonly [number, number] | readonly [number, number, number];
}>;
export type MinimalGeoFeature = Readonly<{
  type: 'Feature';
  geometry: MinimalGeoPointGeometry;
  properties?: Readonly<Record<string, unknown>> | null;
  id?: string | number;
}>;
export type MinimalGeoFeatureCollection = Readonly<{
  type: 'FeatureCollection';
  features: readonly MinimalGeoFeature[];
}>;

export function toGeoJSONFeature(t: UiTruck): MinimalGeoFeature | null {
  if (!hasCoords(t)) return null;

  const props: Record<string, unknown> = {
    id: t.id,
    name: t.name,
  };
  if (t.driver_name !== undefined) props.driver_name = t.driver_name;
  if (t.speed !== undefined) props.speed = t.speed;
  if (t.temp !== undefined) props.temp = t.temp;
  if (t.createdAt !== undefined) props.createdAt = t.createdAt;
  if (t.updatedAt !== undefined) props.updatedAt = t.updatedAt;

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [t.lon!, t.lat!], // safe เพราะผ่าน hasCoords แล้ว
    },
    properties: props,
  };
}

function isNotNull<T>(x: T | null | undefined): x is T {
  return x != null;
}

export function toGeoJSONFeatureCollection(
  trucks: readonly UiTruck[],
): MinimalGeoFeatureCollection {
  // สร้างเพียงครั้งเดียว, กรอง null ออก → type ปลอดภัยเป็น MinimalGeoFeature[]
  const features = trucks.map(toGeoJSONFeature).filter(isNotNull);
  return { type: 'FeatureCollection', features };
}

/////////////////////////
// Small helpers
/////////////////////////

function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function coalesceFiniteNumber(...vals: readonly unknown[]): number | undefined {
  for (let i = 0; i < vals.length; i++) {
    const n = toFiniteNumber(vals[i]);
    if (n !== undefined) return n;
  }
  return undefined;
}

function toNonEmptyString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
}

function toIsoString(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.length === 0) return undefined;
    const t = Date.parse(s);
    return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
  }
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? v.toISOString() : undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(v);
    const t = d.getTime();
    return Number.isFinite(t) ? d.toISOString() : undefined;
  }
  return undefined;
}

/** ดึง ISO จากคีย์สำรองหลายชื่อ (ป้องกัน undefined index) */
function toIsoStringFromKeys(
  o: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!k) continue;
    const v = toIsoString(o[k]);
    if (v !== undefined) return v;
  }
  return undefined;
}
