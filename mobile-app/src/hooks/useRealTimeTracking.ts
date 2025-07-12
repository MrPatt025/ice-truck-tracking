import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Truck {
  id: string
  latitude: number
  longitude: number
  driver_name: string
  temperature: number
  speed: number
  status: 'active' | 'inactive'
}

export function useRealTimeTracking() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Mock WebSocket connection
    const mockConnection = () => {
      setIsConnected(true)

      // Mock truck data
      const mockTrucks: Truck[] = [
        {
          id: 'truck-001',
          latitude: 13.7563 + (Math.random() - 0.5) * 0.01,
          longitude: 100.5018 + (Math.random() - 0.5) * 0.01,
          driver_name: 'John Doe',
          temperature: -2.5,
          speed: 45,
          status: 'active',
        },
        {
          id: 'truck-002',
          latitude: 13.76 + (Math.random() - 0.5) * 0.01,
          longitude: 100.51 + (Math.random() - 0.5) * 0.01,
          driver_name: 'Jane Smith',
          temperature: -1.8,
          speed: 32,
          status: 'active',
        },
        {
          id: 'truck-003',
          latitude: 13.765 + (Math.random() - 0.5) * 0.01,
          longitude: 100.52 + (Math.random() - 0.5) * 0.01,
          driver_name: 'Mike Johnson',
          temperature: -3.2,
          speed: 0,
          status: 'inactive',
        },
      ]

      setTrucks(mockTrucks)

      // Simulate real-time updates
      const interval = setInterval(() => {
        setTrucks(prevTrucks =>
          prevTrucks.map(truck => ({
            ...truck,
            latitude: truck.latitude + (Math.random() - 0.5) * 0.001,
            longitude: truck.longitude + (Math.random() - 0.5) * 0.001,
            speed: Math.max(0, truck.speed + (Math.random() - 0.5) * 10),
            temperature: truck.temperature + (Math.random() - 0.5) * 0.5,
          }))
        )
      }, 5000)

      return () => {
        clearInterval(interval)
        setIsConnected(false)
      }
    }

    const cleanup = mockConnection()
    return cleanup
  }, [user])

  return {
    trucks,
    isConnected,
  }
}
