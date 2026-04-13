'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Truck {
  id: string
  latitude: number
  longitude: number
  status: 'active' | 'inactive'
  driver_name: string
  temperature: number
  speed: number
}

interface MapViewProps {
  trucks: Truck[]
  selectedTruck: string | null
  onSelectTruck: (truckId: string | null) => void
  geofences: unknown[]
}

type MapStyle = 'streets' | 'satellite' | 'terrain' | 'dark'

export function EnhancedMapView({
  trucks,
  selectedTruck,
  onSelectTruck,
  geofences: _geofences,
}: Readonly<MapViewProps>) {
  const mapRef = useRef<HTMLButtonElement>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets')
  const [showClusters, setShowClusters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    truck?: Truck
  } | null>(null)

  // Mock map implementation for demo
  const handleMapClick = useCallback(
    (event: React.MouseEvent) => {
      const rect = mapRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // Find truck near click position (mock)
      const clickedTruck = trucks.find(truck => {
        const truckX = (truck.longitude + 180) * (rect.width / 360)
        const truckY = (90 - truck.latitude) * (rect.height / 180)
        const distance = Math.hypot(x - truckX, y - truckY)
        return distance < 20
      })

      if (clickedTruck) {
        onSelectTruck(clickedTruck.id)
      } else {
        onSelectTruck(null)
      }
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

      // Find truck near right-click position
      const clickedTruck = trucks.find(truck => {
        const truckX = (truck.longitude + 180) * (rect.width / 360)
        const truckY = (90 - truck.latitude) * (rect.height / 180)
        const distance = Math.hypot(x - truckX, y - truckY)
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
    streets: 'bg-emerald-700 text-white',
    satellite: 'bg-sky-700 text-white',
    terrain: 'bg-amber-700 text-white',
    dark: 'bg-slate-900 text-white',
  }

  const contextLeft =
    contextMenu === null
      ? 0
      : Math.max(8, Math.min(contextMenu.x, globalThis.innerWidth - 216))
  const contextTop =
    contextMenu === null
      ? 0
      : Math.max(8, Math.min(contextMenu.y, globalThis.innerHeight - 168))

  return (
    <div className='relative w-full h-full'>
      {/* Map Controls */}
      <div className='absolute top-4 left-4 z-10 flex flex-col gap-2'>
        <div className='bg-white rounded-lg shadow-md p-2'>
          <select
            value={mapStyle}
            onChange={e => setMapStyle(e.target.value as MapStyle)}
            className='text-sm leading-5 rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-400/70'
            aria-label='Map style'
          >
            <option value='streets'>Streets</option>
            <option value='satellite'>Satellite</option>
            <option value='terrain'>Terrain</option>
            <option value='dark'>Dark</option>
          </select>
        </div>

        <div className='bg-white rounded-lg shadow-md p-2 space-y-1'>
          <label className='flex items-center text-sm leading-5 text-slate-800'>
            <input
              type='checkbox'
              checked={showClusters}
              onChange={e => setShowClusters(e.target.checked)}
              className='mr-2 accent-cyan-500'
            />
            <span>Clustering</span>
          </label>
          <label className='flex items-center text-sm leading-5 text-slate-800'>
            <input
              type='checkbox'
              checked={showHeatmap}
              onChange={e => setShowHeatmap(e.target.checked)}
              className='mr-2 accent-cyan-500'
            />
            <span>Heatmap</span>
          </label>
        </div>
      </div>

      {/* Map Container — interactive widget with full keyboard support */}
      <button
        type='button'
        ref={mapRef}
        className={`w-full h-full ${mapStyles[mapStyle]} relative overflow-hidden cursor-crosshair`}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        aria-label='Interactive map showing truck locations'
      >
        {/* Trucks */}
        {trucks.map(truck => {
          const x = ((truck.longitude + 180) * 100) / 360
          const y = ((90 - truck.latitude) * 100) / 180
          const isSelected = selectedTruck === truck.id

          return (
            <div
              key={truck.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                isSelected ? 'scale-125 z-20' : 'z-10'
              }`}
              style={{ left: `${x}%`, top: `${y}%` }} // NOSONAR — dynamic map coordinates
            >
              <div
                className={`w-6 h-6 rounded-full border-2 ${
                  truck.status === 'active'
                    ? 'bg-green-500 border-green-600'
                    : 'bg-gray-400 border-gray-500'
                } ${isSelected ? 'ring-4 ring-blue-300' : ''}`}
              >
                <span className='text-xs text-white font-bold flex items-center justify-center h-full'>
                  T
                </span>
              </div>

              {isSelected && (
                <div className='absolute top-8 left-1/2 z-30 w-52 -translate-x-1/2 transform rounded-lg bg-white p-3 text-slate-900 shadow-lg'>
                  <h3 className='line-clamp-2 text-sm font-semibold leading-5'>
                    {truck.driver_name}
                  </h3>
                  <p className='mt-1 text-xs text-slate-600'>ID: {truck.id}</p>
                  <p className='text-xs text-slate-600'>
                    Speed: {truck.speed} km/h
                  </p>
                  <p className='text-xs text-slate-600'>
                    Temp: {truck.temperature}°C
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      truck.status === 'active'
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    Status: {truck.status}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* Heatmap Overlay */}
        {showHeatmap && (
          <div className='absolute inset-0 bg-gradient-radial from-red-500/20 via-yellow-500/10 to-transparent pointer-events-none' />
        )}
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className='fixed z-50 w-52 rounded-lg border bg-white py-2 text-slate-900 shadow-lg'
          style={{ left: contextLeft, top: contextTop }}
        >
          {contextMenu.truck ? (
            <>
              <button className='w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-100'>
                Zoom to Truck
              </button>
              <button className='w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-100'>
                View History
              </button>
              <button className='w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-100'>
                Create Alert
              </button>
            </>
          ) : (
            <>
              <button className='w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-100'>
                Add Geofence
              </button>
              <button className='w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-100'>
                Center Map
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}


