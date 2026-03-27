import type { TruckTelemetry } from './types';

export interface FleetCacheSnapshot {
    savedAt: number;
    trucks: TruckTelemetry[];
}

const DB_NAME = 'ice-truck-dashboard';
const STORE_NAME = 'fleet-cache';
const RECORD_KEY = 'latest';
const LOCAL_STORAGE_KEY = 'ice-truck:fleet-cache:v1';
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function hasIndexedDb(): boolean {
    return globalThis.window !== undefined && 'indexedDB' in globalThis;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeTruck(input: unknown): TruckTelemetry | null {
    if (!input || typeof input !== 'object') return null;
    const record = input as Partial<TruckTelemetry>;

    if (typeof record.id !== 'string' || !record.id) return null;
    if (!isFiniteNumber(record.lat) || !isFiniteNumber(record.lng)) return null;

    return {
        id: record.id,
        lat: record.lat,
        lng: record.lng,
        speed: isFiniteNumber(record.speed) ? record.speed : 0,
        heading: isFiniteNumber(record.heading) ? record.heading : 0,
        temperature: isFiniteNumber(record.temperature) ? record.temperature : 0,
        fuelLevel: isFiniteNumber(record.fuelLevel) ? record.fuelLevel : 0,
        engineRpm: isFiniteNumber(record.engineRpm) ? record.engineRpm : 0,
        odometer: isFiniteNumber(record.odometer) ? record.odometer : 0,
        status:
            record.status === 'active'
            || record.status === 'idle'
            || record.status === 'offline'
            || record.status === 'maintenance'
            || record.status === 'alert'
                ? record.status
                : 'offline',
        driverName: typeof record.driverName === 'string' ? record.driverName : 'Unknown',
        routeId: typeof record.routeId === 'string' ? record.routeId : 'offline-cache',
        timestamp: isFiniteNumber(record.timestamp) ? record.timestamp : Date.now(),
    };
}

function sanitizeSnapshot(input: unknown): FleetCacheSnapshot | null {
    if (!input || typeof input !== 'object') return null;
    const record = input as Partial<FleetCacheSnapshot>;
    if (!isFiniteNumber(record.savedAt)) return null;
    if (!Array.isArray(record.trucks)) return null;

    const trucks = record.trucks
        .map((truck) => sanitizeTruck(truck))
        .filter((truck): truck is TruckTelemetry => truck !== null);

    return {
        savedAt: record.savedAt,
        trucks,
    };
}

function openDatabase(): Promise<IDBDatabase | null> {
    if (!hasIndexedDb()) {
        return Promise.resolve(null);
    }

    if (dbPromise !== null) return dbPromise;

    dbPromise = new Promise((resolve) => {
        const request = globalThis.indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });

    return dbPromise;
}

function writeLocalFallback(snapshot: FleetCacheSnapshot): void {
    if (globalThis.window === undefined) return;
    try {
        globalThis.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // Ignore storage quota or privacy mode errors.
    }
}

function readLocalFallback(maxAgeMs: number): TruckTelemetry[] {
    if (globalThis.window === undefined) return [];

    try {
        const raw = globalThis.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return [];

        const snapshot = sanitizeSnapshot(JSON.parse(raw));
        if (!snapshot) return [];
        if (Date.now() - snapshot.savedAt > maxAgeMs) return [];

        return snapshot.trucks;
    } catch {
        return [];
    }
}

function txPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            const reason = request.error;
            if (reason instanceof Error) {
                reject(reason);
                return;
            }
            reject(new Error('IndexedDB request failed'));
        };
    });
}

export async function writeFleetSnapshot(trucks: readonly TruckTelemetry[]): Promise<void> {
    const sanitizedTrucks = trucks
        .map((truck) => sanitizeTruck(truck))
        .filter((truck): truck is TruckTelemetry => truck !== null);

    const snapshot: FleetCacheSnapshot = {
        savedAt: Date.now(),
        trucks: sanitizedTrucks,
    };

    writeLocalFallback(snapshot);

    const db = await openDatabase();
    if (!db) return;

    try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(snapshot, RECORD_KEY);
        await new Promise<void>((resolve) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
            transaction.onabort = () => resolve();
        });
    } catch {
        // Silent fallback keeps offline behavior resilient when IndexedDB is unavailable.
    }
}

export async function readFleetSnapshot(maxAgeMs = DEFAULT_MAX_AGE_MS): Promise<TruckTelemetry[]> {
    const db = await openDatabase();
    if (!db) {
        return readLocalFallback(maxAgeMs);
    }

    try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const raw = await txPromise(store.get(RECORD_KEY));
        const snapshot = sanitizeSnapshot(raw);
        if (!snapshot) return readLocalFallback(maxAgeMs);
        if (Date.now() - snapshot.savedAt > maxAgeMs) return [];
        return snapshot.trucks;
    } catch {
        return readLocalFallback(maxAgeMs);
    }
}
