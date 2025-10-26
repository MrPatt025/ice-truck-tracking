// Centralized theme tokens for the "command center" aesthetic, backed by CSS variables.
export const colors = {
  // Surfaces
  surface0: 'var(--surface-0)',
  surface1: 'var(--surface-1)',
  surface2: 'var(--surface-2)',

  // Borders / outlines
  cardBorder: 'var(--card-border)',
  cardOutline: 'var(--card-outline)',

  // Accent gradient
  accentStart: 'var(--accent-start)',
  accentEnd: 'var(--accent-end)',

  // Semantic statuses
  info: 'var(--status-info)',
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical)',

  // 3D glow
  glowOk: 'var(--glow-ok)',
  glowWarning: 'var(--glow-warning)',
  glowCritical: 'var(--glow-critical)',
  glowDim: 'var(--glow-dim)',

  // Focus
  focusRing: 'var(--focus-ring-color)',
} as const;

export const motion = {
  easing: {
    standard: [0.2, 0.8, 0.2, 1] as const,
    entrance: [0.16, 1, 0.3, 1] as const,
  },
  duration: {
    short: 160,
    medium: 220,
  },
  distance: {
    sm: 12, // px
    md: 16, // px
  },
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
} as const;

export const shadows = {
  card: 'var(--card-shadow)',
} as const;

export type ThemeTokens = {
  colors: typeof colors;
  motion: typeof motion;
  radii: typeof radii;
  shadows: typeof shadows;
};

export const theme: ThemeTokens = { colors, motion, radii, shadows };
