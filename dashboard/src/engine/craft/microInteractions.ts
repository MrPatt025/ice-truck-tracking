/* ================================================================
 *  CRAFT LAYER — Micro-Interaction Intelligence (#10)
 *  ─────────────────────────────────────────────────────────────
 *  No interaction is static. Every touch has consequence.
 *
 *  Every interaction includes:
 *    • Press scale 0.97      — tactile depression
 *    • Ripple energy decay   — outward spreading ring
 *    • Subtle glow burst     — luminous feedback
 *    • Haptic vibration      — mobile tactile feedback
 *
 *  Applied via CSS + JS hybrid for maximum performance.
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export interface MicroInteractionConfig {
  pressScale: number;       // default 0.97
  rippleEnabled: boolean;
  glowEnabled: boolean;
  hapticEnabled: boolean;
  hapticDuration: number;   // ms
}

export type InteractionType = 'press' | 'release' | 'hover-in' | 'hover-out' | 'focus' | 'blur';

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_CONFIG: MicroInteractionConfig = {
  pressScale: 0.97,
  rippleEnabled: true,
  glowEnabled: true,
  hapticEnabled: true,
  hapticDuration: 10,
};

// ─── Ripple Effect ─────────────────────────────────────────────

function createRipple(el: HTMLElement, x: number, y: number, color = 'oklch(0.85 0.10 250 / 0.15)'): void {
  const rect = el.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height) * 2;

  Object.assign(ripple.style, {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    left: `${x - rect.left - size / 2}px`,
    top: `${y - rect.top - size / 2}px`,
    borderRadius: '50%',
    background: color,
    transform: 'scale(0)',
    opacity: '1',
    pointerEvents: 'none',
    zIndex: '1',
  });

  // Ensure parent has overflow hidden and relative position
  const computedPos = getComputedStyle(el).position;
  if (computedPos === 'static') {
    el.style.position = 'relative';
  }
  el.style.overflow = 'hidden';

  el.appendChild(ripple);

  const anim = ripple.animate(
    [
      { transform: 'scale(0)', opacity: '0.6' },
      { transform: 'scale(1)', opacity: '0' },
    ],
    {
      duration: 500,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    },
  );

  anim.onfinish = () => ripple.remove();
}

// ─── Glow Burst ────────────────────────────────────────────────

function createGlowBurst(el: HTMLElement, color = 'oklch(0.80 0.12 250 / 0.3)'): void {
  const rect = el.getBoundingClientRect();
  const glow = document.createElement('div');

  Object.assign(glow.style, {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top + rect.height / 2}px`,
    width: `${rect.width * 1.5}px`,
    height: `${rect.height * 1.5}px`,
    transform: 'translate(-50%, -50%) scale(0.8)',
    borderRadius: getComputedStyle(el).borderRadius || '8px',
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: '99990',
  });

  document.body.appendChild(glow);

  const anim = glow.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.8)', opacity: '0.6' },
      { transform: 'translate(-50%, -50%) scale(1.2)', opacity: '0' },
    ],
    {
      duration: 350,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    },
  );

  anim.onfinish = () => glow.remove();
}

// ─── Haptic Feedback ──────────────────────────────────────────

function triggerHaptic(duration: number): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

// ─── Micro-Interaction Controller ─────────────────────────────

export class MicroInteractionController {
  private readonly _config: MicroInteractionConfig;
  private _styleEl: HTMLStyleElement | null = null;
  private _mounted = false;
  private readonly _targets = new Set<HTMLElement>();
  private readonly _boundHandlers = new WeakMap<HTMLElement, Record<string, EventListener>>();

  constructor(config?: Partial<MicroInteractionConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || typeof document === 'undefined') return;
    this._mounted = true;
    this._injectStyles();
  }

  destroy(): void {
    this._mounted = false;
    this._targets.forEach((el) => this.detach(el));
    this._targets.clear();
    this._styleEl?.remove();
    this._styleEl = null;
  }

  /* ── Element Registration ──────────────────────────────────── */

  /** Attach micro-interaction physics to an element */
  attach(el: HTMLElement, options?: { rippleColor?: string; glowColor?: string }): void {
    if (this._targets.has(el)) return;
    this._targets.add(el);

    el.dataset.craftInteractive = 'true';
    el.style.willChange = 'transform';

    const handlers: Record<string, EventListener> = {
      pointerdown: ((e: PointerEvent) => {
        this._onPress(el, e, options);
      }) as EventListener,
      pointerup: (() => {
        this._onRelease(el);
      }) as EventListener,
      pointerenter: (() => {
        this._onHoverIn(el);
      }) as EventListener,
      pointerleave: (() => {
        this._onHoverOut(el);
      }) as EventListener,
    };

    this._boundHandlers.set(el, handlers);

    for (const [event, handler] of Object.entries(handlers)) {
      el.addEventListener(event, handler, { passive: true });
    }
  }

  /** Detach micro-interactions from an element */
  detach(el: HTMLElement): void {
    const handlers = this._boundHandlers.get(el);
    if (handlers) {
      for (const [event, handler] of Object.entries(handlers)) {
        el.removeEventListener(event, handler);
      }
      this._boundHandlers.delete(el);
    }
    delete el.dataset.craftInteractive;
    this._targets.delete(el);
  }

  /* ── Interaction Handlers ──────────────────────────────────── */

  private _onPress(el: HTMLElement, e: PointerEvent, options?: { rippleColor?: string; glowColor?: string }): void {
    // 1. Press scale
    el.style.transform = `scale(${this._config.pressScale})`;
    el.style.transition = 'transform 60ms cubic-bezier(0, 0, 0.2, 1)';

    // 2. Ripple
    if (this._config.rippleEnabled) {
      createRipple(el, e.clientX, e.clientY, options?.rippleColor);
    }

    // 3. Glow burst
    if (this._config.glowEnabled) {
      createGlowBurst(el, options?.glowColor);
    }

    // 4. Haptic
    if (this._config.hapticEnabled) {
      triggerHaptic(this._config.hapticDuration);
    }
  }

  private _onRelease(el: HTMLElement): void {
    el.style.transform = 'scale(1)';
    el.style.transition = 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)';
  }

  private _onHoverIn(el: HTMLElement): void {
    el.style.transform = 'scale(1.02)';
    el.style.transition = 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)';
  }

  private _onHoverOut(el: HTMLElement): void {
    el.style.transform = 'scale(1)';
    el.style.transition = 'transform 200ms cubic-bezier(0.33, 1, 0.68, 1)';
  }

  /* ── Injected Styles ───────────────────────────────────────── */

  private _injectStyles(): void {
    if (typeof document === 'undefined') return;

    const css = `
      [data-craft-interactive] {
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      [data-craft-interactive]:active {
        transform: scale(${this._config.pressScale});
      }

      [data-craft-interactive]:focus-visible {
        outline: 2px solid oklch(0.75 0.15 250 / 0.6);
        outline-offset: 2px;
      }
    `;

    this._styleEl = document.createElement('style');
    this._styleEl.dataset.craft = 'micro-interactions';
    this._styleEl.textContent = css;
    document.head.appendChild(this._styleEl);
  }
}
