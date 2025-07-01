'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

interface Truck {
  id: string
  plate_number: string
  latitude: number
  longitude: number
  status: 'active' | 'inactive'
  driver_name?: string
  last_update?: string
}

interface Alert {
  id: string
  truck_id: string
  message: string
  type: 'info' | 'warning' | 'error'
  timestamp: string
}

export function useRealTimeData() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to real-time server')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from real-time server')
    })

    // Listen for truck updates
    newSocket.on('truck_update', (data: Truck) => {
      setTrucks(prev => {
        const index = prev.findIndex(t => t.id === data.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = { ...updated[index], ...data }
          return updated
        }
        return [...prev, data]
      })
    })

    // Listen for new alerts
    newSocket.on('new_alert', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]) // Keep last 50 alerts
    })

    // Listen for bulk data updates
    newSocket.on('trucks_data', (trucksData: Truck[]) => {
      setTrucks(trucksData)
    })

    newSocket.on('alerts_data', (alertsData: Alert[]) => {
      setAlerts(alertsData)
    })

    setSocket(newSocket)

    // Fetch initial data via HTTP as fallback
    fetchInitialData()

    return () => {
      newSocket.close()
    }
  }, [])

  const fetchInitialData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      // Fetch trucks
      const trucksResponse = await fetch(`${apiUrl}/api/v1/trucks`)
      if (trucksResponse.ok) {
        const trucksData = await trucksResponse.json()
        setTrucks(trucksData.data || [])
      }

      // Fetch alerts
      const alertsResponse = await fetch(`${apiUrl}/api/v1/alerts`)
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error)
    }
  }

  return {
    trucks,
    alerts,
    isConnected,
    socket
  }
}