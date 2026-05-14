import { useState, useEffect, useCallback } from 'react'
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

  const handleTruckUpdate = useCallback((payload: Truck) => {
    setTrucks(prev => {
      const idx = prev.findIndex(t => t.id === payload.id)
      if (idx < 0) return [...prev, payload]

      const next = [...prev]
      next[idx] = { ...next[idx], ...payload }
      return next
    })
  }, [])

  const handleConnect = useCallback(() => {
    setIsConnected(true)
  }, [])

  const handleDisconnect = useCallback(() => {
    setIsConnected(false)
  }, [])

  const handleTrucksPayload = useCallback((payload: Truck[]) => {
    if (Array.isArray(payload)) {
      setTrucks(payload)
    }
  }, [])

  useEffect(() => {
    if (!user || !token) return

    const WEBSOCKET_URL =
      process.env.EXPO_PUBLIC_API_URL || 'ws://localhost:5000'
    const socket: Socket = io(WEBSOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('trucks', handleTrucksPayload)
    socket.on('truck-update', handleTruckUpdate)

    return () => {
      socket.disconnect()
      setIsConnected(false)
    }
  }, [user, token, handleTruckUpdate, handleConnect, handleDisconnect, handleTrucksPayload])

  return {
    trucks,
    isConnected,
  }
}
