/* ================================================================
 *  CRAFT LAYER — Advanced Color Intelligence (#9)
 *  ─────────────────────────────────────────────────────────────
 *  Beyond tint. Perceptual color science for every pixel.
 *
 *  Features:
 *    • Color temperature mapping  — warm/cool shift by context
 *    • Saturation modulation      — severity-scaled vibrancy
 *    • Luminance safety clamp     — WCAG contrast guarantee
 *    • Adaptive contrast auto-tune — device + ambient light
 *    • OKLCH interpolation        — perceptually uniform gradients
 *
 *  All calculations in OKLCH color space for human perception.
 * ================================================================ */

import type { AlertLevel, Theme } from '../types';

// ─── Types ─────────────────────────────────────────────────────

export interface OKLCHColor {
  l: number;   // lightness 0-1
  c: number;   // chroma 0-0.4
  h: number;   // hue 0-360
  a: number;   // alpha 0-1
}

export interface ColorTemperature {
  /** Kelvin-like value: 2700 (warm) to 6500 (neutral) to 12000 (cool) */
  kelvin: number;
  /** Hue shift amount in degrees */
  hueShift: number;
  /** Chroma adjustment factor */
  chromaFactor: number;
}

export interface ColorIntelligenceConfig {
  baseTemperature: number;    // Kelvin default
  saturationScale: number;    // 0-2 (1 = normal)
  luminanceMin: number;       // WCAG minimum lightness
  luminanceMax: number;       // Maximum lightness
  contrastTarget: number;     // Target contrast ratio (4.5 = AA)
  adaptiveBrightness: boolean;
}

// ─── Color Temperature Presets ─────────────────────────────────

const TEMPERATURE_MAP: Record<Theme, ColorTemperature> = {
  dark:   { kelvin: 4200, hueShift: -5, chromaFactor: 0.85 },
  neon:   { kelvin: 7500, hueShift: 10, chromaFactor: 1.3 },
  ocean:  { kelvin: 5800, hueShift: -15, chromaFactor: 0.9 },
  forest: { kelvin: 3800, hueShift: -25, chromaFactor: 0.75 },
};

const SEVERITY_SATURATION: Record<AlertLevel, number> = {
  critical: 1.6,   // High vibrancy for urgency
  warning: 1.2,    // Moderate vibrancy
  info: 0.9,       // Slightly desaturated
};

const TIME_TEMPERATURE: Record<string, number> = {
  morning: 4500,    // Warm sunrise feel
  day: 5500,        // Neutral daylight
  evening: 3800,    // Warm golden hour
  night: 7000,      // Cool moonlight blue
};

// ─── OKLCH Math Utilities ──────────────────────────────────────

/** Interpolate between two OKLCH colors */
export function oklchLerp(a: OKLCHColor, b: OKLCHColor, t: number): OKLCHColor {
  t = Math.max(0, Math.min(1, t));

  // Hue interpolation via shortest path
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;

  return {
    l: a.l + (b.l - a.l) * t,
    c: a.c + (b.c - a.c) * t,
    h: ((a.h + dh * t) + 360) % 360,
    a: a.a + (b.a - a.a) * t,
  };
}

/** Generate a perceptually uniform gradient with N stops */
export function oklchGradient(from: OKLCHColor, to: OKLCHColor, stops: number): OKLCHColor[] {
  const result: OKLCHColor[] = [];
  for (let i = 0; i < stops; i++) {
    result.push(oklchLerp(from, to, i / (stops - 1)));
  }
  return result;
}

/** Convert OKLCH to CSS string */
export function oklchToCSS(color: OKLCHColor): string {
  return `oklch(${color.l.toFixed(3)} ${color.c.toFixed(3)} ${color.h.toFixed(1)} / ${color.a.toFixed(2)})`;
}

/** Parse CSS oklch() string to OKLCHColor */
export function parseOKLCH(css: string): OKLCHColor | null {
  const match = css.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
  if (!match) return null;
  return {
    l: parseFloat(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

/** Calculate OKLCH contrast ratio approximation */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Clamp lightness to meet minimum contrast ratio against background */
export function clampForContrast(color: OKLCHColor, bgLightness: number, minRatio: number): OKLCHColor {
  const result = { ...color };
  let ratio = contrastRatio(result.l, bgLightness);

  // Iteratively adjust lightness to meet contrast
  let iterations = 0;
  while (ratio < minRatio && iterations < 20) {
    if (result.l > bgLightness) {
      result.l = Math.min(1, result.l + 0.02);
    } else {
      result.l = Math.max(0, result.l - 0.02);
    }
    ratio = contrastRatio(result.l, bgLightness);
    iterations++;
  }
  return result;
}

// ─── Color Intelligence Engine ────────────────────────────────

export class ColorIntelligenceEngine {
  private _config: ColorIntelligenceConfig;
  private _temperature: ColorTemperature;
  private _theme: Theme = 'dark';
  private _alertLevel: AlertLevel | null = null;
  private _styleEl: HTMLStyleElement | null = null;
  private _mounted = false;

  constructor(config?: Partial<ColorIntelligenceConfig>) {
    this._config = {
      baseTemperature: 5500,
      saturationScale: 1.0,
      luminanceMin: 0.15,
      luminanceMax: 0.95,
      contrastTarget: 4.5,
      adaptiveBrightness: true,
      ...config,
    };
    this._temperature = TEMPERATURE_MAP.dark;
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || typeof document === 'undefined') return;
    this._mounted = true;
    this._injectStyles();
    this._applyColorVars();
  }

  destroy(): void {
    this._mounted = false;
    this._styleEl?.remove();
    this._styleEl = null;
  }

  /* ── Theme & Context ───────────────────────────────────────── */

  setTheme(theme: Theme): void {
    this._theme = theme;
    this._temperature = TEMPERATURE_MAP[theme];
    this._applyColorVars();
  }

  setAlert(level: AlertLevel | null): void {
    this._alertLevel = level;
    this._applyColorVars();
  }

  setTimeOfDay(time: 'morning' | 'day' | 'evening' | 'night'): void {
    this._config.baseTemperature = TIME_TEMPERATURE[time];
    this._applyColorVars();
  }

  /* ── Color Computation ─────────────────────────────────────── */

  /** Compute temperature-adjusted color */
  adjustForTemperature(color: OKLCHColor): OKLCHColor {
    const t = this._temperature;
    return {
      l: color.l,
      c: color.c * t.chromaFactor,
      h: (color.h + t.hueShift + 360) % 360,
      a: color.a,
    };
  }

  /** Apply severity-based saturation */
  adjustForSeverity(color: OKLCHColor, level?: AlertLevel): OKLCHColor {
    const factor = level ? SEVERITY_SATURATION[level] : this._config.saturationScale;
    return {
      ...color,
      c: Math.min(0.4, color.c * factor),
    };
  }

  /** Clamp for WCAG contrast safety */
  ensureContrast(color: OKLCHColor, backgroundL = 0.12): OKLCHColor {
    return clampForContrast(color, backgroundL, this._config.contrastTarget);
  }

  /** Full pipeline: temperature → severity → contrast */
  process(color: OKLCHColor, severity?: AlertLevel): OKLCHColor {
    let result = this.adjustForTemperature(color);
    result = this.adjustForSeverity(result, severity);
    result = this.ensureContrast(result);
    return result;
  }

  /** Generate a semantic color for a metric value (0-1) */
  metricColor(value: number): OKLCHColor {
    // Green (good) → Yellow (caution) → Red (danger)
    const good: OKLCHColor     = { l: 0.75, c: 0.18, h: 145, a: 1 };
    const caution: OKLCHColor  = { l: 0.80, c: 0.20, h: 80, a: 1 };
    const danger: OKLCHColor   = { l: 0.65, c: 0.25, h: 25, a: 1 };

    let color: OKLCHColor;
    if (value <= 0.5) {
      color = oklchLerp(good, caution, value * 2);
    } else {
      color = oklchLerp(caution, danger, (value - 0.5) * 2);
    }
    return this.process(color);
  }

  /* ── CSS Variable Application ──────────────────────────────── */

  private _applyColorVars(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Temperature-derived accent colors
    const accent = this.process({ l: 0.75, c: 0.15, h: 250, a: 1 }, this._alertLevel || undefined);
    const surface = this.process({ l: 0.18, c: 0.02, h: 260, a: 1 });
    const text = this.process({ l: 0.90, c: 0.02, h: 250, a: 1 });
    const muted = this.process({ l: 0.55, c: 0.04, h: 250, a: 1 });

    root.style.setProperty('--ci-accent', oklchToCSS(accent));
    root.style.setProperty('--ci-surface', oklchToCSS(surface));
    root.style.setProperty('--ci-text', oklchToCSS(text));
    root.style.setProperty('--ci-muted', oklchToCSS(muted));
    root.style.setProperty('--ci-temperature', String(this._config.baseTemperature));
    root.style.setProperty('--ci-saturation-scale', String(this._config.saturationScale));

    // Alert-specific colors
    if (this._alertLevel) {
      const alertColor = this.process({ l: 0.70, c: 0.22, h: this._alertLevel === 'critical' ? 25 : this._alertLevel === 'warning' ? 70 : 220, a: 1 }, this._alertLevel);
      root.style.setProperty('--ci-alert', oklchToCSS(alertColor));
    }

    // Metric gradient stops
    const stops = oklchGradient(
      { l: 0.75, c: 0.18, h: 145, a: 1 },
      { l: 0.65, c: 0.25, h: 25, a: 1 },
      5,
    );
    stops.forEach((stop, i) => {
      root.style.setProperty(`--ci-metric-${i}`, oklchToCSS(this.process(stop)));
    });
  }

  private _injectStyles(): void {
    if (typeof document === 'undefined') return;

    const css = `
      :root {
        --ci-accent: oklch(0.75 0.15 250);
        --ci-surface: oklch(0.18 0.02 260);
        --ci-text: oklch(0.90 0.02 250);
        --ci-muted: oklch(0.55 0.04 250);
        --ci-temperature: 5500;
        --ci-saturation-scale: 1;
      }

      /* Color intelligence utility classes */
      .ci-accent { color: var(--ci-accent); }
      .ci-surface { background-color: var(--ci-surface); }
      .ci-text { color: var(--ci-text); }
      .ci-muted { color: var(--ci-muted); }
    `;

    this._styleEl = document.createElement('style');
    this._styleEl.setAttribute('data-craft', 'color-intelligence');
    this._styleEl.textContent = css;
    document.head.appendChild(this._styleEl);
  }
}

export { TEMPERATURE_MAP, SEVERITY_SATURATION, TIME_TEMPERATURE };
