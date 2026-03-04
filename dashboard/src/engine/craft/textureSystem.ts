/* ================================================================
 *  CRAFT LAYER — High-Fidelity Texture System (#8)
 *  ─────────────────────────────────────────────────────────────
 *  Every surface has personality. No flat backgrounds.
 *
 *  Layers:
 *    • MicroTexture     — subtle grain per surface type
 *    • BrushedMetal     — directional liner streak
 *    • SoftDustGrain    — organic randomness
 *    • FabricBackground — woven pattern under glass
 *    • TextureCompositor — stacks layers by z-elevation
 *
 *  All GPU-accelerated via CSS filter + SVG feTurbulence.
 * ================================================================ */

import type { Theme, DeviceTier } from '../types';

// ─── Types ─────────────────────────────────────────────────────

export type TextureType = 'glass' | 'metal' | 'fabric' | 'paper' | 'concrete';

export interface TextureLayer {
  type: TextureType;
  opacity: number;
  scale: number;
  blendMode: string;
  animated: boolean;
}

export interface TextureConfig {
  microGrain: { frequency: number; octaves: number; opacity: number };
  brushedMetal: { angle: number; streakCount: number; opacity: number };
  dustGrain: { density: number; size: number; opacity: number };
  fabric: { weaveScale: number; threadOpacity: number };
}

// ─── Theme Texture Presets ─────────────────────────────────────

const TEXTURE_PRESETS: Record<Theme, TextureConfig> = {
  dark: {
    microGrain:   { frequency: 0.65, octaves: 4, opacity: 0.04 },
    brushedMetal: { angle: 135, streakCount: 200, opacity: 0.03 },
    dustGrain:    { density: 0.4, size: 1.2, opacity: 0.025 },
    fabric:       { weaveScale: 2, threadOpacity: 0.02 },
  },
  neon: {
    microGrain:   { frequency: 0.50, octaves: 3, opacity: 0.035 },
    brushedMetal: { angle: 120, streakCount: 150, opacity: 0.025 },
    dustGrain:    { density: 0.3, size: 1.0, opacity: 0.02 },
    fabric:       { weaveScale: 3, threadOpacity: 0.015 },
  },
  ocean: {
    microGrain:   { frequency: 0.55, octaves: 4, opacity: 0.045 },
    brushedMetal: { angle: 160, streakCount: 180, opacity: 0.028 },
    dustGrain:    { density: 0.35, size: 1.1, opacity: 0.022 },
    fabric:       { weaveScale: 2.5, threadOpacity: 0.018 },
  },
  forest: {
    microGrain:   { frequency: 0.60, octaves: 5, opacity: 0.05 },
    brushedMetal: { angle: 145, streakCount: 160, opacity: 0.022 },
    dustGrain:    { density: 0.45, size: 1.3, opacity: 0.03 },
    fabric:       { weaveScale: 1.8, threadOpacity: 0.025 },
  },
};

// DPR-based quality scaling
const TIER_OPACITY_SCALE: Record<DeviceTier, number> = {
  'high-end': 1.0,
  'mid-range': 0.7,
  'low-end': 0.3,
  'potato': 0,     // textures disabled
};

// ─── SVG Texture Generators ────────────────────────────────────

function createSVGFilter(id: string, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">
    <defs><filter id="${id}">${inner}</filter></defs>
  </svg>`;
}

// ─── Micro Texture ─────────────────────────────────────────────

export class MicroTexture {
  private _svgEl: HTMLDivElement | null = null;
  private _el: HTMLDivElement | null = null;
  private _seed = Math.floor(Math.random() * 1000);

  mount(parent: HTMLElement, config: TextureConfig['microGrain']): void {
    if (typeof document === 'undefined') return;

    const filterId = `craft-micro-grain-${this._seed}`;
    const svgMarkup = createSVGFilter(filterId, `
      <feTurbulence type="fractalNoise"
        baseFrequency="${config.frequency}"
        numOctaves="${config.octaves}"
        seed="${this._seed}"
        stitchTiles="stitch"
        result="noise" />
      <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
      <feComponentTransfer in="mono">
        <feFuncA type="linear" slope="${config.opacity * 20}" intercept="-0.5" />
      </feComponentTransfer>
    `);

    this._svgEl = document.createElement('div');
    this._svgEl.innerHTML = svgMarkup;
    this._svgEl.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    parent.appendChild(this._svgEl);

    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'micro-texture');
    Object.assign(this._el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9985',
      filter: `url(#${filterId})`,
      opacity: String(config.opacity),
      mixBlendMode: 'overlay',
      willChange: 'filter',
    });
    parent.appendChild(this._el);
  }

  update(config: Partial<TextureConfig['microGrain']>): void {
    if (this._el && config.opacity !== undefined) {
      this._el.style.opacity = String(config.opacity);
    }
  }

  destroy(): void {
    this._svgEl?.remove();
    this._el?.remove();
    this._svgEl = null;
    this._el = null;
  }
}

// ─── Brushed Metal ─────────────────────────────────────────────

export class BrushedMetal {
  private _canvas: HTMLCanvasElement | null = null;
  private _el: HTMLDivElement | null = null;

  mount(parent: HTMLElement, config: TextureConfig['brushedMetal']): void {
    if (typeof document === 'undefined') return;

    // Generate brushed metal pattern on offscreen canvas
    this._canvas = document.createElement('canvas');
    this._canvas.width = 256;
    this._canvas.height = 256;
    const ctx = this._canvas.getContext('2d');
    if (!ctx) return;

    // Draw directional streaks
    const rad = (config.angle * Math.PI) / 180;
    ctx.strokeStyle = `rgba(255, 255, 255, ${config.opacity * 2})`;
    ctx.lineWidth = 0.5;

    for (let i = 0; i < config.streakCount; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const len = 20 + Math.random() * 60;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(rad) * len, y + Math.sin(rad) * len);
      ctx.stroke();
    }

    // Apply as repeating background
    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'brushed-metal');
    Object.assign(this._el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9984',
      backgroundImage: `url(${this._canvas.toDataURL()})`,
      backgroundRepeat: 'repeat',
      backgroundSize: '256px 256px',
      opacity: String(config.opacity),
      mixBlendMode: 'overlay',
    });
    parent.appendChild(this._el);
  }

  update(config: Partial<TextureConfig['brushedMetal']>): void {
    if (this._el && config.opacity !== undefined) {
      this._el.style.opacity = String(config.opacity);
    }
  }

  destroy(): void {
    this._el?.remove();
    this._el = null;
    this._canvas = null;
  }
}

// ─── Soft Dust Grain ──────────────────────────────────────────

export class SoftDustGrain {
  private _el: HTMLDivElement | null = null;
  private _svgEl: HTMLDivElement | null = null;
  private _seed = Math.floor(Math.random() * 999);
  private _animated = false;
  private _time = 0;

  mount(parent: HTMLElement, config: TextureConfig['dustGrain']): void {
    if (typeof document === 'undefined') return;

    const filterId = `craft-dust-${this._seed}`;
    const svgMarkup = createSVGFilter(filterId, `
      <feTurbulence type="fractalNoise"
        baseFrequency="${config.density * 0.1}"
        numOctaves="2"
        seed="${this._seed}"
        result="dust" />
      <feColorMatrix type="saturate" values="0" in="dust" result="mono" />
      <feComponentTransfer in="mono">
        <feFuncA type="discrete" tableValues="0 0.1 0 0 0.08 0 0 0.05 0" />
      </feComponentTransfer>
    `);

    this._svgEl = document.createElement('div');
    this._svgEl.innerHTML = svgMarkup;
    this._svgEl.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    parent.appendChild(this._svgEl);

    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'dust-grain');
    Object.assign(this._el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9986',
      filter: `url(#${filterId})`,
      opacity: String(config.opacity),
      mixBlendMode: 'soft-light',
    });
    parent.appendChild(this._el);
  }

  tick(dt: number): void {
    if (!this._animated || !this._el) return;
    this._time += dt;
    // Subtle seed animation for "living" grain — changes every ~200ms
    if (this._time > 0.2) {
      this._time -= 0.2;
      this._seed = (this._seed + 1) % 999;
    }
  }

  enableAnimation(on: boolean): void {
    this._animated = on;
  }

  destroy(): void {
    this._svgEl?.remove();
    this._el?.remove();
    this._svgEl = null;
    this._el = null;
  }
}

// ─── Fabric Background ────────────────────────────────────────

export class FabricBackground {
  private _canvas: HTMLCanvasElement | null = null;
  private _el: HTMLDivElement | null = null;

  mount(parent: HTMLElement, config: TextureConfig['fabric']): void {
    if (typeof document === 'undefined') return;

    this._canvas = document.createElement('canvas');
    const size = 64 * config.weaveScale;
    this._canvas.width = size;
    this._canvas.height = size;
    const ctx = this._canvas.getContext('2d');
    if (!ctx) return;

    // Weave pattern — alternating horizontal/vertical threads
    const threadWidth = 1;
    const gap = config.weaveScale * 2;
    ctx.strokeStyle = `rgba(255, 255, 255, ${config.threadOpacity})`;
    ctx.lineWidth = threadWidth;

    // Horizontal threads
    for (let y = 0; y < size; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    // Vertical threads
    for (let x = 0; x < size; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }

    this._el = document.createElement('div');
    this._el.setAttribute('data-craft', 'fabric-bg');
    Object.assign(this._el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9983',
      backgroundImage: `url(${this._canvas.toDataURL()})`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${size}px ${size}px`,
      opacity: String(config.threadOpacity),
      mixBlendMode: 'overlay',
    });
    parent.appendChild(this._el);
  }

  destroy(): void {
    this._el?.remove();
    this._el = null;
    this._canvas = null;
  }
}

// ─── Texture Compositor ───────────────────────────────────────

export class TextureCompositor {
  private _micro = new MicroTexture();
  private _metal = new BrushedMetal();
  private _dust = new SoftDustGrain();
  private _fabric = new FabricBackground();
  private _mounted = false;
  private _tier: DeviceTier = 'high-end';

  mount(parent?: HTMLElement): void {
    if (this._mounted || typeof document === 'undefined') return;
    this._mounted = true;
    const p = parent || document.body;
    const config = TEXTURE_PRESETS.dark;
    const scale = TIER_OPACITY_SCALE[this._tier];
    if (scale === 0) return; // disabled for potato tier

    this._micro.mount(p, { ...config.microGrain, opacity: config.microGrain.opacity * scale });
    this._metal.mount(p, { ...config.brushedMetal, opacity: config.brushedMetal.opacity * scale });
    this._dust.mount(p, { ...config.dustGrain, opacity: config.dustGrain.opacity * scale });
    this._fabric.mount(p, { ...config.fabric, threadOpacity: config.fabric.threadOpacity * scale });
  }

  setTheme(theme: Theme): void {
    const config = TEXTURE_PRESETS[theme];
    const scale = TIER_OPACITY_SCALE[this._tier];
    this._micro.update({ opacity: config.microGrain.opacity * scale });
    this._metal.update({ opacity: config.brushedMetal.opacity * scale });
  }

  setDeviceTier(tier: DeviceTier): void {
    this._tier = tier;
  }

  tick(dt: number): void {
    this._dust.tick(dt);
  }

  destroy(): void {
    this._micro.destroy();
    this._metal.destroy();
    this._dust.destroy();
    this._fabric.destroy();
    this._mounted = false;
  }
}

export { TEXTURE_PRESETS, TIER_OPACITY_SCALE };
