'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '../src/ui/components/Button'
import { Card, CardContent } from '../src/ui/components/Card'
import { Tooltip } from '../src/ui/components/Tooltip'
import { usePerformanceMonitor } from '../src/ui/hooks/usePerformance'

interface Truck {
  id: string
  latitude: number
  longitude: number
  status: 'active' | 'inactive' | 'maintenance'
  driver_name: string
  temperature: number
  speed: number
  last_update: string
}

interface MapViewProps {
  trucks: Truck[]
  selectedTruck: string | null
  onSelectTruck: (truckId: string | null) => void
  geofences?: any[]
  className?: string
}

interface TruckCluster {
  id: string
  trucks: Truck[]
  latitude: number
  longitude: number
  count: number
}

type MapStyle = 'streets' | 'satellite' | 'terrain' | 'dark'

export function MapView({
  trucks,
  selectedTruck,
  onSelectTruck,
  geofences = [],
  className,
}: MapViewProps) {
  const { startRender, endRender } = usePerformanceMonitor('MapView')
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets')
  const [showClusters, setShowClusters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(10)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    truck?: Truck
  } | null>(null)

  // Performance monitoring
  useEffect(() => {
    startRender()
    const timer = setTimeout(() => endRender(), 0)
    return () => clearTimeout(timer)
  })

  // Clustering algorithm
  const clusters = useMemo(() => {
    if (!showClusters || trucks.length === 0) return []

    const CLUSTER_RADIUS = 50 // pixels
    const clustered: TruckCluster[] = []
    const processed = new Set<string>()

    trucks.forEach(truck => {
      if (processed.has(truck.id)) return

      const nearbyTrucks = trucks.filter(otherTruck => {
        if (processed.has(otherTruck.id) || truck.id === otherTruck.id)
          return false

        const distance =
          Math.sqrt(
            Math.pow(truck.latitude - otherTruck.latitude, 2) +
              Math.pow(truck.longitude - otherTruck.longitude, 2)
          ) * 111000 // Convert to meters

        return distance < 1000 // 1km clustering radius
      })

      if (nearbyTrucks.length > 0) {
        const clusterTrucks = [truck, ...nearbyTrucks]
        const avgLat =
          clusterTrucks.reduce((sum, t) => sum + t.latitude, 0) /
          clusterTrucks.length
        const avgLng =
          clusterTrucks.reduce((sum, t) => sum + t.longitude, 0) /
          clusterTrucks.length

        clustered.push({
          id: `cluster-${truck.id}`,
          trucks: clusterTrucks,
          latitude: avgLat,
          longitude: avgLng,
          count: clusterTrucks.length,
        })

        clusterTrucks.forEach(t => processed.add(t.id))
      } else {
        processed.add(truck.id)
      }
    })

    return clustered
  }, [trucks, showClusters])

  const handleMapClick = useCallback(
    (event: React.MouseEvent) => {
      const rect = mapRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // Find truck or cluster near click position
      const clickedTruck = trucks.find(truck => {
        const truckX = (truck.longitude + 180) * (rect.width / 360)
        const truckY = (90 - truck.latitude) * (rect.height / 180)
        const distance = Math.sqrt((x - truckX) ** 2 + (y - truckY) ** 2)
        return distance < 20
      })

      if (clickedTruck) {
        onSelectTruck(clickedTruck.id)
      } else {
        onSelectTruck(null)
      }

      setContextMenu(null)
    },
    [trucks, onSelectTruck]
  )

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      const rect = mapRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      const clickedTruck = trucks.find(truck => {
        const truckX = (truck.longitude + 180) * (rect.width / 360)
        const truckY = (90 - truck.latitude) * (rect.height / 180)
        const distance = Math.sqrt((x - truckX) ** 2 + (y - truckY) ** 2)
        return distance < 20
      })

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        truck: clickedTruck,
      })
    },
    [trucks]
  )

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const mapStyles = {
    streets: 'bg-green-50',
    satellite: 'bg-blue-100',
    terrain: 'bg-yellow-50',
    dark: 'bg-gray-900',
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500 border-green-600'
      case 'inactive':
        return 'bg-gray-400 border-gray-500'
      case 'maintenance':
        return 'bg-orange-500 border-orange-600'
      default:
        return 'bg-gray-400 border-gray-500'
    }
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Map Controls */}
      <div className='absolute top-4 left-4 z-10 space-y-2'>
        <Card padding='sm'>
          <select
            value={mapStyle}
            onChange={e => setMapStyle(e.target.value as MapStyle)}
            className='text-sm border-none outline-none bg-transparent'
            aria-label='Map style'
          >
            <option value='streets'>🗺️ Streets</option>
            <option value='satellite'>🛰️ Satellite</option>
            <option value='terrain'>🏔️ Terrain</option>
            <option value='dark'>🌙 Dark</option>
          </select>
        </Card>

        <Card padding='sm'>
          <div className='space-y-2'>
            <label className='flex items-center text-sm'>
              <input
                type='checkbox'
                checked={showClusters}
                onChange={e => setShowClusters(e.target.checked)}
                className='mr-2'
                aria-describedby='clustering-help'
              />
              Clustering
            </label>
            <label className='flex items-center text-sm'>
              <input
                type='checkbox'
                checked={showHeatmap}
                onChange={e => setShowHeatmap(e.target.checked)}
                className='mr-2'
                aria-describedby='heatmap-help'
              />
              Heatmap
            </label>
          </div>
        </Card>

        {/* Zoom Controls */}
        <Card padding='sm'>
          <div className='flex flex-col gap-1'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setZoomLevel(prev => Math.min(prev + 1, 18))}
              aria-label='Zoom in'
            >
              +
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setZoomLevel(prev => Math.max(prev - 1, 1))}
              aria-label='Zoom out'
            >
              -
            </Button>
          </div>
        </Card>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className={`w-full h-full ${mapStyles[mapStyle]} relative overflow-hidden cursor-crosshair transition-colors duration-300`}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        role='application'
        aria-label='Interactive map showing truck locations'
      >
        {/* Individual Trucks */}
        {(!showClusters
          ? trucks
          : trucks.filter(
              truck =>
                !clusters.some(cluster =>
                  cluster.trucks.some(t => t.id === truck.id)
                )
            )
        ).map(truck => {
          const x = ((truck.longitude + 180) * 100) / 360
          const y = ((90 - truck.latitude) * 100) / 180
          const isSelected = selectedTruck === truck.id

          return (
            <Tooltip
              key={truck.id}
              content={`${truck.driver_name} - ${truck.status}`}
            >
              <div
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  isSelected ? 'scale-125 z-20' : 'z-10'
                }`}
                style={{ left: `${x}%`, top: `${y}%` }}
                role='button'
                tabIndex={0}
                aria-label={`Truck ${truck.id}, driver ${truck.driver_name}, status ${truck.status}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectTruck(truck.id)
                  }
                }}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 ${getStatusColor(truck.status)} ${
                    isSelected ? 'ring-4 ring-blue-300' : ''
                  } flex items-center justify-center text-xs`}
                >
                  🚚
                </div>

                {isSelected && (
                  <Card className='absolute top-8 left-1/2 transform -translate-x-1/2 min-w-48 z-30'>
                    <CardContent padding='sm'>
                      <h3 className='font-semibold text-sm mb-2'>
                        {truck.driver_name}
                      </h3>
                      <div className='space-y-1 text-xs'>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>ID:</span>
                          <span>{truck.id}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Speed:</span>
                          <span>{truck.speed} km/h</span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Temp:</span>
                          <span className='text-blue-600'>
                            {truck.temperature}°C
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Status:</span>
                          <span
                            className={`font-medium ${
                              truck.status === 'active'
                                ? 'text-green-600'
                                : truck.status === 'maintenance'
                                  ? 'text-orange-600'
                                  : 'text-gray-600'
                            }`}
                          >
                            {truck.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </Tooltip>
          )
        })}

        {/* Truck Clusters */}
        {showClusters &&
          clusters.map(cluster => {
            const x = ((cluster.longitude + 180) * 100) / 360
            const y = ((90 - cluster.latitude) * 100) / 180

            return (
              <Tooltip
                key={cluster.id}
                content={`${cluster.count} trucks in this area`}
              >
                <div
                  className='absolute transform -translate-x-1/2 -translate-y-1/2 z-10'
                  style={{ left: `${x}%`, top: `${y}%` }}
                  role='button'
                  tabIndex={0}
                  aria-label={`Cluster of ${cluster.count} trucks`}
                >
                  <div className='w-8 h-8 bg-blue-500 border-2 border-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold'>
                    {cluster.count}
                  </div>
                </div>
              </Tooltip>
            )
          })}

        {/* Heatmap Overlay */}
        {showHeatmap && (
          <div
            className='absolute inset-0 pointer-events-none'
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(255, 0, 0, 0.3) 0%, rgba(255, 255, 0, 0.2) 50%, transparent 70%)`,
            }}
            aria-hidden='true'
          />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <Card
          className='fixed z-50 py-1'
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role='menu'
        >
          {contextMenu.truck ? (
            <>
              <button
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2'
                role='menuitem'
              >
                🔍 Zoom to Truck
              </button>
              <button
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2'
                role='menuitem'
              >
                📊 View History
              </button>
              <button
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2'
                role='menuitem'
              >
                🚨 Create Alert
              </button>
            </>
          ) : (
            <>
              <button
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2'
                role='menuitem'
              >
                📍 Add Geofence
              </button>
              <button
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2'
                role='menuitem'
              >
                🎯 Center Map
              </button>
            </>
          )}
        </Card>
      )}

      {/* Screen reader announcements */}
      <div className='sr-only' aria-live='polite' aria-atomic='true'>
        {selectedTruck && `Selected truck ${selectedTruck}`}
        {showClusters &&
          `Clustering enabled, showing ${clusters.length} clusters`}
        {showHeatmap && 'Heatmap overlay enabled'}
      </div>
    </div>
  )
}
