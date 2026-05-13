import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import io, { Socket } from 'socket.io-client'

interface Truck {
  id: string
  latitude: number
  longitude: number
  driver_name?: string
  temperature: number
  speed: number
  status: 'active' | 'inactive' | 'offline' | 'maintenance'
}

export function useRealTimeTracking() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const { user, token } = useAuth()

  useEffect(() => {
    if (!user || !token) return

    // Connect to WebSocket server using the real backend URL (or fallback)
    const WEBSOCKET_URL =
      process.env.EXPO_PUBLIC_API_URL || 'ws://localhost:5000'
    const socket: Socket = io(WEBSOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Listen for initial batch or list of trucks
    socket.on('trucks', (payload: Truck[]) => {
      if (Array.isArray(payload)) {
        setTrucks(payload)
      }
    })

    // Listen for real-time truck updates
    socket.on('truck-update', (payload: Truck) => {
      setTrucks(prev => {
        const idx = prev.findIndex(t => t.id === payload.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], ...payload }
          return next
        }
        return [...prev, payload]
      })
    })

    return () => {
      socket.disconnect()
      setIsConnected(false)
    }
  }, [user, token])

  return {
    trucks,
    isConnected,
  }
}
