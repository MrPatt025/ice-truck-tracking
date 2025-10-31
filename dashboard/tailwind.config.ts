import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        apollo: {
          DEFAULT: 'var(--brand-start)',
          start: 'var(--brand-start)',
          mid: 'var(--brand-mid)',
          end: 'var(--brand-end)',
        },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        status: {
          info: 'var(--status-info)',
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          critical: 'var(--status-critical)',
        },
      },
      borderRadius: {
        card: 'var(--radius-lg)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        glass: 'var(--card-shadow)',
        'glass-hover': 'var(--card-shadow-hover)',
        'elevation-1': 'var(--shadow-sm)',
        'elevation-2': 'var(--shadow-md)',
        'elevation-3': 'var(--shadow-lg)',
        'elevation-4': 'var(--shadow-xl)',
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'system-ui',
          'ui-sans-serif',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'var(--font-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      lineHeight: {
        tight: 'var(--line-height-tight)',
        normal: 'var(--line-height-normal)',
        relaxed: 'var(--line-height-relaxed)',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: 'var(--line-height-normal)' }],
        sm: ['0.875rem', { lineHeight: 'var(--line-height-normal)' }],
        base: ['1rem', { lineHeight: 'var(--line-height-normal)' }],
        lg: ['1.125rem', { lineHeight: 'var(--line-height-tight)' }],
        xl: ['1.25rem', { lineHeight: 'var(--line-height-tight)' }],
        '2xl': ['1.5rem', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['1.875rem', { lineHeight: 'var(--line-height-tight)' }],
      },
      zIndex: {
        '60': '60',
        '100': '100',
        '120': '120',
        '9999': '9999',
      },
    },
  },
  plugins: [],
};

export default config;
