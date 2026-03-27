/* ================================================================
 *  CRAFT LAYER — Cinematic Scroll Engine (#7)
 *  ─────────────────────────────────────────────────────────────
 *  Scroll is not a utility — it's a storytelling medium.
 *
 *  Features:
 *    • Scroll inertia          — momentum with spring settle
 *    • Section snapping        — magnetically locks to sections
 *    • Scroll-progress lighting — shader modulation by position
 *    • Scroll-based shader mod — Three.js uniform binding
 *    • Progress indicators     — subtle section awareness
 *
 *  Landing page becomes an interactive film.
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export interface ScrollSection {
  id: string;
  el: HTMLElement;
  progress: number;           // 0-1 visibility progress
  inView: boolean;
  snapPoint: number;          // scroll Y to snap to
}

export interface ScrollConfig {
  inertia: boolean;
  inertiaDamping: number;     // 0-1 (higher = less inertia)
  snapEnabled: boolean;
  snapThreshold: number;      // distance in px to trigger snap
  progressLighting: boolean;  // bind scroll progress to light system
  shaderModulation: boolean;  // bind scroll progress to 3D shaders
}

export interface ScrollState {
  position: number;           // current Y
  velocity: number;
  progress: number;           // 0-1 global page progress
  activeSection: string;      // current section ID
  direction: 'up' | 'down' | 'idle';
}

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_CONFIG: ScrollConfig = {
  inertia: true,
  inertiaDamping: 0.92,
  snapEnabled: true,
  snapThreshold: 120,
  progressLighting: true,
  shaderModulation: true,
};

// ─── Cinematic Scroll Engine ──────────────────────────────────

export class CinematicScrollEngine {
  private readonly _config: ScrollConfig;
  private readonly _state: ScrollState;
  private _sections: ScrollSection[] = [];
  private _mounted = false;
  private _raf = 0;
  private _lastY = 0;
  private _lastTime = 0;
  private _styleEl: HTMLStyleElement | null = null;

  // Callbacks
  private _onProgress: ((progress: number, section: string) => void) | null = null;
  private _onSectionChange: ((sectionId: string, direction: 'up' | 'down') => void) | null = null;
  private _onShaderUpdate: ((progress: number, velocity: number) => void) | null = null;

  constructor(config?: Partial<ScrollConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._state = {
      position: 0,
      velocity: 0,
      progress: 0,
      activeSection: '',
      direction: 'idle',
    };
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  mount(): void {
    const browserWindow = globalThis.window;
    if (this._mounted || browserWindow === undefined) return;
    this._mounted = true;

    this._injectStyles();

    browserWindow.addEventListener('scroll', this._onScroll, { passive: true });
    browserWindow.addEventListener('resize', this._onResize, { passive: true });

    this._lastY = browserWindow.scrollY;
    this._lastTime = performance.now();
    this._loop();
  }

  destroy(): void {
    this._mounted = false;
    cancelAnimationFrame(this._raf);

    const browserWindow = globalThis.window;
    if (browserWindow !== undefined) {
      browserWindow.removeEventListener('scroll', this._onScroll);
      browserWindow.removeEventListener('resize', this._onResize);
    }

    this._styleEl?.remove();
    this._styleEl = null;
    this._sections = [];
  }

  /* ── Section Registration ──────────────────────────────────── */

  registerSection(id: string, el: HTMLElement): void {
    const existing = this._sections.find((s) => s.id === id);
    if (existing) {
      existing.el = el;
      return;
    }
    this._sections.push({
      id,
      el,
      progress: 0,
      inView: false,
      snapPoint: el.offsetTop,
    });
    this._sections.sort((a, b) => a.snapPoint - b.snapPoint);
  }

  unregisterSection(id: string): void {
    this._sections = this._sections.filter((s) => s.id !== id);
  }

  /* ── Callbacks ─────────────────────────────────────────────── */

  onProgress(cb: (progress: number, section: string) => void): void {
    this._onProgress = cb;
  }

  onSectionChange(cb: (sectionId: string, direction: 'up' | 'down') => void): void {
    this._onSectionChange = cb;
  }

  onShaderUpdate(cb: (progress: number, velocity: number) => void): void {
    this._onShaderUpdate = cb;
  }

  /* ── Snap Navigation ───────────────────────────────────────── */

  snapTo(sectionId: string): void {
    const section = this._sections.find((s) => s.id === sectionId);
    const browserWindow = globalThis.window;
    if (!section || browserWindow === undefined) return;

    browserWindow.scrollTo({
      top: section.snapPoint,
      behavior: 'smooth',
    });
  }

  /* ── Public State ──────────────────────────────────────────── */

  getState(): Readonly<ScrollState> {
    return this._state;
  }

  getSections(): ReadonlyArray<Readonly<ScrollSection>> {
    return this._sections;
  }

  /* ── Internal Loop ─────────────────────────────────────────── */

  private readonly _loop = (): void => {
    if (!this._mounted) return;

    const now = performance.now();
    const dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;

    this._updateState(dt);
    this._updateSections();
    this._emitCallbacks();

    this._raf = requestAnimationFrame(this._loop);
  };

  private _updateState(dt: number): void {
    const browserWindow = globalThis.window;
    if (browserWindow === undefined) return;

    const currentY = browserWindow.scrollY;
    const rawVelocity = (currentY - this._lastY) / Math.max(dt, 0.001);
    this._lastY = currentY;

    // Inertia smoothing
    if (this._config.inertia) {
      this._state.velocity = this._state.velocity * this._config.inertiaDamping + rawVelocity * (1 - this._config.inertiaDamping);
    } else {
      this._state.velocity = rawVelocity;
    }

    this._state.position = currentY;

    // Direction
    if (Math.abs(this._state.velocity) < 5) {
      this._state.direction = 'idle';
    } else {
      this._state.direction = this._state.velocity > 0 ? 'down' : 'up';
    }

    // Global progress
    const maxScroll = document.documentElement.scrollHeight - browserWindow.innerHeight;
    this._state.progress = maxScroll > 0 ? currentY / maxScroll : 0;

    // Set CSS variable for scroll-driven animations
    document.documentElement.style.setProperty('--craft-scroll-progress', String(this._state.progress));
    document.documentElement.style.setProperty('--craft-scroll-velocity', String(Math.abs(this._state.velocity) / 1000));
  }

  private _updateSections(): void {
    const browserWindow = globalThis.window;
    if (browserWindow === undefined) return;
    const viewportH = browserWindow.innerHeight;
    const scrollY = this._state.position;
    let newActiveSection = this._state.activeSection;

    for (const section of this._sections) {
      const rect = section.el.getBoundingClientRect();
      const top = rect.top;
      const bottom = rect.bottom;

      // Section visibility progress (0 = below viewport, 1 = fully visible)
      const visibleTop = Math.max(0, Math.min(viewportH, bottom));
      const visibleBottom = Math.max(0, Math.min(viewportH, viewportH - top));
      const visible = Math.min(visibleTop, visibleBottom) / viewportH;
      section.progress = Math.max(0, Math.min(1, visible));
      section.inView = section.progress > 0.1;

      // Update snap point
      section.snapPoint = scrollY + top;

      // Section with most visibility is active
      if (section.progress > 0.5) {
        newActiveSection = section.id;
      }

      // Set per-section CSS variable
      section.el.style.setProperty('--craft-section-progress', String(section.progress));
    }

    // Section change detection
    if (newActiveSection !== this._state.activeSection) {
      const dir = this._state.direction === 'idle' ? 'down' : this._state.direction;
      this._state.activeSection = newActiveSection;
      this._onSectionChange?.(newActiveSection, dir);
    }

    // Snap logic
    if (this._config.snapEnabled && this._state.direction === 'idle' && Math.abs(this._state.velocity) < 2) {
      this._checkSnap();
    }
  }

  private _checkSnap(): void {
    const browserWindow = globalThis.window;
    if (browserWindow === undefined) return;
    const scrollY = browserWindow.scrollY;

    for (const section of this._sections) {
      const dist = Math.abs(scrollY - section.snapPoint);
      if (dist < this._config.snapThreshold && dist > 5) {
        browserWindow.scrollTo({ top: section.snapPoint, behavior: 'smooth' });
        break;
      }
    }
  }

  private _emitCallbacks(): void {
    this._onProgress?.(this._state.progress, this._state.activeSection);

    if (this._config.shaderModulation) {
      this._onShaderUpdate?.(this._state.progress, this._state.velocity);
    }
  }

  /* ── Event Handlers ────────────────────────────────────────── */

  private readonly _onScroll = (): void => {
    // Handled in animation loop for smoothness
  };

  private readonly _onResize = (): void => {
    // Recalculate snap points
    if (globalThis.window === undefined) return;
    for (const section of this._sections) {
      section.snapPoint = section.el.offsetTop;
    }
  };

  /* ── Injected Styles ───────────────────────────────────────── */

  private _injectStyles(): void {
    if (document === undefined) return;

    const css = `
      :root {
        --craft-scroll-progress: 0;
        --craft-scroll-velocity: 0;
      }

      /* Smooth scroll behavior */
      html {
        scroll-behavior: smooth;
      }

      /* Section reveal animation driven by scroll progress */
      [data-craft-scroll-reveal] {
        opacity: calc(var(--craft-section-progress, 0));
        transform: translateY(calc((1 - var(--craft-section-progress, 0)) * 30px));
        transition: opacity 0.1s ease, transform 0.1s ease;
        will-change: opacity, transform;
      }

      /* Parallax layer */
      [data-craft-parallax] {
        transform: translateY(calc(var(--craft-scroll-progress) * var(--craft-parallax-speed, -50) * 1px));
        will-change: transform;
      }

      /* Scroll-driven progress bar */
      .craft-scroll-progress-bar {
        position: fixed;
        top: 0;
        left: 0;
        height: 2px;
        width: calc(var(--craft-scroll-progress) * 100%);
        background: linear-gradient(90deg, oklch(0.70 0.15 250), oklch(0.80 0.20 200));
        z-index: 99999;
        pointer-events: none;
        transform-origin: left;
        will-change: width;
      }
    `;

    this._styleEl = document.createElement('style');
    this._styleEl.dataset.craft = 'cinematic-scroll';
    this._styleEl.textContent = css;
    document.head.appendChild(this._styleEl);
  }
}

// ─── Utility: Parallax Attribute Helper ─────────────────────────

export function setParallaxSpeed(el: HTMLElement, speed: number): void {
  el.dataset.craftParallax = 'true';
  el.style.setProperty('--craft-parallax-speed', String(speed));
}

export function setScrollReveal(el: HTMLElement): void {
  el.dataset.craftScrollReveal = 'true';
}
