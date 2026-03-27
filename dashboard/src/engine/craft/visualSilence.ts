/* ================================================================
 *  CRAFT LAYER — Visual Silence Principle (#18)
 *  ─────────────────────────────────────────────────────────────
 *  Luxury = Reduction. Awwwards-level negative space.
 *
 *  This system enforces:
 *    • Negative space discipline — generous margins/padding
 *    • Reduced UI chrome         — minimize borders/dividers
 *    • Maximized breathing room  — content-to-chrome ratio
 *    • Progressive disclosure    — reveal details on demand
 *    • Quiet confidence          — no gratuitous animation
 *
 *  Operates as CSS custom properties + utility classes.
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export type SilenceLevel = 'minimal' | 'balanced' | 'maximal';

export interface VisualSilenceConfig {
  level: SilenceLevel;
  removeBorders: boolean;
  fadeChrome: boolean;         // fade non-essential chrome on idle
  chromeOpacity: number;       // opacity for non-essential UI
  contentMaxWidth: string;     // max readable content width
  breathingMultiplier: number; // multiplier for spacing
}

// ─── Presets ──────────────────────────────────────────────────

const SILENCE_PRESETS: Record<SilenceLevel, VisualSilenceConfig> = {
  minimal: {
    level: 'minimal',
    removeBorders: false,
    fadeChrome: false,
    chromeOpacity: 1,
    contentMaxWidth: '1400px',
    breathingMultiplier: 1,
  },
  balanced: {
    level: 'balanced',
    removeBorders: true,
    fadeChrome: true,
    chromeOpacity: 0.6,
    contentMaxWidth: '1200px',
    breathingMultiplier: 1.3,
  },
  maximal: {
    level: 'maximal',
    removeBorders: true,
    fadeChrome: true,
    chromeOpacity: 0.35,
    contentMaxWidth: '960px',
    breathingMultiplier: 1.6,
  },
};

// ─── Visual Silence Controller ────────────────────────────────

export class VisualSilenceController {
  private _config: VisualSilenceConfig;
  private _styleEl: HTMLStyleElement | null = null;
  private _mounted = false;
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _isIdle = false;

  constructor(level: SilenceLevel = 'balanced') {
    this._config = { ...SILENCE_PRESETS[level] };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || typeof document === 'undefined') return;
    this._mounted = true;
    this._injectStyles();
    this._applyVars();

    if (this._config.fadeChrome) {
      this._setupIdleDetection();
    }
  }

  destroy(): void {
    this._mounted = false;
    this._styleEl?.remove();
    this._styleEl = null;
    if (this._idleTimer) clearTimeout(this._idleTimer);

    if (typeof document !== 'undefined') {
      delete document.documentElement.dataset.silence;
      delete document.documentElement.dataset.silenceIdle;
    }
  }

  /* ── Public API ────────────────────────────────────────────── */

  setLevel(level: SilenceLevel): void {
    this._config = { ...SILENCE_PRESETS[level] };
    this._applyVars();
    this._updateStyles();
  }

  getLevel(): SilenceLevel {
    return this._config.level;
  }

  /** Mark an element as non-essential chrome (fades on idle) */
  markAsChrome(el: HTMLElement): void {
    el.dataset.silenceChrome = 'true';
  }

  /** Mark an element as essential (never fades) */
  markAsEssential(el: HTMLElement): void {
    el.dataset.silenceEssential = 'true';
  }

  /** Force idle state (useful for demo/testing) */
  setIdle(idle: boolean): void {
    this._isIdle = idle;
    if (typeof document !== 'undefined') {
      if (idle) {
        document.documentElement.dataset.silenceIdle = 'true';
      } else {
        delete document.documentElement.dataset.silenceIdle;
      }
    }
  }

  /* ── Internal ──────────────────────────────────────────────── */

  private _applyVars(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const m = this._config.breathingMultiplier;

    root.style.setProperty('--silence-breathing', String(m));
    root.style.setProperty('--silence-chrome-opacity', String(this._config.chromeOpacity));
    root.style.setProperty('--silence-max-width', this._config.contentMaxWidth);

    // Spacing scale (base * multiplier)
    root.style.setProperty('--silence-space-xs', `${4 * m}px`);
    root.style.setProperty('--silence-space-sm', `${8 * m}px`);
    root.style.setProperty('--silence-space-md', `${16 * m}px`);
    root.style.setProperty('--silence-space-lg', `${24 * m}px`);
    root.style.setProperty('--silence-space-xl', `${40 * m}px`);
    root.style.setProperty('--silence-space-2xl', `${64 * m}px`);

    root.dataset.silence = this._config.level;
  }

  private _injectStyles(): void {
    if (typeof document === 'undefined') return;

    this._styleEl = document.createElement('style');
    this._styleEl.dataset.craft = 'visual-silence';
    this._updateStyles();
    document.head.appendChild(this._styleEl);
  }

  private _updateStyles(): void {
    if (!this._styleEl) return;

    const borderRule = this._config.removeBorders
      ? `[data-silence="balanced"] [data-silence-chrome],
         [data-silence="maximal"] [data-silence-chrome] {
           border-color: transparent !important;
         }`
      : '';

    this._styleEl.textContent = `
      /* ── Visual Silence — Breathing Room ─────────────── */

      [data-silence] {
        --silence-transition: opacity 600ms cubic-bezier(0.33, 1, 0.68, 1);
      }

      /* Non-essential chrome fading */
      [data-silence-chrome] {
        transition: var(--silence-transition);
        opacity: var(--silence-chrome-opacity, 1);
      }

      /* Idle state — further reduce chrome */
      [data-silence-idle] [data-silence-chrome] {
        opacity: calc(var(--silence-chrome-opacity, 1) * 0.5);
      }

      /* Essential elements always remain visible */
      [data-silence-essential] {
        opacity: 1 !important;
      }

      ${borderRule}

      /* Content width constraint */
      [data-silence] .silence-content {
        max-width: var(--silence-max-width, 1200px);
        margin-inline: auto;
      }

      /* Spacing utilities */
      .silence-pad {
        padding: var(--silence-space-md);
      }
      .silence-pad-lg {
        padding: var(--silence-space-lg);
      }
      .silence-gap {
        gap: var(--silence-space-md);
      }
      .silence-gap-lg {
        gap: var(--silence-space-lg);
      }

      /* Progressive disclosure */
      [data-silence] .silence-reveal {
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 300ms ease, transform 300ms ease;
        pointer-events: none;
      }
      [data-silence] *:hover > .silence-reveal,
      [data-silence] *:focus-within > .silence-reveal {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      /* Maximal mode — ultra-clean look */
      [data-silence="maximal"] hr,
      [data-silence="maximal"] .divider {
        opacity: 0.15;
      }

      [data-silence="maximal"] .border {
        border-color: oklch(0.5 0 0 / 0.08);
      }
    `;
  }

  private _setupIdleDetection(): void {
    const browserWindow = globalThis.window;
    if (browserWindow === undefined) return;

    const resetIdle = () => {
      if (this._isIdle) {
        this.setIdle(false);
      }
      if (this._idleTimer) clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => this.setIdle(true), 30_000);
    };

    browserWindow.addEventListener('mousemove', resetIdle, { passive: true });
    browserWindow.addEventListener('keydown', resetIdle, { passive: true });
    browserWindow.addEventListener('scroll', resetIdle, { passive: true });

    // Start initial timer
    this._idleTimer = setTimeout(() => this.setIdle(true), 30_000);
  }
}

export { SILENCE_PRESETS };
