/**
 * Design System Tokens — Single source of truth for spacing, typography,
 * breakpoints, z-index, animation durations, and semantic color mappings.
 * 2026-standard tokenized design system for enterprise IoT SaaS.
 */

// ── Spacing Scale (4px base unit) ──────────────────────────
export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
} as const;

// ── Fluid Typography Scale (clamp-based) ───────────────────
export const fontSize = {
  xs: 'clamp(0.694rem, 0.66vi + 0.53rem, 0.8rem)',
  sm: 'clamp(0.833rem, 0.79vi + 0.64rem, 0.95rem)',
  base: 'clamp(0.9375rem, 0.5vi + 0.8125rem, 1rem)',
  lg: 'clamp(1.125rem, 0.75vi + 0.975rem, 1.25rem)',
  xl: 'clamp(1.35rem, 1.2vi + 1.05rem, 1.563rem)',
  '2xl': 'clamp(1.62rem, 1.8vi + 1.17rem, 1.953rem)',
  '3xl': 'clamp(1.944rem, 2.5vi + 1.3rem, 2.441rem)',
  '4xl': 'clamp(2.333rem, 3.5vi + 1.45rem, 3.052rem)',
  '5xl': 'clamp(2.8rem, 4.8vi + 1.6rem, 3.815rem)',
} as const;

// ── Breakpoints ────────────────────────────────────────────
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px', // Enterprise wide-screen
} as const;

// ── Z-Index System ─────────────────────────────────────────
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
  perfOverlay: 100,
} as const;

// ── Animation Durations ────────────────────────────────────
export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
  page: '400ms',
} as const;

// ── Easing Curves ──────────────────────────────────────────
export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
} as const;

// ── Semantic Role Colors ───────────────────────────────────
export const roleColors = {
  admin: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-500' },
  'fleet-manager': { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-500' },
  operator: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', badge: 'bg-green-500' },
  viewer: { bg: 'bg-gray-100 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-400', badge: 'bg-gray-500' },
} as const;

// ── Alert Severity Colors ──────────────────────────────────
export const severityColors = {
  critical: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-500', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
  info: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' },
  success: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-500', text: 'text-green-700 dark:text-green-300', icon: 'text-green-500' },
} as const;

// ── Truck Status Colors ────────────────────────────────────
export const truckStatusColors = {
  active: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  idle: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  maintenance: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  offline: { bg: 'bg-gray-100 dark:bg-gray-900/20', text: 'text-gray-500 dark:text-gray-500', dot: 'bg-gray-400' },
  alert: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500 animate-pulse' },
} as const;

// ── Performance Budgets ────────────────────────────────────
export const perfBudgets = {
  frameTarget: 16.67,      // 60 FPS
  renderBudget: 8,         // ms — max React render time
  layoutBudget: 4,         // ms — max layout/paint
  workerBudget: 50,        // ms — max worker processing
  bundleSizeKB: 250,       // KB — max JS bundle per route
  lcpTarget: 1500,         // ms — Largest Contentful Paint
  fidTarget: 100,          // ms — First Input Delay
  clsTarget: 0.1,          // Cumulative Layout Shift
} as const;

export type UserRole = 'admin' | 'fleet-manager' | 'operator' | 'viewer';
export type TruckStatus = keyof typeof truckStatusColors;
export type AlertSeverity = keyof typeof severityColors;
