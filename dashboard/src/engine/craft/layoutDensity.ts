/* ================================================================
 *  CRAFT LAYER — Layout Density System (#16)
 *  ─────────────────────────────────────────────────────────────
 *  Information density adapts to persona and context.
 *
 *  Modes:
 *    • Compact   — maximum data density, minimal padding
 *    • Focus     — single-task, centered, generous whitespace
 *    • Cinematic — presentation mode, hero visuals, large type
 *    • Analyst   — multi-panel, split views, data-rich
 *
 *  Density adapts to:
 *    - Screen size (auto), User preference (manual)
 *    - Task context, Time of day, Device type
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export type DensityMode = 'compact' | 'focus' | 'cinematic' | 'analyst'

export interface DensityConfig {
  /** Base spacing unit in px */
  spacingUnit: number
  /** Content max-width */
  contentMaxWidth: string
  /** Panel gap */
  panelGap: string
  /** Font size scale factor */
  fontScale: number
  /** Padding scale factor */
  paddingScale: number
  /** Border radius scale */
  radiusScale: number
  /** Number of visible panels (for grid layouts) */
  panelColumns: number
  /** Card minimum width */
  cardMinWidth: string
  /** Header height */
  headerHeight: string
  /** Sidebar width */
  sidebarWidth: string
  /** Show decorative elements */
  showDecorations: boolean
  /** Animation intensity (0 = none, 1 = full) */
  animationIntensity: number
}

// ─── Density Presets ───────────────────────────────────────────

const DENSITY_PRESETS: Record<DensityMode, DensityConfig> = {
  compact: {
    spacingUnit: 4,
    contentMaxWidth: '100%',
    panelGap: '8px',
    fontScale: 0.9,
    paddingScale: 0.6,
    radiusScale: 0.75,
    panelColumns: 4,
    cardMinWidth: '220px',
    headerHeight: '48px',
    sidebarWidth: '200px',
    showDecorations: false,
    animationIntensity: 0.3,
  },
  focus: {
    spacingUnit: 8,
    contentMaxWidth: '800px',
    panelGap: '24px',
    fontScale: 1.1,
    paddingScale: 1.3,
    radiusScale: 1.2,
    panelColumns: 1,
    cardMinWidth: '400px',
    headerHeight: '64px',
    sidebarWidth: '0px',
    showDecorations: true,
    animationIntensity: 0.8,
  },
  cinematic: {
    spacingUnit: 12,
    contentMaxWidth: '1200px',
    panelGap: '32px',
    fontScale: 1.3,
    paddingScale: 1.6,
    radiusScale: 1.5,
    panelColumns: 2,
    cardMinWidth: '480px',
    headerHeight: '80px',
    sidebarWidth: '0px',
    showDecorations: true,
    animationIntensity: 1,
  },
  analyst: {
    spacingUnit: 4,
    contentMaxWidth: '100%',
    panelGap: '6px',
    fontScale: 0.85,
    paddingScale: 0.5,
    radiusScale: 0.5,
    panelColumns: 6,
    cardMinWidth: '180px',
    headerHeight: '40px',
    sidebarWidth: '240px',
    showDecorations: false,
    animationIntensity: 0.1,
  },
}

// ─── Layout Density Controller ────────────────────────────────

export class LayoutDensityController {
  private _mode: DensityMode = 'focus'
  private _config: DensityConfig
  private _mounted = false
  private _autoDetect = true
  private _resizeObserver: ResizeObserver | null = null

  constructor(mode?: DensityMode) {
    this._mode = mode || 'focus'
    this._config = { ...DENSITY_PRESETS[this._mode] }
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || document === undefined) return
    this._mounted = true

    this._applyDensityVars()

    // Auto-detect density based on viewport
    const browserWindow = globalThis.window
    if (this._autoDetect && browserWindow !== undefined) {
      this._resizeObserver = new ResizeObserver(() => {
        this._autoAdjust()
      })
      this._resizeObserver.observe(document.documentElement)
      this._autoAdjust()
    }
  }

  destroy(): void {
    this._mounted = false
    this._resizeObserver?.disconnect()
    this._resizeObserver = null
  }

  /* ── Mode Control ──────────────────────────────────────────── */

  setMode(mode: DensityMode): void {
    this._mode = mode
    this._config = { ...DENSITY_PRESETS[mode] }
    this._applyDensityVars()
    this._setDataAttribute(mode)
  }

  getMode(): DensityMode {
    return this._mode
  }

  getConfig(): Readonly<DensityConfig> {
    return this._config
  }

  /** Enable/disable auto-detection */
  setAutoDetect(enabled: boolean): void {
    this._autoDetect = enabled
  }

  /* ── Internal ──────────────────────────────────────────────── */

  private _autoAdjust(): void {
    const browserWindow = globalThis.window
    if (browserWindow === undefined || !this._autoDetect) return

    const w = browserWindow.innerWidth
    const h = browserWindow.innerHeight
    const aspect = w / h

    let suggested: DensityMode
    if (w < 768) {
      suggested = 'compact'
    } else if (w < 1280) {
      suggested = 'focus'
    } else if (aspect > 2) {
      // Ultra-wide → analyst mode
      suggested = 'analyst'
    } else if (w >= 1920) {
      suggested = 'cinematic'
    } else {
      suggested = 'focus'
    }

    if (suggested !== this._mode) {
      this.setMode(suggested)
    }
  }

  private _applyDensityVars(): void {
    if (globalThis.document === undefined) return
    const c = this._config

    const vars: Record<string, string> = {
      '--density-spacing': `${c.spacingUnit}px`,
      '--density-content-max': c.contentMaxWidth,
      '--density-panel-gap': c.panelGap,
      '--density-font-scale': String(c.fontScale),
      '--density-padding-scale': String(c.paddingScale),
      '--density-radius-scale': String(c.radiusScale),
      '--density-columns': String(c.panelColumns),
      '--density-card-min': c.cardMinWidth,
      '--density-header-h': c.headerHeight,
      '--density-sidebar-w': c.sidebarWidth,
      '--density-animation': String(c.animationIntensity),
    }

    const root = document.documentElement
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v)
    }
  }

  private _setDataAttribute(mode: DensityMode): void {
    if (globalThis.document === undefined) return
    document.documentElement.dataset.density = mode
  }

}

export { DENSITY_PRESETS }
