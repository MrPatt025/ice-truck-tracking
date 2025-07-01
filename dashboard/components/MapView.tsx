'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { socketService, TruckLocation, GeofenceAlert } from '../src/services/socket'

interface Truck {
  id: string
  plate_number: string
  latitude: number
  longitude: number
  status: 'active' | 'inactive'
  driver_name?: string
  temperature?: number
  speed?: number
}

interface Geofence {
  id: string
  name: string
  coordinates: [number, number][]
  type: 'allowed' | 'restricted'
}

interface MapViewProps {
  trucks: Truck[]
  geofences: Geofence[]
  selectedTruck: string | null
  onSelectTruck: (truckId: string) => void
  darkMode?: boolean
}

export function MapView({ trucks, geofences = [], selectedTruck, onSelectTruck, darkMode = false }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({})
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([])
  const [realTimeTrucks, setRealTimeTrucks] = useState<{ [key: string]: TruckLocation }>({})

  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize map
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    
    const mapStyle = darkMode 
      ? 'mapbox://styles/mapbox/dark-v11' 
      : 'mapbox://styles/mapbox/streets-v12'
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [100.5018, 13.7563], // Bangkok center
      zoom: 10
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    // Setup real-time socket connection
    socketService.connect()
    
    socketService.onTruckLocationUpdate((data: TruckLocation) => {
      setRealTimeTrucks(prev => ({ ...prev, [data.id]: data }))
    })

    socketService.onGeofenceAlert((alert: GeofenceAlert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep last 10 alerts
    })

    return () => {
      map.current?.remove()
      socketService.disconnect()
    }
  }, [darkMode])

  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.remove())
    markers.current = {}

    // Add truck markers
    trucks.forEach(truck => {
      const el = document.createElement('div')
      el.className = `truck-marker w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer ${
        truck.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
      } ${selectedTruck === truck.id ? 'ring-4 ring-blue-400' : ''}`
      el.innerHTML = '🚚'
      
      el.addEventListener('click', () => onSelectTruck(truck.id))

      const marker = new mapboxgl.Marker(el)
        .setLngLat([truck.longitude, truck.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold">${truck.plate_number}</h3>
                <p class="text-sm text-gray-600">${truck.driver_name || 'No driver assigned'}</p>
                <p class="text-xs text-gray-500">Status: ${truck.status}</p>
              </div>
            `)
        )
        .addTo(map.current!)

      markers.current[truck.id] = marker
    })

    // Fit map to show all trucks
    if (trucks.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      trucks.forEach(truck => {
        bounds.extend([truck.longitude, truck.latitude])
      })
      map.current.fitBounds(bounds, { padding: 50 })
    }
  }, [trucks, selectedTruck, onSelectTruck])

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map overlay controls */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Active ({trucks.filter(t => t.status === 'active').length})</span>
        </div>
        <div className="flex items-center space-x-2 text-sm mt-1">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span>Inactive ({trucks.filter(t => t.status === 'inactive').length})</span>
        </div>
      </div>
    </div>
  )
}