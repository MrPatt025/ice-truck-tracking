'use client'

interface DashboardProps {
  trucks: any[]
  alerts: any[]
  selectedTruck: string | null
}

export function Dashboard({ trucks, alerts, selectedTruck }: DashboardProps) {
  const activeTrucks = trucks.filter(t => t.status === 'active').length
  const totalAlerts = alerts.length
  const selectedTruckData = trucks.find(t => t.id === selectedTruck)

  return (
    <div className='h-full bg-white dark:bg-gray-800 overflow-y-auto'>
      <div className='p-6'>
        <h2 className='text-2xl font-bold mb-6 text-gray-900 dark:text-white'>
          Dashboard
        </h2>

        {/* KPI Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
          <div className='bg-green-50 dark:bg-green-900/20 p-4 rounded-lg'>
            <h3 className='text-sm font-medium text-green-600 dark:text-green-400'>
              Active Trucks
            </h3>
            <p className='text-2xl font-bold text-green-900 dark:text-green-100'>
              {activeTrucks}
            </p>
          </div>

          <div className='bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg'>
            <h3 className='text-sm font-medium text-yellow-600 dark:text-yellow-400'>
              Total Alerts
            </h3>
            <p className='text-2xl font-bold text-yellow-900 dark:text-yellow-100'>
              {totalAlerts}
            </p>
          </div>
        </div>

        {/* Selected Truck Details */}
        {selectedTruckData && (
          <div className='mb-6'>
            <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-white'>
              Selected Truck: {selectedTruckData.plate_number}
            </h3>
            <div className='bg-gray-50 dark:bg-gray-700 p-4 rounded-lg'>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Driver:
                  </span>
                  <p className='font-medium'>
                    {selectedTruckData.driver_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Status:
                  </span>
                  <p className='font-medium'>{selectedTruckData.status}</p>
                </div>
                <div>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Location:
                  </span>
                  <p className='font-medium'>
                    {selectedTruckData.latitude?.toFixed(4)},{' '}
                    {selectedTruckData.longitude?.toFixed(4)}
                  </p>
                </div>
                <div>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Last Update:
                  </span>
                  <p className='font-medium'>
                    {selectedTruckData.last_update || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-white'>
            Recent Activity
          </h3>
          <div className='space-y-3'>
            {alerts.slice(0, 10).map((alert, index) => (
              <div
                key={index}
                className='flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === 'error'
                      ? 'bg-red-500'
                      : alert.type === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                  }`}
                />
                <div className='flex-1'>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>
                    {alert.message}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {alert.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


