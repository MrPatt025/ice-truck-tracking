/* ================================================================
 *  CRAFT LAYER — Fluid Layout Morphing (#6)
 *  ─────────────────────────────────────────────────────────────
 *  No hard cuts. Every transition is a morph.
 *
 *  Features:
 *    • Shared layout animation  — elements persist across views
 *    • Morph card → modal       — seamless expansion
 *    • Route transition dissolve — cross-fade between pages
 *    • Soft boundary morphing   — organic shape transitions
 *
 *  Uses FLIP technique (First, Last, Invert, Play).
 * ================================================================ */

// ─── Types ─────────────────────────────────────────────────────

export interface MorphRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: string;
  opacity: number;
}

export interface MorphConfig {
  duration: number;         // ms
  easing: string;           // CSS easing function
  scaleCorrection: boolean; // correct child scale during parent animation
  crossFade: boolean;       // opacity crossfade during transition
}

export type TransitionType = 'morph' | 'dissolve' | 'slide' | 'scale';

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_MORPH: MorphConfig = {
  duration: 400,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  scaleCorrection: true,
  crossFade: true,
};

// ─── FLIP Animation Engine ────────────────────────────────────

export class FLIPAnimator {
  private _snapshots = new Map<string, MorphRect>();
  private _activeAnimations = new Map<string, Animation>();

  /** Snapshot current position of a shared element */
  snapshot(id: string, el: HTMLElement): void {
    const rect = el.getBoundingClientRect();
    this._snapshots.set(id, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      borderRadius: getComputedStyle(el).borderRadius,
      opacity: parseFloat(getComputedStyle(el).opacity),
    });
  }

  /** Animate from snapshot to current position (call after layout change) */
  play(id: string, el: HTMLElement, config?: Partial<MorphConfig>): void {
    const first = this._snapshots.get(id);
    if (!first) return;

    const c = { ...DEFAULT_MORPH, ...config };
    const last = el.getBoundingClientRect();

    // Invert
    const dx = first.x - last.left;
    const dy = first.y - last.top;
    const sw = first.width / last.width;
    const sh = first.height / last.height;

    // Play
    const anim = el.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${sw}, ${sh})`,
          borderRadius: first.borderRadius,
          opacity: c.crossFade ? first.opacity : 1,
        },
        {
          transform: 'translate(0, 0) scale(1, 1)',
          borderRadius: getComputedStyle(el).borderRadius,
          opacity: 1,
        },
      ],
      {
        duration: c.duration,
        easing: c.easing,
        fill: 'none',
      },
    );

    this._activeAnimations.set(id, anim);
    anim.onfinish = () => {
      this._activeAnimations.delete(id);
      this._snapshots.delete(id);
    };

    // Scale correction for children
    if (c.scaleCorrection) {
      this._correctChildScale(el, sw, sh, c);
    }
  }

  /** Cancel a running morph */
  cancel(id: string): void {
    this._activeAnimations.get(id)?.cancel();
    this._activeAnimations.delete(id);
  }

  private _correctChildScale(parent: HTMLElement, sw: number, sh: number, config: MorphConfig): void {
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      child.animate(
        [
          { transform: `scale(${1 / sw}, ${1 / sh})` },
          { transform: 'scale(1, 1)' },
        ],
        {
          duration: config.duration,
          easing: config.easing,
          fill: 'none',
        },
      );
    }
  }
}

// ─── Route Transition Manager ─────────────────────────────────

export class RouteTransitionManager {
  private _currentView: HTMLElement | null = null;
  private _transitionType: TransitionType = 'dissolve';
  private _duration = 350;
  private _easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  setTransitionType(type: TransitionType): void {
    this._transitionType = type;
  }

  /** Transition between two view containers */
  async transition(from: HTMLElement, to: HTMLElement): Promise<void> {
    switch (this._transitionType) {
      case 'dissolve':
        return this._dissolve(from, to);
      case 'morph':
        return this._morph(from, to);
      case 'slide':
        return this._slide(from, to);
      case 'scale':
        return this._scale(from, to);
    }
  }

  private _dissolve(from: HTMLElement, to: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      to.style.opacity = '0';
      to.style.position = 'absolute';
      to.style.inset = '0';

      const fadeOut = from.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: this._duration * 0.6,
        easing: this._easing,
        fill: 'forwards',
      });

      fadeOut.onfinish = () => {
        from.style.display = 'none';
        to.style.position = '';
        to.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: this._duration * 0.4,
          easing: this._easing,
          fill: 'forwards',
        }).onfinish = () => resolve();
      };
    });
  }

  private _morph(from: HTMLElement, to: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();

      to.style.transformOrigin = 'top left';
      to.animate(
        [
          {
            transform: `translate(${fromRect.left - toRect.left}px, ${fromRect.top - toRect.top}px) scale(${fromRect.width / toRect.width}, ${fromRect.height / toRect.height})`,
            opacity: 0,
          },
          {
            transform: 'translate(0, 0) scale(1, 1)',
            opacity: 1,
          },
        ],
        {
          duration: this._duration,
          easing: this._easing,
          fill: 'forwards',
        },
      ).onfinish = () => {
        from.style.display = 'none';
        resolve();
      };
    });
  }

  private _slide(from: HTMLElement, to: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      from.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }], {
        duration: this._duration,
        easing: this._easing,
        fill: 'forwards',
      });

      to.style.transform = 'translateX(100%)';
      to.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], {
        duration: this._duration,
        easing: this._easing,
        fill: 'forwards',
      }).onfinish = () => resolve();
    });
  }

  private _scale(from: HTMLElement, to: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      from.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.95)', opacity: 0 }], {
        duration: this._duration * 0.5,
        easing: this._easing,
        fill: 'forwards',
      }).onfinish = () => {
        from.style.display = 'none';
        to.animate([{ transform: 'scale(1.05)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
          duration: this._duration * 0.5,
          easing: this._easing,
          fill: 'forwards',
        }).onfinish = () => resolve();
      };
    });
  }
}

// ─── Card-to-Modal Morph ──────────────────────────────────────

export class CardModalMorph {
  private _flipAnimator = new FLIPAnimator();
  private _overlay: HTMLDivElement | null = null;

  /** Expand a card into a modal */
  expand(cardEl: HTMLElement, modalEl: HTMLElement, id = 'card-modal'): void {
    // Snapshot card position
    this._flipAnimator.snapshot(id, cardEl);

    // Create overlay backdrop
    if (typeof document !== 'undefined') {
      this._overlay = document.createElement('div');
      Object.assign(this._overlay.style, {
        position: 'fixed',
        inset: '0',
        background: 'oklch(0.10 0.02 260 / 0.6)',
        zIndex: '9990',
        opacity: '0',
      });
      document.body.appendChild(this._overlay);
      this._overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 300,
        easing: 'ease-out',
        fill: 'forwards',
      });
    }

    // Show modal and FLIP animate
    modalEl.style.display = '';
    requestAnimationFrame(() => {
      this._flipAnimator.play(id, modalEl, { duration: 450 });
    });
  }

  /** Collapse modal back to card */
  collapse(cardEl: HTMLElement, modalEl: HTMLElement, id = 'card-modal'): void {
    // Snapshot modal position
    this._flipAnimator.snapshot(id, modalEl);

    // Fade overlay
    const anim = this._overlay?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 250,
      easing: 'ease-in',
      fill: 'forwards',
    });
    if (anim) {
      anim.onfinish = () => {
        this._overlay?.remove();
        this._overlay = null;
      };
    }

    // Hide modal, show card, FLIP
    modalEl.style.display = 'none';
    requestAnimationFrame(() => {
      this._flipAnimator.play(id, cardEl, { duration: 350 });
    });
  }

  destroy(): void {
    this._overlay?.remove();
    this._overlay = null;
  }
}
