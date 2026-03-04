/* ================================================================
 *  CRAFT LAYER — Temporal UI Behavior (#11)
 *  ─────────────────────────────────────────────────────────────
 *  The UI responds to time. It's alive.
 *
 *  Behaviors:
 *    • Night mode auto dark shift   — gradual theme temperature
 *    • Long idle ambient movement   — subtle floating particles
 *    • Peak traffic dynamic heat    — intensity scales with load
 *    • Time-of-day ambient color    — warm mornings, cool nights
 *
 *  Combines with Light System and Color Intelligence.
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export type TimeSegment = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'lateNight';

export interface TemporalConfig {
  autoThemeShift: boolean;     // Shift color temperature by time
  idleTimeout: number;         // ms before idle state triggers
  peakHoursStart: number;      // 24h format
  peakHoursEnd: number;
  idleAmbienceEnabled: boolean;
  trafficHeatEnabled: boolean;
}

export interface TemporalState {
  segment: TimeSegment;
  hour: number;
  idleSince: number;
  isIdle: boolean;
  isPeakHours: boolean;
  trafficLoad: number;     // 0-1 current fleet utilization
  ambientIntensity: number; // 0-1
}

// ─── Time Segment Detection ────────────────────────────────────

function getTimeSegment(hour: number): TimeSegment {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  if (hour >= 20 && hour < 24) return 'night';
  return 'lateNight';
}

// Temperature per time segment (Kelvin-equivalent for color shift)
const SEGMENT_TEMPERATURE: Record<TimeSegment, number> = {
  dawn: 3200,       // warm orange-pink
  morning: 4500,    // warm golden
  afternoon: 5500,  // neutral daylight
  evening: 3800,    // golden hour
  night: 7000,      // cool blue
  lateNight: 8500,  // deep blue
};

// Ambient intensity per segment
const SEGMENT_AMBIENT: Record<TimeSegment, number> = {
  dawn: 0.3,
  morning: 0.1,
  afternoon: 0.05,
  evening: 0.25,
  night: 0.4,
  lateNight: 0.6,
};

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_CONFIG: TemporalConfig = {
  autoThemeShift: true,
  idleTimeout: 60000,           // 1 minute
  peakHoursStart: 6,
  peakHoursEnd: 18,
  idleAmbienceEnabled: true,
  trafficHeatEnabled: true,
};

// ─── Temporal UI Engine ───────────────────────────────────────

export class TemporalUIEngine {
  private _config: TemporalConfig;
  private _state: TemporalState;
  private _mounted = false;
  private _checkInterval: ReturnType<typeof setInterval> | null = null;
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _activityHandler: (() => void) | null = null;

  // Callbacks
  private _onTimeShift: ((segment: TimeSegment, temperature: number) => void) | null = null;
  private _onIdleChange: ((idle: boolean) => void) | null = null;
  private _onPeakChange: ((peak: boolean) => void) | null = null;

  constructor(config?: Partial<TemporalConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    const hour = new Date().getHours();
    this._state = {
      segment: getTimeSegment(hour),
      hour,
      idleSince: Date.now(),
      isIdle: false,
      isPeakHours: hour >= this._config.peakHoursStart && hour < this._config.peakHoursEnd,
      trafficLoad: 0,
      ambientIntensity: SEGMENT_AMBIENT[getTimeSegment(hour)],
    };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || typeof window === 'undefined') return;
    this._mounted = true;

    // Check time every minute
    this._checkInterval = setInterval(() => this._checkTime(), 60_000);
    this._checkTime();

    // Idle detection
    this._activityHandler = () => this._resetIdle();
    window.addEventListener('mousemove', this._activityHandler, { passive: true });
    window.addEventListener('keydown', this._activityHandler, { passive: true });
    window.addEventListener('scroll', this._activityHandler, { passive: true });
    window.addEventListener('touchstart', this._activityHandler, { passive: true });

    this._startIdleTimer();
    this._applyCSSVars();
  }

  destroy(): void {
    this._mounted = false;
    if (this._checkInterval) clearInterval(this._checkInterval);
    if (this._idleTimer) clearTimeout(this._idleTimer);

    if (typeof window !== 'undefined' && this._activityHandler) {
      window.removeEventListener('mousemove', this._activityHandler);
      window.removeEventListener('keydown', this._activityHandler);
      window.removeEventListener('scroll', this._activityHandler);
      window.removeEventListener('touchstart', this._activityHandler);
    }
  }

  /* ── Public API ────────────────────────────────────────────── */

  /** Set current fleet traffic load (0-1) */
  setTrafficLoad(load: number): void {
    this._state.trafficLoad = Math.max(0, Math.min(1, load));
    this._applyCSSVars();
  }

  /** Register callbacks */
  onTimeShift(cb: (segment: TimeSegment, temperature: number) => void): void {
    this._onTimeShift = cb;
  }

  onIdleChange(cb: (idle: boolean) => void): void {
    this._onIdleChange = cb;
  }

  onPeakChange(cb: (peak: boolean) => void): void {
    this._onPeakChange = cb;
  }

  /** Get current state */
  getState(): Readonly<TemporalState> {
    return this._state;
  }

  /** Force a specific time segment (for testing/demo) */
  forceSegment(segment: TimeSegment): void {
    this._state.segment = segment;
    this._state.ambientIntensity = SEGMENT_AMBIENT[segment];
    this._onTimeShift?.(segment, SEGMENT_TEMPERATURE[segment]);
    this._applyCSSVars();
  }

  /* ── Internal ──────────────────────────────────────────────── */

  private _checkTime(): void {
    const hour = new Date().getHours();
    const newSegment = getTimeSegment(hour);
    const wasPeak = this._state.isPeakHours;

    this._state.hour = hour;
    this._state.isPeakHours = hour >= this._config.peakHoursStart && hour < this._config.peakHoursEnd;

    if (newSegment !== this._state.segment) {
      this._state.segment = newSegment;
      this._state.ambientIntensity = SEGMENT_AMBIENT[newSegment];
      this._onTimeShift?.(newSegment, SEGMENT_TEMPERATURE[newSegment]);
      this._applyCSSVars();
    }

    if (wasPeak !== this._state.isPeakHours) {
      this._onPeakChange?.(this._state.isPeakHours);
    }
  }

  private _startIdleTimer(): void {
    this._idleTimer = setTimeout(() => {
      if (!this._state.isIdle) {
        this._state.isIdle = true;
        this._onIdleChange?.(true);
        this._applyCSSVars();
      }
    }, this._config.idleTimeout);
  }

  private _resetIdle(): void {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    if (this._state.isIdle) {
      this._state.isIdle = false;
      this._onIdleChange?.(false);
      this._applyCSSVars();
    }
    this._state.idleSince = Date.now();
    this._startIdleTimer();
  }

  private _applyCSSVars(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.setProperty('--temporal-segment', this._state.segment);
    root.style.setProperty('--temporal-temperature', String(SEGMENT_TEMPERATURE[this._state.segment]));
    root.style.setProperty('--temporal-ambient', String(this._state.ambientIntensity));
    root.style.setProperty('--temporal-idle', this._state.isIdle ? '1' : '0');
    root.style.setProperty('--temporal-peak', this._state.isPeakHours ? '1' : '0');
    root.style.setProperty('--temporal-traffic', String(this._state.trafficLoad));

    // Set data attribute for CSS-driven behaviors
    root.setAttribute('data-temporal', this._state.segment);
    if (this._state.isIdle) {
      root.setAttribute('data-idle', '');
    } else {
      root.removeAttribute('data-idle');
    }
  }
}

export { SEGMENT_TEMPERATURE, SEGMENT_AMBIENT, getTimeSegment };
