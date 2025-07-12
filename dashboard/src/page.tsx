'use client'

import { useState, useEffect } from 'react'
import { MapView } from '@/components/MapView'
import { Dashboard } from '@/components/Dashboard'
import { Sidebar } from '@/components/Sidebar'
import { useRealTimeData } from '@/hooks/useRealTimeData'

export default function Home() {
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null)
  const { trucks, alerts, isConnected } = useRealTimeData()

  return (
    <div className='flex h-screen bg-gray-50 dark:bg-gray-900'>
      <Sidebar
        trucks={trucks}
        alerts={alerts}
        selectedTruck={selectedTruck}
        onSelectTruck={setSelectedTruck}
        isConnected={isConnected}
      />

      <main className='flex-1 flex flex-col lg:flex-row'>
        <div className='flex-1 relative'>
          <MapView
            trucks={trucks}
            geofences={[]}
            selectedTruck={selectedTruck}
            onSelectTruck={setSelectedTruck}
          />
        </div>

        <div className='w-full lg:w-96 border-l border-gray-200 dark:border-gray-700'>
          <Dashboard
            trucks={trucks}
            alerts={alerts}
            selectedTruck={selectedTruck}
          />
        </div>
      </main>
    </div>
  )
}
