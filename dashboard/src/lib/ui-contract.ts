/**
 * UI Contract - Shared design tokens and utilities for dashboard components
 * Source of truth for style consistency across the monorepo
 */

export const ui = {
  // Focus states
  ring: 'focus-ring-theme',

  // Cards & containers
  card: 'card',
  radiusXL: 'rounded-2xl',

  // Brand gradients
  accentGradient:
    'bg-linear-to-br from-violet-500/30 via-purple-500/20 to-cyan-400/30',

  // Glass effect (for backward compat with existing glass cards)
  glassBase: 'bg-slate-900/85 backdrop-blur-2xl ring-1 ring-white/10',

  // Interactive states
  clickable: 'cursor-pointer focus-ring-theme outline-none',
  hoverLift: 'hover:scale-[1.015] transition-all duration-500',
  hoverGlow: 'hover:shadow-2xl hover:shadow-cyan-400/20',

  // Spacing
  cardPadding: 'p-6',
  sectionGap: 'gap-6',
} as const;

export type UIContract = typeof ui;
