/* ================================================================
 *  CRAFT LAYER — Motion Calibration Lab (#3)
 *  ─────────────────────────────────────────────────────────────
 *  All motion comes from one calibrated source.
 *
 *  Standardizes:
 *    • Global tension presets    (UI base motion)
 *    • Alert tension presets     (attention-grabbing)
 *    • Critical event presets    (emergency urgency)
 *    • Micro interaction presets (hover, focus, press)
 *
 *  Every animation in the app MUST use these presets.
 *  No magic numbers. No inconsistent easing.
 *
 *  Integrates emotional timing (anticipation → action → settling).
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export interface CalibratedSpring {
  mass: number;
  stiffness: number;
  damping: number;
  precision: number;
}

export interface CalibratedTiming {
  /** Anticipation phase — subtle wind-up */
  anticipation: { duration: number; easing: string; scale: number };
  /** Action phase — primary movement */
  action: { duration: number; easing: string };
  /** Settling phase — elastic rest */
  settling: { duration: number; easing: string; overshoot: number };
  /** Total duration budget */
  totalMs: number;
}

export type MotionIntent =
  | 'navigate'     // page / route transitions
  | 'reveal'       // content appearing
  | 'dismiss'      // content leaving
  | 'alert'        // attention required
  | 'critical'     // emergency state
  | 'hover'        // mouse hover
  | 'press'        // click/tap
  | 'focus'        // keyboard focus
  | 'drag'         // drag gesture
  | 'scroll'       // scroll-driven
  | 'expand'       // card → modal
  | 'collapse';    // modal → card

// ─── Global Tension Presets ────────────────────────────────────

export const GLOBAL_SPRING: Record<string, CalibratedSpring> = {
  /** Default UI motion — smooth and confident */
  standard: { mass: 1, stiffness: 170, damping: 26, precision: 0.01 },
  /** Gentle entry — content fading in */
  gentle: { mass: 1, stiffness: 120, damping: 20, precision: 0.01 },
  /** Snappy response — toggles, switches */
  snappy: { mass: 0.8, stiffness: 300, damping: 28, precision: 0.005 },
  /** Heavy/dramatic — modals, full-page */
  heavy: { mass: 1.5, stiffness: 200, damping: 35, precision: 0.01 },
  /** Bouncy — playful micro-interactions */
  bouncy: { mass: 0.6, stiffness: 400, damping: 15, precision: 0.005 },
};

// ─── Alert Tension Presets ─────────────────────────────────────

export const ALERT_SPRING: Record<string, CalibratedSpring> = {
  /** Warning pulse — moderate urgency */
  warning: { mass: 0.8, stiffness: 250, damping: 18, precision: 0.005 },
  /** Critical shake — high urgency, snappy */
  critical: { mass: 0.5, stiffness: 500, damping: 12, precision: 0.003 },
  /** Info slide — calm notification */
  info: { mass: 1, stiffness: 150, damping: 22, precision: 0.01 },
};

// ─── Critical Event Presets ────────────────────────────────────

export const CRITICAL_SPRING: Record<string, CalibratedSpring> = {
  /** Emergency flash — maximum urgency */
  emergency: { mass: 0.3, stiffness: 800, damping: 8, precision: 0.002 },
  /** System alert — firm but not alarming */
  system: { mass: 0.6, stiffness: 400, damping: 16, precision: 0.004 },
  /** Recovery — settling back to calm */
  recovery: { mass: 1.2, stiffness: 100, damping: 30, precision: 0.01 },
};

// ─── Micro Interaction Presets ─────────────────────────────────

export const MICRO_SPRING: Record<string, CalibratedSpring> = {
  /** Hover — instant, barely perceptible */
  hover: { mass: 0.5, stiffness: 600, damping: 30, precision: 0.01 },
  /** Press scale — quick depression */
  press: { mass: 0.4, stiffness: 700, damping: 25, precision: 0.005 },
  /** Focus ring — smooth highlight */
  focus: { mass: 0.8, stiffness: 200, damping: 22, precision: 0.01 },
  /** Tooltip appear — gentle pop */
  tooltip: { mass: 0.6, stiffness: 350, damping: 20, precision: 0.008 },
  /** Ripple expansion — fast spreading */
  ripple: { mass: 0.3, stiffness: 900, damping: 20, precision: 0.003 },
};

// ─── Calibrated Timing (Emotional 3-Phase) ────────────────────

export const CALIBRATED_TIMING: Record<MotionIntent, CalibratedTiming> = {
  navigate: {
    anticipation: { duration: 60, easing: 'cubic-bezier(0.32, 0, 0.67, 0)', scale: 0.98 },
    action:       { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    settling:     { duration: 120, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1.02 },
    totalMs: 460,
  },
  reveal: {
    anticipation: { duration: 40, easing: 'cubic-bezier(0.33, 0, 0.67, 0)', scale: 0.96 },
    action:       { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    settling:     { duration: 100, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1.01 },
    totalMs: 360,
  },
  dismiss: {
    anticipation: { duration: 30, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', scale: 1.02 },
    action:       { duration: 180, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
    settling:     { duration: 0, easing: 'linear', overshoot: 1 },
    totalMs: 210,
  },
  alert: {
    anticipation: { duration: 20, easing: 'cubic-bezier(0.12, 0, 0.39, 0)', scale: 0.95 },
    action:       { duration: 140, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    settling:     { duration: 200, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1.06 },
    totalMs: 360,
  },
  critical: {
    anticipation: { duration: 10, easing: 'cubic-bezier(0.12, 0, 0.39, 0)', scale: 0.93 },
    action:       { duration: 80, easing: 'cubic-bezier(0, 0, 0.2, 1)' },
    settling:     { duration: 300, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1.1 },
    totalMs: 390,
  },
  hover: {
    anticipation: { duration: 0, easing: 'linear', scale: 1 },
    action:       { duration: 60, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    settling:     { duration: 30, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1 },
    totalMs: 90,
  },
  press: {
    anticipation: { duration: 0, easing: 'linear', scale: 1 },
    action:       { duration: 40, easing: 'cubic-bezier(0, 0, 0.2, 1)' },
    settling:     { duration: 80, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1.03 },
    totalMs: 120,
  },
  focus: {
    anticipation: { duration: 0, easing: 'linear', scale: 1 },
    action:       { duration: 100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    settling:     { duration: 60, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1 },
    totalMs: 160,
  },
  drag: {
    anticipation: { duration: 0, easing: 'linear', scale: 1 },
    action:       { duration: 0, easing: 'linear' },
    settling:     { duration: 250, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1.04 },
    totalMs: 250,
  },
  scroll: {
    anticipation: { duration: 0, easing: 'linear', scale: 1 },
    action:       { duration: 0, easing: 'linear' },
    settling:     { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', overshoot: 1 },
    totalMs: 400,
  },
  expand: {
    anticipation: { duration: 50, easing: 'cubic-bezier(0.32, 0, 0.67, 0)', scale: 0.97 },
    action:       { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    settling:     { duration: 150, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', overshoot: 1.015 },
    totalMs: 500,
  },
  collapse: {
    anticipation: { duration: 30, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', scale: 1.01 },
    action:       { duration: 200, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
    settling:     { duration: 0, easing: 'linear', overshoot: 1 },
    totalMs: 230,
  },
};

// ─── Motion Calibration Lab ────────────────────────────────────

export class MotionCalibrationLab {
  private _reducedMotion = false;
  private _globalScale = 1;

  constructor() {
    if (typeof globalThis.window !== 'undefined') {
      const mq = globalThis.window.matchMedia('(prefers-reduced-motion: reduce)');
      this._reducedMotion = mq.matches;
      mq.addEventListener('change', (e) => { this._reducedMotion = e.matches; });
    }
  }

  /** Get spring config for an intent, respecting reduced motion */
  getSpring(intent: MotionIntent): CalibratedSpring {
    if (this._reducedMotion) {
      // Max damping, instant settling
      return { mass: 1, stiffness: 1000, damping: 100, precision: 0.1 };
    }

    const map: Record<string, CalibratedSpring> = {
      navigate: GLOBAL_SPRING.heavy,
      reveal:   GLOBAL_SPRING.gentle,
      dismiss:  GLOBAL_SPRING.snappy,
      alert:    ALERT_SPRING.warning,
      critical: CRITICAL_SPRING.emergency,
      hover:    MICRO_SPRING.hover,
      press:    MICRO_SPRING.press,
      focus:    MICRO_SPRING.focus,
      drag:     GLOBAL_SPRING.standard,
      scroll:   GLOBAL_SPRING.gentle,
      expand:   GLOBAL_SPRING.heavy,
      collapse: GLOBAL_SPRING.snappy,
    };
    return map[intent] || GLOBAL_SPRING.standard;
  }

  /** Get 3-phase timing for an intent */
  getTiming(intent: MotionIntent): CalibratedTiming {
    if (this._reducedMotion) {
      return {
        anticipation: { duration: 0, easing: 'linear', scale: 1 },
        action: { duration: 1, easing: 'linear' },
        settling: { duration: 0, easing: 'linear', overshoot: 1 },
        totalMs: 1,
      };
    }
    const timing = CALIBRATED_TIMING[intent];
    // Apply global scale
    return {
      ...timing,
      anticipation: { ...timing.anticipation, duration: timing.anticipation.duration * this._globalScale },
      action: { ...timing.action, duration: timing.action.duration * this._globalScale },
      settling: { ...timing.settling, duration: timing.settling.duration * this._globalScale },
      totalMs: timing.totalMs * this._globalScale,
    };
  }

  /** Generate CSS transition string for an intent */
  cssTransition(intent: MotionIntent, property = 'all'): string {
    const t = this.getTiming(intent);
    return `${property} ${t.action.duration}ms ${t.action.easing} ${t.anticipation.duration}ms`;
  }

  /** Generate CSS keyframes for full 3-phase animation */
  cssKeyframes(intent: MotionIntent, name: string): string {
    const t = this.getTiming(intent);
    const anticipationEnd = (t.anticipation.duration / t.totalMs) * 100;
    const actionEnd = ((t.anticipation.duration + t.action.duration) / t.totalMs) * 100;

    return `@keyframes ${name} {
      0% { transform: scale(1); opacity: 0; }
      ${anticipationEnd}% { transform: scale(${t.anticipation.scale}); opacity: 0.3; }
      ${actionEnd}% { transform: scale(${t.settling.overshoot}); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }`;
  }

  /** Global speed scale (0.5 = half speed, 2 = double speed) */
  setGlobalScale(scale: number): void {
    this._globalScale = Math.max(0.1, Math.min(3, scale));
  }

  /** Check if user prefers reduced motion */
  isReducedMotion(): boolean {
    return this._reducedMotion;
  }
}

// ─── Singleton ─────────────────────────────────────────────────

let _lab: MotionCalibrationLab | null = null;

export function getMotionLab(): MotionCalibrationLab {
  _lab ??= new MotionCalibrationLab();
  return _lab;
}
