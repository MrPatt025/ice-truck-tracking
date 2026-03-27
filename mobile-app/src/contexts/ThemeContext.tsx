import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  colors: {
    primary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
  }
}

const lightColors = {
  primary: '#2196F3',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  border: '#e0e0e0',
}

const darkColors = {
  primary: '#2196F3',
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#cccccc',
  border: '#333333',
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

type ThemeProviderProps = Readonly<{ children: ReactNode }>

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = useCallback(() => {
    setIsDark(current => !current)
  }, [])

  const colors = isDark ? darkColors : lightColors

  const value = useMemo<ThemeContextType>(
    () => ({
      isDark,
      toggleTheme,
      colors,
    }),
    [colors, isDark, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
