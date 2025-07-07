'use client'

interface SidebarProps {
  trucks: any[]
  alerts: any[]
  selectedTruck: string | null
  onSelectTruck: (truckId: string) => void
  isConnected: boolean
}

export function Sidebar({ trucks, alerts, selectedTruck, onSelectTruck, isConnected }: SidebarProps) {
  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          🚚❄️ Ice Truck Tracking
        </h1>
        <div className="flex items-center mt-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-3">Active Trucks ({trucks.length})</h2>
          <div className="space-y-2">
            {trucks.map((truck) => (
              <div
                key={truck.id}
                onClick={() => onSelectTruck(truck.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedTruck === truck.id
                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-300'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{truck.plate_number}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    truck.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {truck.status}
                  </span>
                </div>
                {truck.driver_name && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {truck.driver_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Recent Alerts ({alerts.length})</h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}