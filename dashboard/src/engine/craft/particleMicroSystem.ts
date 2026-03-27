/* ================================================================
 *  CRAFT LAYER — Particle Micro-System (#13)
 *  ─────────────────────────────────────────────────────────────
 *  Ambient visual atmosphere through minimal particles.
 *
 *  Features:
 *    • Ambient floating particles — gentle background motion
 *    • Alert sparks              — burst particles on events
 *    • Background light dust     — subtle depth enhancement
 *    • Velocity trails           — fast trucks leave traces
 *    • FPS auto-scaling          — particle count self-regulates
 *
 *  All CPU-rendered on Canvas 2D for broad compatibility.
 *  Falls back gracefully when FPS drops.
 * ================================================================ */

import type { DeviceTier } from '../types';

// ─── Types ─────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0-1 remaining life
  maxLife: number;     // seconds
  size: number;
  opacity: number;
  color: string;
  type: 'ambient' | 'spark' | 'dust' | 'trail';
}

export interface ParticleConfig {
  maxParticles: number;
  ambientCount: number;       // base ambient particle count
  dustCount: number;          // dust particle count
  ambientSpeed: number;       // px/s
  dustSpeed: number;
  sparkLifetime: number;      // seconds
  trailLifetime: number;
  ambientColor: string;
  dustColor: string;
  sparkColor: string;
  trailColor: string;
  fpsThreshold: number;       // reduce particles below this FPS
}

// ─── Tier Configs ──────────────────────────────────────────────

const TIER_CONFIGS: Record<DeviceTier, Partial<ParticleConfig>> = {
  'high-end':  { maxParticles: 200, ambientCount: 60, dustCount: 40 },
  'mid-range': { maxParticles: 100, ambientCount: 30, dustCount: 20 },
  'low-end':   { maxParticles: 40,  ambientCount: 12, dustCount: 8 },
  'potato':    { maxParticles: 0,   ambientCount: 0,  dustCount: 0 },
};

const DEFAULT_CONFIG: ParticleConfig = {
  maxParticles: 120,
  ambientCount: 40,
  dustCount: 25,
  ambientSpeed: 15,
  dustSpeed: 5,
  sparkLifetime: 0.8,
  trailLifetime: 1.5,
  ambientColor: 'rgba(180, 200, 255, 0.15)',
  dustColor: 'rgba(255, 255, 255, 0.06)',
  sparkColor: 'rgba(255, 180, 80, 0.6)',
  trailColor: 'rgba(100, 200, 255, 0.3)',
  fpsThreshold: 50,
};

// ─── Particle System ──────────────────────────────────────────

export class ParticleMicroSystem {
  private readonly _config: ParticleConfig;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _particles: Particle[] = [];
  private _mounted = false;
  private _raf = 0;
  private _lastTime = 0;
  private readonly _fpsHistory: number[] = [];
  private _targetCount: number;
  private _currentScale = 1;

  constructor(config?: Partial<ParticleConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._targetCount = this._config.ambientCount + this._config.dustCount;
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(parent?: HTMLElement): void {
    if (this._mounted || document === undefined) return;
    this._mounted = true;

    this._canvas = document.createElement('canvas');
    this._canvas.dataset.craft = 'particles';
    Object.assign(this._canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9980',
      opacity: '1',
    });

    (parent || document.body).appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');

    this._resize();
    globalThis.window.addEventListener('resize', this._onResize, { passive: true });

    // Seed initial particles
    this._seedAmbient();
    this._seedDust();

    this._lastTime = performance.now();
    this._loop();
  }

  destroy(): void {
    this._mounted = false;
    cancelAnimationFrame(this._raf);
    if (globalThis.window !== undefined) {
      globalThis.window.removeEventListener('resize', this._onResize);
    }
    this._canvas?.remove();
    this._canvas = null;
    this._ctx = null;
    this._particles = [];
  }

  /* ── Public API ────────────────────────────────────────────── */

  /** Set device tier for auto-scaling */
  setDeviceTier(tier: DeviceTier): void {
    const tierConfig = TIER_CONFIGS[tier];
    Object.assign(this._config, tierConfig);
    this._targetCount = this._config.ambientCount + this._config.dustCount;
  }

  /** Emit spark particles at a position */
  emitSparks(x: number, y: number, count = 8): void {
    for (let i = 0; i < count && this._particles.length < this._config.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this._particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: this._config.sparkLifetime,
        size: 1.5 + Math.random() * 2,
        opacity: 0.8,
        color: this._config.sparkColor,
        type: 'spark',
      });
    }
  }

  /** Emit trail particles for fast-moving truck */
  emitTrail(x: number, y: number, vx: number, vy: number): void {
    if (this._particles.length >= this._config.maxParticles) return;
    this._particles.push({
      x, y,
      vx: vx * 0.3 + (Math.random() - 0.5) * 10,
      vy: vy * 0.3 + (Math.random() - 0.5) * 10,
      life: 1,
      maxLife: this._config.trailLifetime,
      size: 2 + Math.random() * 3,
      opacity: 0.4,
      color: this._config.trailColor,
      type: 'trail',
    });
  }

  /** Get current particle count (for diagnostics) */
  getParticleCount(): number {
    return this._particles.length;
  }

  /** Manual FPS report for budget governor integration */
  reportFPS(fps: number): void {
    this._fpsHistory.push(fps);
    if (this._fpsHistory.length > 30) this._fpsHistory.shift();
    this._autoScale();
  }

  /* ── Internal ──────────────────────────────────────────────── */

  private readonly _loop = (): void => {
    if (!this._mounted) return;

    const now = performance.now();
    const dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;

    // FPS tracking
    if (dt > 0) {
      this._fpsHistory.push(1 / dt);
      if (this._fpsHistory.length > 60) this._fpsHistory.shift();
    }

    this._update(dt);
    this._render();
    this._autoScale();

    this._raf = requestAnimationFrame(this._loop);
  };

  private _update(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];

      this._applyParticleMotion(p, dt);
      this._applyParticleDecay(p, dt);

      if (this._isParticleDead(p)) {
        this._particles.splice(i, 1);
        continue;
      }

      this._applyViewportWrap(p);
      this._applySparkPhysics(p, dt);
    }

    // Respawn ambient particles to maintain count
    const ambientCount = this._particles.filter((p) => p.type === 'ambient').length;
    const targetAmbient = Math.floor(this._config.ambientCount * this._currentScale);
    if (ambientCount < targetAmbient) {
      this._spawnAmbient(1);
    }
  }

  private _applyParticleMotion(particle: Particle, dt: number): void {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }

  private _applyParticleDecay(particle: Particle, dt: number): void {
    particle.life -= dt / particle.maxLife;
    particle.opacity = Math.max(0, particle.life * (particle.type === 'ambient' ? 0.15 : 0.6));
  }

  private _isParticleDead(particle: Particle): boolean {
    return particle.life <= 0;
  }

  private _applyViewportWrap(particle: Particle): void {
    if (particle.type !== 'ambient' && particle.type !== 'dust') return;

    const w = this._canvas?.width || 1920;
    const h = this._canvas?.height || 1080;
    if (particle.x < -20) particle.x = w + 20;
    if (particle.x > w + 20) particle.x = -20;
    if (particle.y < -20) particle.y = h + 20;
    if (particle.y > h + 20) particle.y = -20;
  }

  private _applySparkPhysics(particle: Particle, dt: number): void {
    if (particle.type !== 'spark') return;
    particle.vy += 120 * dt;
    particle.vx *= 0.98;
  }

  private _render(): void {
    if (!this._ctx || !this._canvas) return;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    for (const p of this._particles) {
      this._ctx.globalAlpha = p.opacity;
      this._ctx.fillStyle = p.color;
      this._ctx.beginPath();
      this._ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this._ctx.fill();
    }

    this._ctx.globalAlpha = 1;
  }

  private _autoScale(): void {
    if (this._fpsHistory.length < 10) return;
    const avgFps = this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length;

    if (avgFps < this._config.fpsThreshold && this._currentScale > 0.1) {
      this._currentScale = Math.max(0.1, this._currentScale - 0.05);
    } else if (avgFps > this._config.fpsThreshold + 5 && this._currentScale < 1) {
      this._currentScale = Math.min(1, this._currentScale + 0.02);
    }
  }

  private _seedAmbient(): void {
    const count = Math.floor(this._config.ambientCount * this._currentScale);
    for (let i = 0; i < count; i++) {
      this._spawnAmbient(1);
    }
  }

  private _spawnAmbient(count: number): void {
    const w = this._canvas?.width || 1920;
    const h = this._canvas?.height || 1080;
    for (let i = 0; i < count; i++) {
      this._particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * this._config.ambientSpeed,
        vy: (Math.random() - 0.5) * this._config.ambientSpeed * 0.5,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 10 + Math.random() * 20,
        size: 1 + Math.random() * 2,
        opacity: 0.08 + Math.random() * 0.07,
        color: this._config.ambientColor,
        type: 'ambient',
      });
    }
  }

  private _seedDust(): void {
    const w = this._canvas?.width || 1920;
    const h = this._canvas?.height || 1080;
    const count = Math.floor(this._config.dustCount * this._currentScale);
    for (let i = 0; i < count; i++) {
      this._particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * this._config.dustSpeed,
        vy: Math.random() * this._config.dustSpeed * -0.3,
        life: 0.7 + Math.random() * 0.3,
        maxLife: 15 + Math.random() * 30,
        size: 0.5 + Math.random() * 1,
        opacity: 0.04 + Math.random() * 0.03,
        color: this._config.dustColor,
        type: 'dust',
      });
    }
  }

  private _resize(): void {
    if (!this._canvas) return;
    const viewportWindow = globalThis.window;
    if (viewportWindow === undefined) return;
    const dpr = Math.min(viewportWindow.devicePixelRatio, 2);
    this._canvas.width = viewportWindow.innerWidth * dpr;
    this._canvas.height = viewportWindow.innerHeight * dpr;
    this._ctx?.scale(dpr, dpr);
  }

  private readonly _onResize = (): void => {
    this._resize();
  };
}
