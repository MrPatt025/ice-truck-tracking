/* ================================================================
 *  CRAFT LAYER — SVG Procedural Icon System (#4)
 *  ─────────────────────────────────────────────────────────────
 *  Every icon is alive. Never static.
 *
 *  Features:
 *    • Path morph interpolation      — smooth shape transitions
 *    • Stroke-dasharray animation    — draw-in/erase effects
 *    • Dynamic stroke weight         — responds to state
 *    • Hover elastic deformation     — subtle rubber-band effect
 *    • Theme-aware color rendering   — adapts to dark/light
 *
 *  Uses pure SVG + CSS — no icon font, no sprite sheet.
 * ================================================================ */

'use client';

import React, { useRef, useEffect, useMemo } from 'react';

// ─── Types ─────────────────────────────────────────────────────

export type IconState = 'idle' | 'active' | 'alert' | 'disabled' | 'loading';
export type IconSize = 16 | 20 | 24 | 32 | 48;

export interface ProceduralIconProps {
  /** SVG path `d` attribute */
  path: string;
  /** Optional morph target path (same point count) */
  morphTo?: string;
  /** Whether the icon is morphed to target */
  morphed?: boolean;
  /** Icon state */
  state?: IconState;
  /** Size in pixels */
  size?: IconSize;
  /** Draw-in animation on mount */
  drawIn?: boolean;
  /** Elastic hover effect */
  elastic?: boolean;
  /** Custom color override */
  color?: string;
  /** Stroke width (px) */
  strokeWidth?: number;
  /** Fill instead of stroke */
  filled?: boolean;
  /** Additional className */
  className?: string;
  /** Accessibility label */
  label?: string;
}

// ─── State Colors ──────────────────────────────────────────────

const STATE_COLORS: Record<IconState, string> = {
  idle: 'currentColor',
  active: 'oklch(0.75 0.15 250)',
  alert: 'oklch(0.65 0.22 25)',
  disabled: 'oklch(0.55 0 0 / 0.4)',
  loading: 'oklch(0.70 0.10 200)',
};

const STATE_STROKE: Record<IconState, number> = {
  idle: 1.5,
  active: 1.8,
  alert: 2.0,
  disabled: 1.2,
  loading: 1.5,
};

// ─── Path Interpolation ───────────────────────────────────────

function interpolatePaths(from: string, to: string, t: number): string {
  const fromNums = from.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  const toNums = to.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  const letters = from.match(/[A-Za-z]/g) || [];

  if (fromNums.length !== toNums.length) return t < 0.5 ? from : to;

  const interpolated = fromNums.map((f, i) => {
    const target = toNums[i] ?? f;
    return f + (target - f) * t;
  });

  // Rebuild path string
  let result = '';
  let numIdx = 0;
  let letterIdx = 0;

  for (let i = 0; i < from.length; i++) {
    const char = from[i];
    if (/[A-Za-z]/.test(char) && letterIdx < letters.length) {
      result += letters[letterIdx++];
    } else if (/[-\d.]/.test(char)) {
      // Find the full number
      const numMatch = from.slice(i).match(/^-?\d+\.?\d*/);
      if (numMatch && numIdx < interpolated.length) {
        result += interpolated[numIdx++].toFixed(2);
        i += numMatch[0].length - 1;
      }
    } else {
      result += char;
    }
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────

export const ProceduralIcon: React.FC<ProceduralIconProps> = ({
  path,
  morphTo,
  morphed = false,
  state = 'idle',
  size = 24,
  drawIn = false,
  elastic = true,
  color,
  strokeWidth,
  filled = false,
  className = '',
  label,
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const animRef = useRef<Animation | null>(null);

  // Morph interpolation
  const currentPath = useMemo(() => {
    if (!morphTo) return path;
    return morphed ? interpolatePaths(path, morphTo, 1) : path;
  }, [path, morphTo, morphed]);

  // Stroke width based on state
  const sw = strokeWidth ?? STATE_STROKE[state];
  const iconColor = color ?? STATE_COLORS[state];

  // Draw-in animation on mount
  useEffect(() => {
    if (!drawIn || !pathRef.current || typeof window === 'undefined') return;

    const pathEl = pathRef.current;
    const length = pathEl.getTotalLength();
    pathEl.style.strokeDasharray = String(length);
    pathEl.style.strokeDashoffset = String(length);

    const anim = pathEl.animate(
      [
        { strokeDashoffset: String(length) },
        { strokeDashoffset: '0' },
      ],
      {
        duration: 600,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    );

    animRef.current = anim;
    return () => anim.cancel();
  }, [drawIn]);

  // Loading rotation
  const loadingStyle: React.CSSProperties = state === 'loading'
    ? { animation: 'craft-icon-spin 1.2s linear infinite' }
    : {};

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? iconColor : 'none'}
      stroke={filled ? 'none' : iconColor}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`craft-icon ${className}`}
      style={{
        transition: 'color 200ms ease, stroke 200ms ease, transform 150ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
        ...loadingStyle,
      }}
      role="img"
      aria-label={label}
      data-craft-icon=""
      data-state={state}
      onMouseEnter={elastic ? (e) => {
        (e.currentTarget as SVGElement).style.transform = 'scale(1.12)';
      } : undefined}
      onMouseLeave={elastic ? (e) => {
        (e.currentTarget as SVGElement).style.transform = 'scale(1)';
      } : undefined}
      onMouseDown={elastic ? (e) => {
        (e.currentTarget as SVGElement).style.transform = 'scale(0.92)';
      } : undefined}
      onMouseUp={elastic ? (e) => {
        (e.currentTarget as SVGElement).style.transform = 'scale(1.12)';
      } : undefined}
    >
      <path
        ref={pathRef}
        d={currentPath}
        style={{
          transition: 'd 400ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </svg>
  );
};

// ─── Common Icon Paths ────────────────────────────────────────

export const ICON_PATHS = {
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 18.5a2 2 0 100-4 2 2 0 000 4zM18.5 18.5a2 2 0 100-4 2 2 0 000 4z',
  alert: 'M12 2L1 21h22L12 2zM12 9v5M12 17h.01',
  temperature: 'M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z',
  route: 'M3 12h4l3-9 4 18 3-9h4',
  map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  check: 'M20 6L9 17l-5-5',
  close: 'M18 6L6 18M6 6l12 12',
  chevronRight: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  snowflake: 'M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93',
} as const;

export type IconName = keyof typeof ICON_PATHS;

// ─── Convenience Wrapper ──────────────────────────────────────

export const CraftIcon: React.FC<Omit<ProceduralIconProps, 'path'> & { name: IconName }> = ({
  name,
  ...props
}) => {
  return <ProceduralIcon path={ICON_PATHS[name]} {...props} />;
};

// ─── Global Keyframe (injected once) ─────────────────────────

if (typeof document !== 'undefined') {
  const existingStyle = document.querySelector('[data-craft="icon-keyframes"]');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.setAttribute('data-craft', 'icon-keyframes');
    style.textContent = `
      @keyframes craft-icon-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}
