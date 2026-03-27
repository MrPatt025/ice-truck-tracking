/* ================================================================
 *  CRAFT LAYER — Animation Budget Governor (#19)
 *  ─────────────────────────────────────────────────────────────
 *  Runtime guard ensuring visual quality never kills performance.
 *
 *  Automatic budget enforcement:
 *    • FPS < 55  → reduce particle count
 *    • GPU spike → disable shadows
 *    • Memory spike → drop LOD level
 *    • Thermal throttle → lower DPR
 *
 *  Works in concert with Adaptive layer for device-tier awareness.
 * ================================================================ */

import type { DeviceTier } from '../types';

// ─── Types ─────────────────────────────────────────────────────

export type BudgetAction =
  | 'reduce-particles'
  | 'disable-shadows'
  | 'drop-lod'
  | 'lower-dpr'
  | 'disable-blur'
  | 'reduce-animations'
  | 'disable-glow'
  | 'simplify-gradients';

export interface BudgetThresholds {
  fpsWarning: number;       // trigger soft degradation
  fpsCritical: number;      // trigger aggressive degradation
  memoryWarningMB: number;  // JS heap threshold
  frameTimeWarningMs: number;
}

export interface BudgetState {
  currentFPS: number;
  avgFPS: number;
  memoryMB: number;
  tier: DeviceTier;
  activeActions: Set<BudgetAction>;
  reductionLevel: number;  // 0 (full quality) to 5 (survival mode)
}

export interface AnimationBudgetConfig {
  enabled: boolean;
  thresholds: BudgetThresholds;
  recoveryDelaySec: number; // wait time before recovering quality
  maxReductionLevel: number;
}

// ─── Tier-based Defaults ──────────────────────────────────────

const TIER_THRESHOLDS: Record<DeviceTier, BudgetThresholds> = {
  'high-end':  { fpsWarning: 55, fpsCritical: 40, memoryWarningMB: 512, frameTimeWarningMs: 18 },
  'mid-range': { fpsWarning: 50, fpsCritical: 35, memoryWarningMB: 256, frameTimeWarningMs: 20 },
  'low-end':   { fpsWarning: 40, fpsCritical: 25, memoryWarningMB: 128, frameTimeWarningMs: 25 },
  'potato':    { fpsWarning: 25, fpsCritical: 15, memoryWarningMB: 64,  frameTimeWarningMs: 40 },
};

// Budget actions ordered by impact (least to most aggressive)
const DEGRADATION_LADDER: BudgetAction[][] = [
  // Level 1 — minimal impact
  ['reduce-particles', 'disable-glow'],
  // Level 2 — moderate
  ['disable-shadows', 'disable-blur'],
  // Level 3 — noticeable
  ['reduce-animations', 'simplify-gradients'],
  // Level 4 — aggressive
  ['drop-lod'],
  // Level 5 — survival
  ['lower-dpr'],
];

const DEFAULT_CONFIG: AnimationBudgetConfig = {
  enabled: true,
  thresholds: TIER_THRESHOLDS['mid-range'],
  recoveryDelaySec: 5,
  maxReductionLevel: 5,
};

// ─── Animation Budget Governor ────────────────────────────────

export class AnimationBudgetGovernor {
  private readonly _config: AnimationBudgetConfig;
  private readonly _state: BudgetState;
  private readonly _fpsHistory: number[] = [];
  private _lastDegradeTime = 0;
  private _lastRecoverTime = 0;
  private _mounted = false;
  private _raf = 0;
  private _lastFrameTime = 0;

  // Callbacks for craft layer integration
  private _onAction: ((action: BudgetAction, enabled: boolean) => void) | null = null;
  private _onLevelChange: ((level: number) => void) | null = null;

  constructor(config?: Partial<AnimationBudgetConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._state = {
      currentFPS: 60,
      avgFPS: 60,
      memoryMB: 0,
      tier: 'mid-range',
      activeActions: new Set(),
      reductionLevel: 0,
    };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || globalThis.window === undefined) return;
    this._mounted = true;
    this._lastFrameTime = performance.now();
    this._monitor();
  }

  destroy(): void {
    this._mounted = false;
    cancelAnimationFrame(this._raf);
  }

  /* ── Public API ────────────────────────────────────────────── */

  /** Set device tier — adjusts thresholds accordingly */
  setDeviceTier(tier: DeviceTier): void {
    this._state.tier = tier;
    this._config.thresholds = TIER_THRESHOLDS[tier];
  }

  /** Manually report FPS from external source (e.g., Three.js) */
  reportFPS(fps: number): void {
    this._ingestFPS(fps);
  }

  /** Register callback for budget actions */
  onAction(cb: (action: BudgetAction, enabled: boolean) => void): void {
    this._onAction = cb;
  }

  /** Register callback for reduction level changes */
  onLevelChange(cb: (level: number) => void): void {
    this._onLevelChange = cb;
  }

  /** Get current state  */
  getState(): Readonly<BudgetState> {
    return this._state;
  }

  /** Check if a specific action is currently active */
  isActionActive(action: BudgetAction): boolean {
    return this._state.activeActions.has(action);
  }

  /** Force a specific reduction level (for testing) */
  forceLevel(level: number): void {
    while (this._state.reductionLevel < level) {
      this._degrade();
    }
    while (this._state.reductionLevel > level) {
      this._recover();
    }
  }

  /* ── Internal Monitoring ───────────────────────────────────── */

  private readonly _monitor = (): void => {
    if (!this._mounted) return;

    const now = performance.now();
    const dt = now - this._lastFrameTime;
    this._lastFrameTime = now;

    if (dt > 0) {
      const fps = 1000 / dt;
      this._ingestFPS(fps);
    }

    // Check memory (if Performance API available)
    this._checkMemory();

    // Evaluate budget
    this._evaluate(now);

    // Slow poll — every 4 frames
    this._raf = requestAnimationFrame(this._monitor);
  };

  private _ingestFPS(fps: number): void {
    this._fpsHistory.push(fps);
    if (this._fpsHistory.length > 120) this._fpsHistory.shift();

    this._state.currentFPS = fps;
    this._state.avgFPS = this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length;
  }

  private _checkMemory(): void {
    // performance.memory is Chrome-only but widely used
    const perf = performance as unknown as { memory?: { usedJSHeapSize?: number } };
    if (perf.memory?.usedJSHeapSize) {
      this._state.memoryMB = perf.memory.usedJSHeapSize / (1024 * 1024);
    }
  }

  private _evaluate(now: number): void {
    if (!this._config.enabled) return;

    const { fpsWarning, fpsCritical, memoryWarningMB } = this._config.thresholds;
    const recoveryMs = this._config.recoveryDelaySec * 1000;

    // Need at least 30 frames of data
    if (this._fpsHistory.length < 30) return;

    // DEGRADE CONDITIONS
    if (this._state.avgFPS < fpsCritical && this._canDegrade(now, 2000)) {
      // Critical — jump two levels
      this._degrade();
      this._degrade();
      this._lastDegradeTime = now;
      return;
    }

    if (
      this._state.avgFPS < fpsWarning &&
      this._state.avgFPS >= fpsCritical &&
      this._canDegrade(now, 3000)
    ) {
      // Warning — step one level
      this._degrade();
      this._lastDegradeTime = now;
      return;
    }

    // Memory pressure
    if (
      this._state.memoryMB > memoryWarningMB &&
      this._state.reductionLevel < 4 &&
      this._canDegrade(now, 5000)
    ) {
      this._degrade();
      this._lastDegradeTime = now;
      return;
    }

    // RECOVERY CONDITIONS
    if (this._shouldRecover(now, fpsWarning + 5, recoveryMs)) {
      this._recover();
      this._lastRecoverTime = now;
    }
  }

  private _canDegrade(now: number, cooldownMs: number): boolean {
    return now - this._lastDegradeTime > cooldownMs;
  }

  private _shouldRecover(now: number, fpsFloor: number, recoveryMs: number): boolean {
    return (
      this._state.avgFPS > fpsFloor &&
      this._state.reductionLevel > 0 &&
      now - this._lastDegradeTime > recoveryMs &&
      now - this._lastRecoverTime > recoveryMs
    );
  }

  private _degrade(): void {
    if (this._state.reductionLevel >= this._config.maxReductionLevel) return;

    const level = this._state.reductionLevel;
    if (level < DEGRADATION_LADDER.length) {
      const actions = DEGRADATION_LADDER[level];
      for (const action of actions) {
        this._state.activeActions.add(action);
        this._onAction?.(action, true);
        this._applyCSSHint(action, true);
      }
    }

    this._state.reductionLevel++;
    this._onLevelChange?.(this._state.reductionLevel);

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.budgetLevel = String(this._state.reductionLevel);
    }

    console.debug(`[Budget] Degraded to level ${this._state.reductionLevel}, actions:`, [...this._state.activeActions]);
  }

  private _recover(): void {
    if (this._state.reductionLevel <= 0) return;

    this._state.reductionLevel--;
    const level = this._state.reductionLevel;

    if (level < DEGRADATION_LADDER.length) {
      const actions = DEGRADATION_LADDER[level];
      for (const action of actions) {
        this._state.activeActions.delete(action);
        this._onAction?.(action, false);
        this._applyCSSHint(action, false);
      }
    }

    this._onLevelChange?.(this._state.reductionLevel);

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.budgetLevel = String(this._state.reductionLevel);
    }

    console.debug(`[Budget] Recovered to level ${this._state.reductionLevel}`);
  }

  /** Apply CSS-level hints for budget actions */
  private _applyCSSHint(action: BudgetAction, active: boolean): void {
    if (document === undefined) return;
    const root = document.documentElement;

    if (active) {
      root.setAttribute(`data-budget-${action}`, '');
    } else {
      root.removeAttribute(`data-budget-${action}`);
    }
  }
}

export { TIER_THRESHOLDS, DEGRADATION_LADDER };
