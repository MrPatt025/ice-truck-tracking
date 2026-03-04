/* ================================================================
 *  CRAFT LAYER — Advanced Cursor Physics (#5)
 *  ─────────────────────────────────────────────────────────────
 *  The cursor is the interaction amplifier.
 *
 *  Features:
 *    • Magnetic cursor  — snaps toward interactive targets
 *    • Velocity stretch — elongates in movement direction
 *    • Context morph    — changes shape by mode (map, panel)
 *    • Soft glow trail  — fading afterimage following cursor
 *
 *  All calculations are spring-based with inertia.
 *  60fps GPU-accelerated via translate3d + will-change.
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export type CursorMode = 'default' | 'map' | 'panel' | 'drag' | 'hover' | 'click';

export interface CursorConfig {
  enabled: boolean;
  size: number;           // base diameter in px
  glowTrailLength: number;
  magneticRadius: number; // px — snap range
  magneticStrength: number; // 0-1
  stretchFactor: number;  // max elongation ratio
}

interface CursorState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  mode: CursorMode;
  scale: number;
  rotation: number; // radians
  glowOpacity: number;
  magnetTarget: HTMLElement | null;
}

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  time: number;
}

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_CONFIG: CursorConfig = {
  enabled: true,
  size: 20,
  glowTrailLength: 8,
  magneticRadius: 80,
  magneticStrength: 0.35,
  stretchFactor: 1.4,
};

const MODE_STYLES: Record<CursorMode, { scale: number; borderRadius: string; color: string }> = {
  default: { scale: 1.0, borderRadius: '50%', color: 'oklch(0.85 0.08 250 / 0.5)' },
  map:     { scale: 1.5, borderRadius: '50%', color: 'oklch(0.80 0.12 200 / 0.4)' },
  panel:   { scale: 0.8, borderRadius: '4px', color: 'oklch(0.90 0.06 260 / 0.6)' },
  drag:    { scale: 1.3, borderRadius: '50%', color: 'oklch(0.75 0.10 140 / 0.5)' },
  hover:   { scale: 1.6, borderRadius: '50%', color: 'oklch(0.88 0.15 300 / 0.3)' },
  click:   { scale: 0.7, borderRadius: '50%', color: 'oklch(0.95 0.20 200 / 0.7)' },
};

// ─── Cursor Physics Engine ────────────────────────────────────

export class CursorPhysicsEngine {
  private _config: CursorConfig;
  private _state: CursorState;
  private _trail: TrailPoint[] = [];
  private _el: HTMLDivElement | null = null;
  private _trailEls: HTMLDivElement[] = [];
  private _glowEl: HTMLDivElement | null = null;
  private _mounted = false;
  private _raf = 0;
  private _lastTime = 0;
  private _magnetTargets: Set<HTMLElement> = new Set();

  // Spring constants
  private readonly SPRING_K = 0.15;
  private readonly DAMPING = 0.75;

  constructor(config?: Partial<CursorConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._state = {
      x: 0, y: 0, vx: 0, vy: 0,
      targetX: 0, targetY: 0,
      mode: 'default',
      scale: 1, rotation: 0,
      glowOpacity: 0,
      magnetTarget: null,
    };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    if (this._mounted || typeof document === 'undefined') return;
    this._mounted = true;

    // Hide native cursor
    document.documentElement.style.cursor = 'none';

    // Create cursor element
    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'cursor');
    Object.assign(this._el.style, {
      position: 'fixed',
      width: `${this._config.size}px`,
      height: `${this._config.size}px`,
      borderRadius: '50%',
      border: '1.5px solid oklch(0.85 0.08 250 / 0.6)',
      backgroundColor: 'oklch(0.85 0.08 250 / 0.08)',
      pointerEvents: 'none',
      zIndex: '99999',
      mixBlendMode: 'difference',
      willChange: 'transform',
      transition: 'width 200ms cubic-bezier(0.22,1,0.36,1), height 200ms cubic-bezier(0.22,1,0.36,1), border-radius 200ms cubic-bezier(0.22,1,0.36,1)',
      transform: 'translate3d(-50%, -50%, 0)',
    });
    document.body.appendChild(this._el);

    // Create glow element
    this._glowEl = document.createElement('div');
    this._glowEl.setAttribute('data-craft', 'cursor-glow');
    Object.assign(this._glowEl.style, {
      position: 'fixed',
      width: `${this._config.size * 3}px`,
      height: `${this._config.size * 3}px`,
      borderRadius: '50%',
      background: 'radial-gradient(circle, oklch(0.80 0.12 250 / 0.15) 0%, transparent 70%)',
      pointerEvents: 'none',
      zIndex: '99998',
      willChange: 'transform, opacity',
      transform: 'translate3d(-50%, -50%, 0)',
      opacity: '0',
    });
    document.body.appendChild(this._glowEl);

    // Create trail elements
    for (let i = 0; i < this._config.glowTrailLength; i++) {
      const t = document.createElement('div');
      t.setAttribute('data-craft', 'cursor-trail');
      const trailSize = this._config.size * (1 - i / this._config.glowTrailLength) * 0.6;
      Object.assign(t.style, {
        position: 'fixed',
        width: `${trailSize}px`,
        height: `${trailSize}px`,
        borderRadius: '50%',
        backgroundColor: `oklch(0.85 0.10 250 / ${0.12 - i * 0.014})`,
        pointerEvents: 'none',
        zIndex: '99997',
        willChange: 'transform, opacity',
        transform: 'translate3d(-50%, -50%, 0)',
        opacity: '0',
      });
      document.body.appendChild(t);
      this._trailEls.push(t);
    }

    // Event listeners
    document.addEventListener('mousemove', this._onMouseMove, { passive: true });
    document.addEventListener('mousedown', this._onMouseDown, { passive: true });
    document.addEventListener('mouseup', this._onMouseUp, { passive: true });

    // Start animation loop
    this._lastTime = performance.now();
    this._loop();
  }

  destroy(): void {
    this._mounted = false;
    cancelAnimationFrame(this._raf);

    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);

    if (typeof document !== 'undefined') {
      document.documentElement.style.cursor = '';
    }

    this._el?.remove();
    this._glowEl?.remove();
    this._trailEls.forEach((e) => e.remove());
    this._trailEls = [];
    this._el = null;
    this._glowEl = null;
  }

  /* ── Public API ────────────────────────────────────────────── */

  /** Register an element as a magnetic target */
  addMagneticTarget(el: HTMLElement): void {
    this._magnetTargets.add(el);
  }

  /** Remove a magnetic target */
  removeMagneticTarget(el: HTMLElement): void {
    this._magnetTargets.delete(el);
  }

  /** Set cursor mode (changes appearance) */
  setMode(mode: CursorMode): void {
    this._state.mode = mode;
    if (!this._el) return;

    const style = MODE_STYLES[mode];
    this._el.style.borderRadius = style.borderRadius;
    this._el.style.borderColor = style.color;
  }

  /** Enable/disable cursor physics */
  setEnabled(enabled: boolean): void {
    this._config.enabled = enabled;
    if (!enabled) {
      if (typeof document !== 'undefined') {
        document.documentElement.style.cursor = '';
      }
      if (this._el) { this._el.style.opacity = '0'; }
    } else {
      if (typeof document !== 'undefined') {
        document.documentElement.style.cursor = 'none';
      }
      if (this._el) { this._el.style.opacity = '1'; }
    }
  }

  /* ── Internal Animation ────────────────────────────────────── */

  private _loop = (): void => {
    if (!this._mounted) return;

    const now = performance.now();
    const dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;

    this._updatePhysics(dt);
    this._render();

    this._raf = requestAnimationFrame(this._loop);
  };

  private _updatePhysics(_dt: number): void {
    const s = this._state;

    // Magnetic force
    let magX = 0, magY = 0;
    this._magnetTargets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - s.targetX;
      const dy = cy - s.targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this._config.magneticRadius && dist > 0) {
        const force = (1 - dist / this._config.magneticRadius) * this._config.magneticStrength;
        magX += (dx / dist) * force * 20;
        magY += (dy / dist) * force * 20;
        s.magnetTarget = el;
      }
    });

    if (magX === 0 && magY === 0) s.magnetTarget = null;

    // Spring physics to follow mouse
    const targetX = s.targetX + magX;
    const targetY = s.targetY + magY;
    const ax = (targetX - s.x) * this.SPRING_K;
    const ay = (targetY - s.y) * this.SPRING_K;

    s.vx = (s.vx + ax) * this.DAMPING;
    s.vy = (s.vy + ay) * this.DAMPING;
    s.x += s.vx;
    s.y += s.vy;

    // Velocity-based stretch
    const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    const stretch = Math.min(speed / 30, this._config.stretchFactor - 1);
    s.scale = 1 + stretch;
    s.rotation = speed > 0.5 ? Math.atan2(s.vy, s.vx) : s.rotation;

    // Glow opacity based on speed
    s.glowOpacity = Math.min(speed / 20, 0.4);

    // Update trail
    this._trail.unshift({ x: s.x, y: s.y, opacity: 0.3, scale: s.scale * 0.9, time: performance.now() });
    if (this._trail.length > this._config.glowTrailLength) {
      this._trail.pop();
    }
    // Fade trail
    for (let i = 0; i < this._trail.length; i++) {
      this._trail[i].opacity *= 0.85;
    }
  }

  private _render(): void {
    const s = this._state;
    const modeStyle = MODE_STYLES[s.mode];

    if (this._el) {
      const scaleX = s.scale;
      const scaleY = 1 / Math.max(s.scale, 1); // inverse stretch for perpendicular axis
      this._el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${s.rotation}rad) scale(${scaleX * modeStyle.scale}, ${scaleY * modeStyle.scale})`;
    }

    if (this._glowEl) {
      this._glowEl.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%)`;
      this._glowEl.style.opacity = String(s.glowOpacity);
    }

    // Render trail
    for (let i = 0; i < this._trailEls.length; i++) {
      const point = this._trail[i];
      if (point) {
        this._trailEls[i].style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
        this._trailEls[i].style.opacity = String(point.opacity);
      }
    }
  }

  /* ── Event Handlers ────────────────────────────────────────── */

  private _onMouseMove = (e: MouseEvent): void => {
    this._state.targetX = e.clientX;
    this._state.targetY = e.clientY;
  };

  private _onMouseDown = (): void => {
    this.setMode('click');
    // Press scale
    if (this._el) {
      this._el.style.transition = 'transform 60ms cubic-bezier(0, 0, 0.2, 1)';
    }
  };

  private _onMouseUp = (): void => {
    this.setMode('default');
    if (this._el) {
      this._el.style.transition = '';
    }
  };
}
