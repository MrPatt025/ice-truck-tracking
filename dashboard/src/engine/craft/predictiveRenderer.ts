/* ================================================================
 *  CRAFT LAYER — Predictive Rendering (#12)
 *  ─────────────────────────────────────────────────────────────
 *  Before the user clicks, we already rendered.
 *
 *  Features:
 *    • Preload next scene     — prefetch route data + assets
 *    • Pre-calc shader state  — warm uniforms and materials
 *    • Pre-warm GPU buffers   — upload geometry ahead of time
 *    • Interaction = 0 delay  — perceived instant response
 *
 *  Uses intersection observer + hover intent detection.
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export type PredictionSignal = 'hover-intent' | 'viewport-proximity' | 'navigation-pattern' | 'prefetch-hint';

export interface PredictionTarget {
  id: string;
  type: 'route' | 'modal' | 'panel' | 'data';
  priority: number;        // 0-1 (higher = more likely)
  loadFn: () => Promise<void>;
  warmFn?: () => void;     // GPU/shader warm-up
  loaded: boolean;
  warmed: boolean;
}

export interface PredictiveConfig {
  enabled: boolean;
  hoverDelayMs: number;    // ms before hover triggers preload
  maxConcurrent: number;   // max parallel preloads
  prefetchOnIdle: boolean; // prefetch during idle periods
  gpuWarmEnabled: boolean; // pre-warm GPU buffers
}

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_CONFIG: PredictiveConfig = {
  enabled: true,
  hoverDelayMs: 150,
  maxConcurrent: 2,
  prefetchOnIdle: true,
  gpuWarmEnabled: true,
};

// ─── Predictive Rendering Engine ──────────────────────────────

export class PredictiveRenderer {
  private readonly _config: PredictiveConfig;
  private readonly _targets = new Map<string, PredictionTarget>();
  private _loadingCount = 0;
  private readonly _hoverTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _observer: IntersectionObserver | null = null;
  private _idleCallbackId: number | null = null;
  private _mounted = false;
  private readonly _navigationHistory: string[] = [];
  private readonly _navigationPatterns = new Map<string, Map<string, number>>();

  constructor(config?: Partial<PredictiveConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || globalThis.window === undefined) return;
    this._mounted = true;

    // Intersection observer for viewport proximity prediction
    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.predictTarget;
          if (id && entry.isIntersecting) {
            this._triggerPrediction(id, 'viewport-proximity');
          }
        }
      },
      { rootMargin: '200px' },
    );

    // Idle prefetching
    if (this._config.prefetchOnIdle && 'requestIdleCallback' in globalThis) {
      this._scheduleIdlePrefetch();
    }
  }

  destroy(): void {
    this._mounted = false;
    this._observer?.disconnect();
    this._observer = null;
    this._hoverTimers.forEach((t) => clearTimeout(t));
    this._hoverTimers.clear();
    if (this._idleCallbackId !== null && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(this._idleCallbackId);
    }
  }

  /* ── Target Registration ───────────────────────────────────── */

  /** Register a predictable interaction target */
  register(target: PredictionTarget): void {
    this._targets.set(target.id, { ...target, loaded: false, warmed: false });
  }

  /** Unregister a target */
  unregister(id: string): void {
    this._targets.delete(id);
  }

  /** Observe an element for viewport proximity */
  observe(el: HTMLElement, targetId: string): void {
    el.dataset.predictTarget = targetId;
    this._observer?.observe(el);
  }

  /** Stop observing an element */
  unobserve(el: HTMLElement): void {
    this._observer?.unobserve(el);
  }

  /* ── Hover Intent ──────────────────────────────────────────── */

  /** Call when pointer enters a predictable target area */
  hoverStart(targetId: string): void {
    if (!this._config.enabled || this._hoverTimers.has(targetId)) return;

    const timer = setTimeout(() => {
      this._hoverTimers.delete(targetId);
      this._triggerPrediction(targetId, 'hover-intent');
    }, this._config.hoverDelayMs);

    this._hoverTimers.set(targetId, timer);
  }

  /** Call when pointer leaves */
  hoverEnd(targetId: string): void {
    const timer = this._hoverTimers.get(targetId);
    if (timer) {
      clearTimeout(timer);
      this._hoverTimers.delete(targetId);
    }
  }

  /* ── Navigation Pattern Learning ───────────────────────────── */

  /** Record a navigation event for pattern learning */
  recordNavigation(routeId: string): void {
    const prev = this._navigationHistory.at(-1);
    this._navigationHistory.push(routeId);
    if (this._navigationHistory.length > 50) {
      this._navigationHistory.shift();
    }

    // Build transition probability map
    if (prev) {
      if (!this._navigationPatterns.has(prev)) {
        this._navigationPatterns.set(prev, new Map());
      }
      const transitions = this._navigationPatterns.get(prev);
      if (!transitions) {
        return;
      }
      transitions.set(routeId, (transitions.get(routeId) || 0) + 1);
    }

    // Predict next navigation and preload
    this._predictFromPattern(routeId);
  }

  private _predictFromPattern(currentRoute: string): void {
    const transitions = this._navigationPatterns.get(currentRoute);
    if (!transitions) return;

    // Find most probable next route
    let bestRoute = '';
    let bestCount = 0;
    transitions.forEach((count, route) => {
      if (count > bestCount) {
        bestCount = count;
        bestRoute = route;
      }
    });

    if (bestRoute && bestCount >= 2) {
      this._triggerPrediction(bestRoute, 'navigation-pattern');
    }
  }

  /* ── Prediction Execution ──────────────────────────────────── */

  private async _triggerPrediction(targetId: string, signal: PredictionSignal): Promise<void> {
    const target = this._targets.get(targetId);
    if (!target || target.loaded || !this._config.enabled) return;
    if (this._loadingCount >= this._config.maxConcurrent) return;

    console.debug(`[Predictive] ${signal} → preloading "${targetId}"`);

    this._loadingCount++;
    try {
      await target.loadFn();
      target.loaded = true;

      // GPU warm-up
      if (this._config.gpuWarmEnabled && target.warmFn) {
        target.warmFn();
        target.warmed = true;
      }
    } catch (err) {
      console.warn(`[Predictive] Failed to preload "${targetId}":`, err);
    } finally {
      this._loadingCount--;
    }
  }

  private _scheduleIdlePrefetch(): void {
    if (requestIdleCallback === undefined) return;

    this._idleCallbackId = requestIdleCallback((deadline) => {
      // Prefetch highest-priority unloaded targets during idle
      const unloaded = Array.from(this._targets.values())
        .filter((t) => !t.loaded)
        .sort((a, b) => b.priority - a.priority);

      for (const target of unloaded) {
        if (deadline.timeRemaining() < 10) break;
        this._triggerPrediction(target.id, 'prefetch-hint');
      }

      // Re-schedule
      if (this._mounted) {
        this._scheduleIdlePrefetch();
      }
    });
  }

  /* ── Stats ─────────────────────────────────────────────────── */

  getStats(): { total: number; loaded: number; warmed: number; loading: number } {
    let loaded = 0, warmed = 0;
    this._targets.forEach((t) => {
      if (t.loaded) loaded++;
      if (t.warmed) warmed++;
    });
    return { total: this._targets.size, loaded, warmed, loading: this._loadingCount };
  }
}
