'use client'

import {
  createContext,
  memo,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
)

const getSystemTheme = (): 'light' | 'dark' => {
  if (globalThis.window === undefined) return 'light'
  if (globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches)
    return 'dark'
  return 'light'
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ice-truck-theme',
}: Readonly<ThemeProviderProps>) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setTheme(stored as Theme)
    }
  }, [storageKey])

  // Resolve and apply theme
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(resolved)

    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
    root.style.colorScheme = resolved
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return
    const mq = globalThis.window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      setResolvedTheme(getSystemTheme())
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const persistTheme = useCallback(
    (t: Theme) => {
      setTheme(t)
      localStorage.setItem(storageKey, t)
    },
    [storageKey, setTheme]
  )

  const toggleTheme = useCallback(() => {
    persistTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, persistTheme])

  const contextValue = useMemo(
    () => ({ theme, resolvedTheme, setTheme: persistTheme, toggleTheme }),
    [theme, resolvedTheme, persistTheme, toggleTheme]
  )

  return (
    <ThemeProviderContext.Provider value={contextValue}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')
  return context
}

/**
 * Dark Mode Toggle — sun/moon icon with 300ms transition.
 * WCAG 2.1 AA: aria-label, focus-visible ring.
 * Memoized to prevent re-renders from parent prop changes.
 */
export const DarkModeToggle = memo(function DarkModeToggle({
  className = '',
}: {
  className?: string
}) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {/* Sun icon */}
      <svg
        className={`absolute h-5 w-5 transition-all duration-300 ${
          isDark
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }`}
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
        strokeWidth={2}
        aria-hidden='true'
      >
        <circle cx='12' cy='12' r='5' />
        <path d='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42' />
      </svg>
      {/* Moon icon */}
      <svg
        className={`absolute h-5 w-5 transition-all duration-300 ${
          isDark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
        strokeWidth={2}
        aria-hidden='true'
      >
        <path d='M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z' />
      </svg>
    </button>
  )
})

DarkModeToggle.displayName = 'DarkModeToggle'


