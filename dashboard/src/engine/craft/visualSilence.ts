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

export type SilenceLevel = 'minimal' | 'balanced' | 'maximal'

export interface VisualSilenceConfig {
  level: SilenceLevel
  removeBorders: boolean
  fadeChrome: boolean // fade non-essential chrome on idle
  chromeOpacity: number // opacity for non-essential UI
  contentMaxWidth: string // max readable content width
  breathingMultiplier: number // multiplier for spacing
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
}

// ─── Visual Silence Controller ────────────────────────────────

export class VisualSilenceController {
  private _config: VisualSilenceConfig
  private _mounted = false
  private _idleTimer: ReturnType<typeof setTimeout> | null = null
  private _isIdle = false

  constructor(level: SilenceLevel = 'balanced') {
    this._config = { ...SILENCE_PRESETS[level] }
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || globalThis.document === undefined) return
    this._mounted = true
    this._applyVars()

    if (this._config.fadeChrome) {
      this._setupIdleDetection()
    }
  }

  destroy(): void {
    this._mounted = false
    if (this._idleTimer) clearTimeout(this._idleTimer)

    if (globalThis.document !== undefined) {
      delete document.documentElement.dataset.silence
      delete document.documentElement.dataset.silenceIdle
    }
  }

  /* ── Public API ────────────────────────────────────────────── */

  setLevel(level: SilenceLevel): void {
    this._config = { ...SILENCE_PRESETS[level] }
    this._applyVars()
  }

  getLevel(): SilenceLevel {
    return this._config.level
  }

  /** Mark an element as non-essential chrome (fades on idle) */
  markAsChrome(el: HTMLElement): void {
    el.dataset.silenceChrome = 'true'
  }

  /** Mark an element as essential (never fades) */
  markAsEssential(el: HTMLElement): void {
    el.dataset.silenceEssential = 'true'
  }

  /** Force idle state (useful for demo/testing) */
  setIdle(idle: boolean): void {
    this._isIdle = idle

    if (globalThis.document === undefined) return

    if (idle) {
      document.documentElement.dataset.silenceIdle = 'true'
      return
    }

    delete document.documentElement.dataset.silenceIdle
  }

  private _applyVars(): void {
    if (globalThis.document === undefined) return

    const root = document.documentElement
    const { level, chromeOpacity, contentMaxWidth, breathingMultiplier } = this._config

    root.dataset.silence = level
    root.style.setProperty('--silence-chrome-opacity', String(chromeOpacity))
    root.style.setProperty('--silence-max-width', contentMaxWidth)
    root.style.setProperty('--silence-breathing', String(breathingMultiplier))
  }

  private _setupIdleDetection(): void {
    const browserWindow = globalThis.window
    if (browserWindow === undefined) return

    const resetIdle = () => {
      if (this._isIdle) {
        this.setIdle(false)
      }
      if (this._idleTimer) clearTimeout(this._idleTimer)
      this._idleTimer = setTimeout(() => this.setIdle(true), 30_000)
    }

    browserWindow.addEventListener('mousemove', resetIdle, { passive: true })
    browserWindow.addEventListener('keydown', resetIdle, { passive: true })
    browserWindow.addEventListener('scroll', resetIdle, { passive: true })

    // Start initial timer
    this._idleTimer = setTimeout(() => this.setIdle(true), 30_000)
  }
}

export { SILENCE_PRESETS }
