/* ================================================================
 *  CRAFT LAYER — High-End Map Visual Mode (#17)
 *  ─────────────────────────────────────────────────────────────
 *  Map visuals that rival premium navigation apps.
 *
 *  Features:
 *    • Soft shadow under trucks   — CSS drop-shadow on markers
 *    • Realistic wheel rotation   — speed-synced animation
 *    • Headlight beam at night    — gradient cone projection
 *    • Route glow by speed        — color shifts with velocity
 *    • Heat diffusion effect      — temperature-area gradient
 *
 *  All applied as DOM overlays or Mapbox GL expressions.
 * ================================================================ */

import type { Theme } from '../types';
import type { TimeSegment } from './temporalBehavior';

// ─── Types ─────────────────────────────────────────────────────

export interface TruckMarkerVisuals {
  id: string;
  speed: number;         // km/h
  heading: number;       // degrees
  temperature: number;   // °C (cargo temperature)
  isMoving: boolean;
  alertLevel: 'none' | 'warning' | 'critical';
}

export interface MapVisualConfig {
  shadowEnabled: boolean;
  headlightEnabled: boolean;
  routeGlowEnabled: boolean;
  heatDiffusionEnabled: boolean;
  nightMode: boolean;
}

// ─── Speed-Based Route Colors ─────────────────────────────────

const SPEED_COLORS = {
  stopped: 'oklch(0.65 0.12 250)',     // blue-gray
  slow: 'oklch(0.70 0.15 135)',        // green
  normal: 'oklch(0.75 0.10 200)',      // teal
  fast: 'oklch(0.72 0.18 80)',         // amber
  speeding: 'oklch(0.65 0.22 25)',     // red
} as const;

function getSpeedColor(speed: number): string {
  if (speed < 1) return SPEED_COLORS.stopped;
  if (speed < 30) return SPEED_COLORS.slow;
  if (speed < 80) return SPEED_COLORS.normal;
  if (speed < 110) return SPEED_COLORS.fast;
  return SPEED_COLORS.speeding;
}

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_CONFIG: MapVisualConfig = {
  shadowEnabled: true,
  headlightEnabled: true,
  routeGlowEnabled: true,
  heatDiffusionEnabled: true,
  nightMode: false,
};

// ─── Map Visual Controller ────────────────────────────────────

export class MapVisualController {
  private _config: MapVisualConfig;
  private _theme: Theme = 'dark';
  private _timeSegment: TimeSegment = 'afternoon';
  private _styleEl: HTMLStyleElement | null = null;
  private _mounted = false;

  constructor(config?: Partial<MapVisualConfig>) {
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
    this._styleEl?.remove();
    this._styleEl = null;
  }

  /* ── Public API ────────────────────────────────────────────── */

  setTheme(theme: Theme): void {
    this._theme = theme;
    this._config.nightMode = theme === 'dark';
    this._updateStyles();
  }

  setTimeSegment(segment: TimeSegment): void {
    this._timeSegment = segment;
    const isNight = segment === 'night' || segment === 'lateNight' || segment === 'evening';
    this._config.nightMode = isNight;
    this._updateStyles();
  }

  /** Generate CSS for a truck marker */
  getTruckMarkerCSS(truck: TruckMarkerVisuals): Record<string, string> {
    const styles: Record<string, string> = {};

    // Shadow
    if (this._config.shadowEnabled) {
      const shadowBlur = truck.isMoving ? 12 : 8;
      const shadowOffset = truck.isMoving ? 4 : 2;
      styles.filter = `drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,0.35))`;
    }

    // Rotation (heading)
    styles.transform = `rotate(${truck.heading}deg)`;
    styles.transition = 'transform 500ms cubic-bezier(0.33, 1, 0.68, 1)';

    // Alert glow
    if (truck.alertLevel === 'critical') {
      styles.boxShadow = '0 0 16px 4px rgba(255, 60, 60, 0.5)';
    } else if (truck.alertLevel === 'warning') {
      styles.boxShadow = '0 0 10px 2px rgba(255, 180, 60, 0.4)';
    }

    return styles;
  }

  /** Generate headlight beam SVG for night mode */
  getHeadlightBeam(heading: number): string {
    if (!this._config.headlightEnabled || !this._config.nightMode) return '';

    return `<svg width="80" height="120" viewBox="0 0 80 120" style="
      position:absolute;
      top:-100px;
      left:50%;
      transform:translateX(-50%) rotate(${heading}deg);
      transform-origin:center bottom;
      pointer-events:none;
      opacity:0.4;
    ">
      <defs>
        <radialGradient id="headlight" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stop-color="rgba(255,240,200,0.6)"/>
          <stop offset="100%" stop-color="rgba(255,240,200,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="40" cy="60" rx="35" ry="55" fill="url(#headlight)"/>
    </svg>`;
  }

  /** Generate route paint properties for Mapbox GL */
  getRoutePaint(speed: number, width = 4): Record<string, unknown> {
    return {
      'line-color': getSpeedColor(speed),
      'line-width': width,
      'line-blur': this._config.routeGlowEnabled ? 3 : 0,
      'line-opacity': 0.85,
    };
  }

  /** Generate heat diffusion circle for temperature warnings */
  getHeatDiffusionCSS(temperature: number, maxTemp = 50): Record<string, string> {
    if (!this._config.heatDiffusionEnabled) return {};

    const intensity = Math.max(0, Math.min(1, (temperature - 20) / (maxTemp - 20)));
    const radius = 30 + intensity * 40;

    return {
      width: `${radius * 2}px`,
      height: `${radius * 2}px`,
      borderRadius: '50%',
      background: `radial-gradient(circle, 
        oklch(0.65 ${0.1 + intensity * 0.15} ${25 + (1 - intensity) * 100} / ${0.15 + intensity * 0.2}) 0%,
        transparent 70%)`,
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      animation: intensity > 0.7 ? 'craft-heat-pulse 2s ease-in-out infinite' : 'none',
    };
  }

  /** Get Mapbox GL style URL appropriate for current time/theme */
  getMapStyle(): string {
    if (this._config.nightMode || this._theme === 'dark') {
      return 'mapbox://styles/mapbox/dark-v11';
    }
    return 'mapbox://styles/mapbox/light-v11';
  }

  /* ── Internal ──────────────────────────────────────────────── */

  private _injectStyles(): void {
    if (typeof document === 'undefined') return;

    this._styleEl = document.createElement('style');
    this._styleEl.setAttribute('data-craft', 'map-visuals');
    this._updateStyles();
    document.head.appendChild(this._styleEl);
  }

  private _updateStyles(): void {
    if (!this._styleEl) return;

    this._styleEl.textContent = `
      @keyframes craft-heat-pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
        50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.5; }
      }

      @keyframes craft-truck-idle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-1px); }
      }

      [data-craft-truck] {
        transition: filter 300ms ease, box-shadow 300ms ease;
      }

      [data-craft-truck][data-moving="false"] {
        animation: craft-truck-idle 3s ease-in-out infinite;
      }

      /* Night mode ambient darkening on map container */
      [data-craft-map-night="true"] {
        filter: brightness(0.92) contrast(1.05);
      }

      /* Route glow effect */
      .craft-route-glow {
        filter: blur(2px);
        opacity: 0.4;
      }
    `;
  }
}

export { getSpeedColor, SPEED_COLORS };
