export const theme = {
  colors: {
    primary: {
      50: '#e3f2fd',
      100: '#bbdefb',
      500: '#2196f3',
      600: '#1976d2',
      900: '#0d47a1',
    },
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      500: '#9e9e9e',
      700: '#616161',
      900: '#212121',
    },
    success: {
      50: '#e8f5e8',
      500: '#4caf50',
      600: '#43a047',
    },
    warning: {
      50: '#fff3e0',
      500: '#ff9800',
      600: '#f57c00',
    },
    error: {
      50: '#ffebee',
      500: '#f44336',
      600: '#e53935',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
} as const;

export type Theme = typeof theme;