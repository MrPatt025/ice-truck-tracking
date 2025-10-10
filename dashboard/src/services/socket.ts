import { io, Socket } from 'socket.io-client'

export interface TruckLocation {
  id: string
  lat: number
  lng: number
  timestamp: string
  speed: number
  temperature: number
  status: 'active' | 'idle' | 'offline'
}

export interface GeofenceAlert {
  id: string
  truckId: string
  type: 'entry' | 'exit' | 'violation'
  geofenceId: string
  timestamp: string
  location: { lat: number; lng: number }
}

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(
    url: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000'
  ) {
    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('connect_error', error => {
      console.error('Socket connection error:', error)
      this.reconnectAttempts++
    })

    return this.socket
  }

  onTruckLocationUpdate(callback: (data: TruckLocation) => void) {
    this.socket?.on('truck:location', callback)
  }

  onGeofenceAlert(callback: (data: GeofenceAlert) => void) {
    this.socket?.on('geofence:alert', callback)
  }

  onTruckStatusChange(
    callback: (data: { truckId: string; status: string }) => void
  ) {
    this.socket?.on('truck:status', callback)
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data)
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const socketService = new SocketService()
export default socketService


