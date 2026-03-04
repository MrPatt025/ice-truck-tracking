/* ================================================================
 *  CRAFT LAYER — Emotional Timing System (#15)
 *  ─────────────────────────────────────────────────────────────
 *  Humans perceive motion in 3 phases:
 *
 *    1. ANTICIPATION  — wind-up, subtle scale-down
 *    2. ACTION        — the primary movement
 *    3. SETTLING      — elastic rest, overshoot decay
 *
 *  Every animation must include all 3 phases.
 *  This system creates, validates, and enforces the pattern.
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export interface EmotionalPhase {
  duration: number;    // ms
  easing: string;      // CSS easing function
  transform: string;   // CSS transform at phase end
  opacity?: number;    // 0-1
}

export interface EmotionalSequence {
  anticipation: EmotionalPhase;
  action: EmotionalPhase;
  settling: EmotionalPhase;
  totalMs: number;
}

export type EmotionalTone =
  | 'confident'   // strong, deliberate
  | 'gentle'      // soft, understated
  | 'urgent'      // fast, attention-grabbing
  | 'playful'     // bouncy, delightful
  | 'dramatic'    // slow, cinematic
  | 'clinical';   // precise, mechanical

// ─── Tone Presets ──────────────────────────────────────────────

const TONE_SEQUENCES: Record<EmotionalTone, EmotionalSequence> = {
  confident: {
    anticipation: { duration: 50, easing: 'cubic-bezier(0.32, 0, 0.67, 0)', transform: 'scale(0.98)', opacity: 0.9 },
    action:       { duration: 250, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', transform: 'scale(1.01)' },
    settling:     { duration: 100, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', transform: 'scale(1)', opacity: 1 },
    totalMs: 400,
  },
  gentle: {
    anticipation: { duration: 80, easing: 'cubic-bezier(0.33, 0, 0.67, 0)', transform: 'scale(0.99) translateY(2px)', opacity: 0.7 },
    action:       { duration: 350, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', transform: 'scale(1) translateY(-1px)' },
    settling:     { duration: 200, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', transform: 'scale(1) translateY(0)', opacity: 1 },
    totalMs: 630,
  },
  urgent: {
    anticipation: { duration: 15, easing: 'cubic-bezier(0.12, 0, 0.39, 0)', transform: 'scale(0.95)', opacity: 0.95 },
    action:       { duration: 80, easing: 'cubic-bezier(0, 0, 0.2, 1)', transform: 'scale(1.03)' },
    settling:     { duration: 150, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', transform: 'scale(1)', opacity: 1 },
    totalMs: 245,
  },
  playful: {
    anticipation: { duration: 60, easing: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)', transform: 'scale(0.92) rotate(-2deg)' },
    action:       { duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', transform: 'scale(1.06) rotate(1deg)' },
    settling:     { duration: 300, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', transform: 'scale(1) rotate(0)' },
    totalMs: 560,
  },
  dramatic: {
    anticipation: { duration: 200, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', transform: 'scale(0.96) translateY(4px)', opacity: 0.6 },
    action:       { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', transform: 'scale(1.02) translateY(-2px)' },
    settling:     { duration: 350, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', transform: 'scale(1) translateY(0)', opacity: 1 },
    totalMs: 1050,
  },
  clinical: {
    anticipation: { duration: 0, easing: 'linear', transform: 'scale(1)', opacity: 1 },
    action:       { duration: 150, easing: 'cubic-bezier(0.2, 0, 0, 1)', transform: 'scale(1)' },
    settling:     { duration: 50, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', transform: 'scale(1)', opacity: 1 },
    totalMs: 200,
  },
};

// ─── Emotional Timing Engine ──────────────────────────────────

export class EmotionalTimingEngine {
  private _reducedMotion = false;
  private _timeScale = 1;
  private _activeAnimations = new Map<string, { raf: number; startTime: number }>();

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._reducedMotion = mq.matches;
      mq.addEventListener('change', (e) => { this._reducedMotion = e.matches; });
    }
  }

  /** Animate an element through all 3 emotional phases */
  animate(
    el: HTMLElement,
    tone: EmotionalTone,
    options?: {
      direction?: 'in' | 'out';
      onComplete?: () => void;
      id?: string;
    },
  ): void {
    const seq = this.getSequence(tone);
    if (this._reducedMotion) {
      // Instant — no animation, just final state
      el.style.transform = seq.settling.transform;
      el.style.opacity = String(seq.settling.opacity ?? 1);
      options?.onComplete?.();
      return;
    }

    const id = options?.id || `emo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isOut = options?.direction === 'out';
    const phases = isOut
      ? [seq.settling, seq.action, seq.anticipation]  // Reverse for exit
      : [seq.anticipation, seq.action, seq.settling];

    const totalDuration = seq.totalMs * this._timeScale;
    const phaseDurations = phases.map((p) => p.duration * this._timeScale);
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      let phaseTime = 0;
      let currentPhase = 0;

      // Determine which phase we're in
      for (let i = 0; i < phaseDurations.length; i++) {
        if (elapsed < phaseTime + phaseDurations[i]) {
          currentPhase = i;
          break;
        }
        phaseTime += phaseDurations[i];
        if (i === phaseDurations.length - 1) currentPhase = i;
      }

      const phase = phases[currentPhase];
      el.style.transform = phase.transform;
      el.style.transition = `transform ${phase.duration * this._timeScale}ms ${phase.easing}, opacity ${phase.duration * this._timeScale}ms ${phase.easing}`;
      if (phase.opacity !== undefined) {
        el.style.opacity = String(phase.opacity);
      }

      if (elapsed < totalDuration) {
        const raf = requestAnimationFrame(step);
        this._activeAnimations.set(id, { raf, startTime });
      } else {
        // Final state
        const final = phases[phases.length - 1];
        el.style.transform = final.transform;
        el.style.opacity = String(final.opacity ?? 1);
        this._activeAnimations.delete(id);
        options?.onComplete?.();
      }
    };

    const raf = requestAnimationFrame(step);
    this._activeAnimations.set(id, { raf, startTime });
  }

  /** Cancel a running animation */
  cancel(id: string): void {
    const a = this._activeAnimations.get(id);
    if (a) {
      cancelAnimationFrame(a.raf);
      this._activeAnimations.delete(id);
    }
  }

  /** Cancel all running animations */
  cancelAll(): void {
    this._activeAnimations.forEach((a) => cancelAnimationFrame(a.raf));
    this._activeAnimations.clear();
  }

  /** Get the timing sequence for a tone */
  getSequence(tone: EmotionalTone): EmotionalSequence {
    return TONE_SEQUENCES[tone];
  }

  /** Generate CSS @keyframes string */
  toKeyframes(tone: EmotionalTone, name: string): string {
    const seq = TONE_SEQUENCES[tone];
    const aEnd = (seq.anticipation.duration / seq.totalMs) * 100;
    const actEnd = ((seq.anticipation.duration + seq.action.duration) / seq.totalMs) * 100;

    return `@keyframes ${name} {
  0% {
    transform: scale(1);
    opacity: ${seq.anticipation.opacity ?? 1};
  }
  ${aEnd.toFixed(1)}% {
    transform: ${seq.anticipation.transform};
    opacity: ${seq.anticipation.opacity ?? 1};
  }
  ${actEnd.toFixed(1)}% {
    transform: ${seq.action.transform};
    opacity: ${seq.action.opacity ?? 1};
  }
  100% {
    transform: ${seq.settling.transform};
    opacity: ${seq.settling.opacity ?? 1};
  }
}`;
  }

  /** Generate CSS animation shorthand */
  toCSSAnimation(tone: EmotionalTone, name: string): string {
    const seq = TONE_SEQUENCES[tone];
    return `${name} ${seq.totalMs * this._timeScale}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`;
  }

  /** Set global time scale (0.5 = slow-mo, 2 = double speed) */
  setTimeScale(scale: number): void {
    this._timeScale = Math.max(0.1, Math.min(3, scale));
  }

  /** Validate an animation has all 3 phases */
  validate(seq: EmotionalSequence): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (seq.anticipation.duration <= 0 && seq.settling.duration <= 0) {
      issues.push('Missing both anticipation and settling phases — motion will feel mechanical');
    }
    if (seq.totalMs > 1200) {
      issues.push(`Total duration ${seq.totalMs}ms exceeds 1200ms budget`);
    }
    if (seq.settling.duration < seq.anticipation.duration * 0.5) {
      issues.push('Settling phase too short relative to anticipation — motion will feel abrupt');
    }
    return { valid: issues.length === 0, issues };
  }

  destroy(): void {
    this.cancelAll();
  }
}

// ─── Singleton ─────────────────────────────────────────────────

let _engine: EmotionalTimingEngine | null = null;

export function getEmotionalEngine(): EmotionalTimingEngine {
  if (!_engine) _engine = new EmotionalTimingEngine();
  return _engine;
}

export { TONE_SEQUENCES };
