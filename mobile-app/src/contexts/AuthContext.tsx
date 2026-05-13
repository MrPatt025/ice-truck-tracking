import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import * as SecureStore from 'expo-secure-store'
import { authService } from '../services/authService'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token')
      if (storedToken) {
        const userData = await authService.validateToken(storedToken)
        setUser(userData)
        setToken(storedToken)
      }
    } catch (error) {
      // Silently fail auth check
      await SecureStore.deleteItemAsync('auth_token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password)
    await SecureStore.setItemAsync('auth_token', response.token)
    setUser(response.user)
    setToken(response.token)
  }, [])

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token')
      setUser(null)
      setToken(null)
    } catch (error) {
      // Silently fail logout
    }
  }, [])

  const refreshToken = useCallback(async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token')
      if (storedToken) {
        const response = await authService.refreshToken(storedToken)
        await SecureStore.setItemAsync('auth_token', response.token)
        setUser(response.user)
        setToken(response.token)
      }
    } catch (error) {
      // Silent fail
      await logout()
    }
  }, [logout])

  const value = useMemo<AuthContextType>(() => ({
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken,
  }), [user, token, isLoading, login, logout, refreshToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
