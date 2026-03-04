/* ================================================================
 *  CRAFT LAYER — Sonic Design Layer (#14)
 *  ─────────────────────────────────────────────────────────────
 *  Minimal, intentional sound design. Not a game, not a toy.
 *
 *  Rules:
 *    • Noise level < -24 LUFS — no disturbance
 *    • All sounds < 100ms except alerts
 *    • Spatial panning for alerts (left/right based on source)
 *    • Sounds respect user preference (mute persistence)
 *
 *  Sounds:
 *    • Click tone    — 30ms sine, 800Hz, -30dB
 *    • Alert pan     — spatial sweep, severity-scaled
 *    • Success chime — 2-note ascending, soft
 *    • Error pulse   — low-frequency rumble, 80Hz
 *
 *  All synthesized via Web Audio API — zero file downloads.
 * ================================================================ */

import type { AlertLevel } from '../types';

// ─── Types ─────────────────────────────────────────────────────

export type SonicEvent = 'click' | 'alert' | 'success' | 'error' | 'hover' | 'dismiss' | 'notification';

export interface SonicConfig {
  enabled: boolean;
  masterVolume: number;  // 0-1 (maps to ~-24 LUFS at 1.0)
  spatialEnabled: boolean;
}

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_CONFIG: SonicConfig = {
  enabled: false,          // Off by default — opt-in only
  masterVolume: 0.15,      // Very quiet
  spatialEnabled: true,
};

// Sound design parameters
const SOUNDS: Record<SonicEvent, { freq: number; duration: number; type: OscillatorType; gain: number; ramp?: number[] }> = {
  click:   { freq: 800, duration: 0.03, type: 'sine',     gain: 0.08 },
  hover:   { freq: 600, duration: 0.02, type: 'sine',     gain: 0.04 },
  success: { freq: 880, duration: 0.10, type: 'sine',     gain: 0.10, ramp: [880, 1100] },
  error:   { freq: 80,  duration: 0.15, type: 'triangle', gain: 0.12 },
  alert:   { freq: 440, duration: 0.20, type: 'sine',     gain: 0.15, ramp: [440, 660, 440] },
  dismiss: { freq: 500, duration: 0.04, type: 'sine',     gain: 0.06, ramp: [500, 350] },
  notification: { freq: 660, duration: 0.08, type: 'sine', gain: 0.08, ramp: [660, 880] },
};

// Alert severity → spatial pan position
const ALERT_PAN: Record<AlertLevel, number> = {
  critical: 0,     // center (demands full attention)
  warning: -0.4,   // slight left
  info: 0.4,       // slight right
};

// ─── Sonic Engine ─────────────────────────────────────────────

export class SonicEngine {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _config: SonicConfig;
  private _initialized = false;

  constructor(config?: Partial<SonicConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  /** Initialize audio context (must be called from user gesture) */
  init(): void {
    if (this._initialized || typeof window === 'undefined') return;
    try {
      this._ctx = new AudioContext();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._config.masterVolume;
      this._masterGain.connect(this._ctx.destination);
      this._initialized = true;
    } catch {
      console.warn('[SonicEngine] Web Audio API not available');
    }
  }

  /** Resume context after user gesture (Chrome autoplay policy) */
  async resume(): Promise<void> {
    if (this._ctx?.state === 'suspended') {
      await this._ctx.resume();
    }
  }

  destroy(): void {
    this._ctx?.close();
    this._ctx = null;
    this._masterGain = null;
    this._initialized = false;
  }

  /* ── Sound Triggers ────────────────────────────────────────── */

  /** Play a sonic event */
  play(event: SonicEvent, options?: { pan?: number }): void {
    if (!this._config.enabled || !this._initialized || !this._ctx || !this._masterGain) return;

    const sound = SOUNDS[event];
    const now = this._ctx.currentTime;

    // Oscillator
    const osc = this._ctx.createOscillator();
    osc.type = sound.type;
    osc.frequency.setValueAtTime(sound.freq, now);

    // Frequency ramp (for chimes/alerts)
    if (sound.ramp && sound.ramp.length > 1) {
      const stepDuration = sound.duration / (sound.ramp.length - 1);
      for (let i = 1; i < sound.ramp.length; i++) {
        osc.frequency.linearRampToValueAtTime(sound.ramp[i], now + stepDuration * i);
      }
    }

    // Gain envelope — quick attack, smooth release
    const gainNode = this._ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(sound.gain, now + 0.005); // 5ms attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);

    // Spatial panning
    if (this._config.spatialEnabled && (options?.pan !== undefined || event === 'alert')) {
      const panner = this._ctx.createStereoPanner();
      panner.pan.value = options?.pan ?? 0;
      osc.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(this._masterGain);
    } else {
      osc.connect(gainNode);
      gainNode.connect(this._masterGain);
    }

    osc.start(now);
    osc.stop(now + sound.duration + 0.01);

    // Cleanup
    osc.onended = () => {
      osc.disconnect();
      gainNode.disconnect();
    };
  }

  /** Play alert with severity-based spatial positioning */
  playAlert(level: AlertLevel): void {
    const pan = ALERT_PAN[level];
    this.play('alert', { pan });

    // Critical alerts get a secondary low-frequency pulse
    if (level === 'critical') {
      setTimeout(() => this.play('error'), 150);
    }
  }

  /* ── Configuration ─────────────────────────────────────────── */

  setEnabled(enabled: boolean): void {
    this._config.enabled = enabled;
    if (enabled && !this._initialized) {
      this.init();
    }
  }

  setVolume(volume: number): void {
    this._config.masterVolume = Math.max(0, Math.min(1, volume));
    if (this._masterGain) {
      this._masterGain.gain.value = this._config.masterVolume;
    }
  }

  isEnabled(): boolean {
    return this._config.enabled;
  }

  getVolume(): number {
    return this._config.masterVolume;
  }
}
