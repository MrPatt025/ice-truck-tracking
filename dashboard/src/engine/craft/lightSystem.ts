/* ================================================================
 *  CRAFT LAYER — Light Choreography System (#1 + #2)
 *  ─────────────────────────────────────────────────────────────
 *  Light that tells a story. Every pixel is lit with intent.
 *
 *  Components:
 *    • KeyLight     — directional highlight on focused elements
 *    • AmbientFill  — soft environment glow (time-of-day adaptive)
 *    • AccentRim    — edge glow for depth separation
 *    • AlertPulse   — gradient pulse driven by alert severity
 *    • LightDirector — orchestrates all light sources
 *
 *  Integration: Mounts CSS overlays + exports CSS custom properties.
 *  GPU path: variables consumed by Three.js scene controller.
 * ================================================================ */

import type { AlertLevel, Theme } from '../types';

// ─── Types ─────────────────────────────────────────────────────

export interface LightSource {
  type: 'key' | 'ambient' | 'rim' | 'pulse';
  angle: number;         // degrees, 0 = top
  intensity: number;     // 0-1
  color: string;         // CSS color (oklch preferred)
  spread: number;        // blur radius in px
  elevation: number;     // z-height for 3D shadow casting
}

export interface LightNarrative {
  keyLight: LightSource;
  ambientFill: LightSource;
  accentRim: LightSource;
  alertPulse: LightSource;
}

export interface LightConfig {
  theme: Theme;
  timeOfDay: 'day' | 'night';
  alertLevel: AlertLevel | null;
  focusTarget: HTMLElement | null;
  globalDimming: number;   // 0-1, from adaptive layer
}

// ─── Presets ──────────────────────────────────────────────────

const LIGHT_NARRATIVES: Record<Theme, LightNarrative> = {
  dark: {
    keyLight:    { type: 'key',     angle: 315, intensity: 0.85, color: 'oklch(0.85 0.03 220)', spread: 120, elevation: 5 },
    ambientFill: { type: 'ambient', angle: 0,   intensity: 0.15, color: 'oklch(0.25 0.02 260)', spread: 400, elevation: 0 },
    accentRim:   { type: 'rim',     angle: 135, intensity: 0.40, color: 'oklch(0.70 0.12 250)', spread: 2,   elevation: 2 },
    alertPulse:  { type: 'pulse',   angle: 0,   intensity: 0.00, color: 'oklch(0.65 0.25 25)',  spread: 200, elevation: 0 },
  },
  neon: {
    keyLight:    { type: 'key',     angle: 300, intensity: 0.90, color: 'oklch(0.90 0.15 180)', spread: 100, elevation: 6 },
    ambientFill: { type: 'ambient', angle: 0,   intensity: 0.20, color: 'oklch(0.20 0.08 300)', spread: 500, elevation: 0 },
    accentRim:   { type: 'rim',     angle: 120, intensity: 0.55, color: 'oklch(0.80 0.20 330)', spread: 3,   elevation: 3 },
    alertPulse:  { type: 'pulse',   angle: 0,   intensity: 0.00, color: 'oklch(0.70 0.30 30)',  spread: 250, elevation: 0 },
  },
  ocean: {
    keyLight:    { type: 'key',     angle: 330, intensity: 0.75, color: 'oklch(0.80 0.08 200)', spread: 140, elevation: 4 },
    ambientFill: { type: 'ambient', angle: 0,   intensity: 0.18, color: 'oklch(0.22 0.04 220)', spread: 450, elevation: 0 },
    accentRim:   { type: 'rim',     angle: 150, intensity: 0.35, color: 'oklch(0.65 0.10 190)', spread: 2,   elevation: 2 },
    alertPulse:  { type: 'pulse',   angle: 0,   intensity: 0.00, color: 'oklch(0.60 0.22 30)',  spread: 180, elevation: 0 },
  },
  forest: {
    keyLight:    { type: 'key',     angle: 320, intensity: 0.70, color: 'oklch(0.78 0.06 140)', spread: 130, elevation: 4 },
    ambientFill: { type: 'ambient', angle: 0,   intensity: 0.16, color: 'oklch(0.20 0.03 150)', spread: 420, elevation: 0 },
    accentRim:   { type: 'rim',     angle: 140, intensity: 0.30, color: 'oklch(0.60 0.08 120)', spread: 2,   elevation: 2 },
    alertPulse:  { type: 'pulse',   angle: 0,   intensity: 0.00, color: 'oklch(0.55 0.20 25)',  spread: 160, elevation: 0 },
  },
};

const ALERT_PULSE_INTENSITY: Record<AlertLevel, number> = {
  critical: 0.65,
  warning: 0.35,
  info: 0.12,
};

const NIGHT_DIMMING = 0.15;

// ─── Key Light ────────────────────────────────────────────────

export class KeyLight {
  private _el: HTMLDivElement | null = null;
  private _current: LightSource;
  private _targetIntensity = 0.85;

  constructor(source: LightSource) {
    this._current = { ...source };
  }

  mount(parent: HTMLElement): void {
    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'key-light');
    Object.assign(this._el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9990',
      mixBlendMode: 'soft-light',
      willChange: 'opacity, background',
      transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)',
    });
    parent.appendChild(this._el);
    this._apply();
  }

  update(source: Partial<LightSource>): void {
    Object.assign(this._current, source);
    this._targetIntensity = this._current.intensity;
    this._apply();
  }

  focusAt(x: number, y: number): void {
    if (!this._el) return;
    const angle = this._current.angle;
    const rad = (angle * Math.PI) / 180;
    const offsetX = Math.cos(rad) * this._current.spread;
    const offsetY = Math.sin(rad) * this._current.spread;
    this._el.style.background = `radial-gradient(ellipse at ${x + offsetX}px ${y + offsetY}px, ${this._current.color} 0%, transparent 70%)`;
  }

  tick(_dt: number): void {
    const currentOp = parseFloat(this._el?.style.opacity || '0');
    const diff = this._targetIntensity - currentOp;
    if (Math.abs(diff) > 0.005 && this._el) {
      this._el.style.opacity = String(currentOp + diff * 0.08);
    }
  }

  private _apply(): void {
    if (!this._el) return;
    this._el.style.opacity = String(this._current.intensity);
    this._el.style.background = `radial-gradient(ellipse at 30% 20%, ${this._current.color} 0%, transparent 65%)`;
  }

  destroy(): void {
    this._el?.remove();
    this._el = null;
  }
}

// ─── Ambient Fill ─────────────────────────────────────────────

export class AmbientFill {
  private _el: HTMLDivElement | null = null;
  private _current: LightSource;

  constructor(source: LightSource) {
    this._current = { ...source };
  }

  mount(parent: HTMLElement): void {
    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'ambient-fill');
    Object.assign(this._el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9989',
      mixBlendMode: 'multiply',
      willChange: 'opacity',
      transition: 'opacity 1200ms ease',
    });
    parent.appendChild(this._el);
    this._apply();
  }

  update(source: Partial<LightSource>): void {
    Object.assign(this._current, source);
    this._apply();
  }

  setTimeOfDay(time: 'day' | 'night'): void {
    const dim = time === 'night' ? NIGHT_DIMMING : 0;
    this.update({ intensity: this._current.intensity - dim });
  }

  tick(_dt: number): void {
    // Ambient is static — driven by update() calls
  }

  private _apply(): void {
    if (!this._el) return;
    this._el.style.opacity = String(this._current.intensity);
    this._el.style.background = `radial-gradient(circle at 50% 50%, ${this._current.color} 0%, transparent 100%)`;
  }

  destroy(): void {
    this._el?.remove();
    this._el = null;
  }
}

// ─── Accent Rim Glow ─────────────────────────────────────────

export class AccentRim {
  private _el: HTMLDivElement | null = null;
  private _current: LightSource;

  constructor(source: LightSource) {
    this._current = { ...source };
  }

  mount(parent: HTMLElement): void {
    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'accent-rim');
    Object.assign(this._el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9991',
      mixBlendMode: 'screen',
      willChange: 'opacity',
      transition: 'opacity 400ms ease',
    });
    parent.appendChild(this._el);
    this._apply();
  }

  update(source: Partial<LightSource>): void {
    Object.assign(this._current, source);
    this._apply();
  }

  tick(_dt: number): void {
    // Rim is reactive — driven by update()
  }

  private _apply(): void {
    if (!this._el) return;
    const { angle, spread, color, intensity } = this._current;
    const rad = (angle * Math.PI) / 180;
    const x = 50 + Math.cos(rad) * 50;
    const y = 50 + Math.sin(rad) * 50;
    this._el.style.opacity = String(intensity);
    this._el.style.background = `radial-gradient(ellipse at ${x}% ${y}%, ${color} 0%, transparent ${spread * 25}%)`;
  }

  destroy(): void {
    this._el?.remove();
    this._el = null;
  }
}

// ─── Alert Pulse Gradient ─────────────────────────────────────

export class AlertPulse {
  private _el: HTMLDivElement | null = null;
  private _current: LightSource;
  private _phase = 0;
  private _active = false;

  constructor(source: LightSource) {
    this._current = { ...source };
  }

  mount(parent: HTMLElement): void {
    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'alert-pulse');
    Object.assign(this._el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9992',
      mixBlendMode: 'screen',
      willChange: 'opacity',
      opacity: '0',
    });
    parent.appendChild(this._el);
  }

  trigger(level: AlertLevel): void {
    this._active = true;
    this._phase = 0;
    const intensity = ALERT_PULSE_INTENSITY[level];
    this._current.intensity = intensity;
    const colors: Record<AlertLevel, string> = {
      critical: 'oklch(0.65 0.30 25)',
      warning:  'oklch(0.75 0.20 70)',
      info:     'oklch(0.70 0.08 220)',
    };
    this._current.color = colors[level];
    this._apply();
  }

  tick(dt: number): void {
    if (!this._active || !this._el) return;
    this._phase += dt * 3;
    let envelope: number;
    if (this._phase < 0.15) {
      envelope = (this._phase / 0.15) * 0.3;
    } else if (this._phase < 0.45) {
      envelope = 0.3 + ((this._phase - 0.15) / 0.3) * 0.7;
    } else if (this._phase < 1.2) {
      envelope = Math.exp(-(this._phase - 0.45) * 4);
    } else {
      envelope = 0;
      this._active = false;
    }
    this._el.style.opacity = String(this._current.intensity * envelope);
  }

  private _apply(): void {
    if (!this._el) return;
    this._el.style.background = `radial-gradient(ellipse at 50% 50%, ${this._current.color} 0%, transparent 80%)`;
  }

  destroy(): void {
    this._el?.remove();
    this._el = null;
  }
}

// ─── Light Director (orchestrates all sources) ────────────────

export class LightDirector {
  private _key: KeyLight;
  private _ambient: AmbientFill;
  private _rim: AccentRim;
  private _pulse: AlertPulse;
  private _mounted = false;
  private _config: LightConfig;

  constructor(config?: Partial<LightConfig>) {
    this._config = {
      theme: 'dark',
      timeOfDay: 'day',
      alertLevel: null,
      focusTarget: null,
      globalDimming: 0,
      ...config,
    };
    const narrative = LIGHT_NARRATIVES[this._config.theme];
    this._key = new KeyLight(narrative.keyLight);
    this._ambient = new AmbientFill(narrative.ambientFill);
    this._rim = new AccentRim(narrative.accentRim);
    this._pulse = new AlertPulse(narrative.alertPulse);
  }

  mount(parent?: HTMLElement): void {
    if (this._mounted) return;
    this._mounted = true;
    const p = parent || document.body;
    this._key.mount(p);
    this._ambient.mount(p);
    this._rim.mount(p);
    this._pulse.mount(p);
    this._ambient.setTimeOfDay(this._config.timeOfDay);
  }

  setTheme(theme: Theme): void {
    this._config.theme = theme;
    const n = LIGHT_NARRATIVES[theme];
    this._key.update(n.keyLight);
    this._ambient.update(n.ambientFill);
    this._rim.update(n.accentRim);
    this._ambient.setTimeOfDay(this._config.timeOfDay);
  }

  setTimeOfDay(time: 'day' | 'night'): void {
    this._config.timeOfDay = time;
    this._ambient.setTimeOfDay(time);
    const n = LIGHT_NARRATIVES[this._config.theme];
    const rimBoost = time === 'night' ? 0.12 : 0;
    this._rim.update({ intensity: n.accentRim.intensity + rimBoost });
  }

  focusAt(x: number, y: number): void {
    this._key.focusAt(x, y);
  }

  triggerAlert(level: AlertLevel): void {
    this._pulse.trigger(level);
  }

  dim(amount: number): void {
    this._config.globalDimming = Math.max(0, Math.min(1, amount));
    const n = LIGHT_NARRATIVES[this._config.theme];
    const factor = 1 - this._config.globalDimming * 0.4;
    this._key.update({ intensity: n.keyLight.intensity * factor });
    this._ambient.update({ intensity: n.ambientFill.intensity * factor });
  }

  tick(dt: number): void {
    this._key.tick(dt);
    this._ambient.tick(dt);
    this._rim.tick(dt);
    this._pulse.tick(dt);
  }

  getCSSVars(): Record<string, string> {
    const n = LIGHT_NARRATIVES[this._config.theme];
    return {
      '--light-key-color': n.keyLight.color,
      '--light-key-angle': `${n.keyLight.angle}deg`,
      '--light-key-intensity': String(n.keyLight.intensity),
      '--light-ambient-color': n.ambientFill.color,
      '--light-rim-color': n.accentRim.color,
      '--light-rim-intensity': String(n.accentRim.intensity),
      '--light-elevation': `${n.keyLight.elevation}px`,
    };
  }

  getLightDirection(): { x: number; y: number; z: number } {
    const n = LIGHT_NARRATIVES[this._config.theme];
    const rad = (n.keyLight.angle * Math.PI) / 180;
    return {
      x: Math.cos(rad),
      y: Math.sin(rad),
      z: n.keyLight.elevation / 10,
    };
  }

  destroy(): void {
    this._key.destroy();
    this._ambient.destroy();
    this._rim.destroy();
    this._pulse.destroy();
    this._mounted = false;
  }
}

export { LIGHT_NARRATIVES, ALERT_PULSE_INTENSITY };
