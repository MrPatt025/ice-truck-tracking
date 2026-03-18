/* ================================================================
 *  Dashboard Client-Side Observability
 *  ────────────────────────────────────
 *  Collects and reports browser-side performance metrics:
 *   • Core Web Vitals (LCP, FID/INP, CLS)
 *   • Custom engine metrics (frame time, GPU budget)
 *   • Error tracking with structured context
 *   • Navigation timing
 *
 *  Reports to /api/metrics endpoint as JSON for Prometheus ingestion.
 * ================================================================ */

export interface WebVitalsMetric {
    name: 'LCP' | 'FID' | 'INP' | 'CLS' | 'TTFB' | 'FCP';
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
}

export interface EngineMetric {
    name: string;
    value: number;
    unit: 'ms' | 'fps' | 'mb' | 'count' | 'ratio';
    timestamp: number;
}

export interface ClientErrorReport {
    message: string;
    stack?: string;
    component?: string;
    url: string;
    userAgent: string;
    timestamp: number;
}

const METRICS_BUFFER_SIZE = 50;
const FLUSH_INTERVAL_MS = 30_000; // 30s

/**
 * ClientObservability — collects and reports browser metrics.
 *
 * Usage:
 *   const obs = ClientObservability.getInstance();
 *   obs.start();
 *   obs.recordEngineMetric('frame_time', 8.5, 'ms');
 *   obs.recordError(err, 'MapView');
 */
export class ClientObservability {
    private static instance: ClientObservability | null = null;

    private readonly vitalsBuffer: WebVitalsMetric[] = [];
    private readonly engineBuffer: EngineMetric[] = [];
    private readonly errorBuffer: ClientErrorReport[] = [];
    private flushTimer: ReturnType<typeof globalThis.setInterval> | null = null;
    private started = false;

    private constructor() { }

    static getInstance(): ClientObservability {
        if (!ClientObservability.instance) {
            ClientObservability.instance = new ClientObservability();
        }
        return ClientObservability.instance;
    }

    // ─── Lifecycle ─────────────────────────────────────────────

    start(): void {
        if (this.started) return;
        this.started = true;

        this.observeWebVitals();
        this.observeErrors();

        this.flushTimer = globalThis.setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    }

    stop(): void {
        if (this.flushTimer !== null) {
            globalThis.clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        this.flush(); // final flush
        this.started = false;
    }

    // ─── Recording ─────────────────────────────────────────────

    recordWebVital(metric: WebVitalsMetric): void {
        this.vitalsBuffer.push(metric);
        if (this.vitalsBuffer.length > METRICS_BUFFER_SIZE) {
            this.flush();
        }
    }

    recordEngineMetric(name: string, value: number, unit: EngineMetric['unit']): void {
        this.engineBuffer.push({ name, value, unit, timestamp: Date.now() });
        if (this.engineBuffer.length > METRICS_BUFFER_SIZE) {
            this.flush();
        }
    }

    recordError(error: Error, component?: string): void {
        this.errorBuffer.push({
            message: error.message,
            stack: error.stack?.slice(0, 500),
            component,
            url: globalThis.window?.location?.href ?? '',
            userAgent: globalThis.navigator?.userAgent ?? '',
            timestamp: Date.now(),
        });
        if (this.errorBuffer.length > 20) {
            this.flush();
        }
    }

    // ─── Web Vitals ────────────────────────────────────────────

    private rateMetric(val: number, good: number, fair: number): 'good' | 'needs-improvement' | 'poor' {
        if (val < good) return 'good';
        if (val < fair) return 'needs-improvement';
        return 'poor';
    }

    private observeWebVitals(): void {
        if (typeof PerformanceObserver === 'undefined') return;

        // LCP
        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const last = entries.at(-1);
                if (last) {
                    this.recordWebVital({
                        name: 'LCP',
                        value: last.startTime,
                        rating: this.rateMetric(last.startTime, 2500, 4000),
                        timestamp: Date.now(),
                    });
                }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch { /* not supported */ }

        // CLS
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
                        clsValue += (entry as PerformanceEntry & { value: number }).value;
                    }
                }
                this.recordWebVital({
                    name: 'CLS',
                    value: clsValue,
                    rating: this.rateMetric(clsValue, 0.1, 0.25),
                    timestamp: Date.now(),
                });
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch { /* not supported */ }

        // FCP
        try {
            const fcpObserver = new PerformanceObserver((list) => {
                const entry = list.getEntries().find((e) => e.name === 'first-contentful-paint');
                if (entry) {
                    this.recordWebVital({
                        name: 'FCP',
                        value: entry.startTime,
                        rating: this.rateMetric(entry.startTime, 1800, 3000),
                        timestamp: Date.now(),
                    });
                }
            });
            fcpObserver.observe({ type: 'paint', buffered: true });
        } catch { /* not supported */ }
    }

    // ─── Error Tracking ────────────────────────────────────────

    private observeErrors(): void {
        if (typeof globalThis.window === 'undefined') return;

        globalThis.window.addEventListener('error', (event) => {
            this.recordError(
                event.error ?? new Error(event.message),
                'window',
            );
        });

        globalThis.window.addEventListener('unhandledrejection', (event) => {
            const err = event.reason instanceof Error
                ? event.reason
                : new Error(String(event.reason));
            this.recordError(err, 'unhandledrejection');
        });
    }

    // ─── Flush ─────────────────────────────────────────────────

    private flush(): void {
        const vitals = this.vitalsBuffer.splice(0);
        const engine = this.engineBuffer.splice(0);
        const errors = this.errorBuffer.splice(0);

        if (vitals.length === 0 && engine.length === 0 && errors.length === 0) return;

        const payload = { vitals, engine, errors, timestamp: Date.now() };

        // Use sendBeacon for reliability (survives page unload)
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon('/metrics', JSON.stringify(payload));
        } else {
            fetch('/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(() => { /* silently drop if offline */ });
        }
    }

    // ─── Queries ───────────────────────────────────────────────

    getBufferSizes(): { vitals: number; engine: number; errors: number } {
        return {
            vitals: this.vitalsBuffer.length,
            engine: this.engineBuffer.length,
            errors: this.errorBuffer.length,
        };
    }
}
