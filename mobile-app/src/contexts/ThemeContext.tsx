import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}

const lightColors = {
  primary: '#2196F3',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  border: '#e0e0e0',
};

const darkColors = {
  primary: '#2196F3',
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#cccccc',
  border: '#333333',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const colors = isDark ? darkColors : lightColors;

  const value: ThemeContextType = {
    isDark,
    toggleTheme,
    colors,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}