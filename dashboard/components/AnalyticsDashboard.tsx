'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AnalyticsData {
  dailyDistance: { date: string; distance: number }[]
  truckUtilization: { truck: string; utilization: number }[]
  alertFrequency: { type: string; count: number }[]
  performanceMetrics: {
    avgResponseTime: number
    successRate: number
    activeConnections: number
  }
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      // Mock data for demo
      setData({
        dailyDistance: [
          { date: '2025-01-01', distance: 245 },
          { date: '2025-01-02', distance: 312 },
          { date: '2025-01-03', distance: 189 },
          { date: '2025-01-04', distance: 278 },
          { date: '2025-01-05', distance: 356 },
          { date: '2025-01-06', distance: 298 },
          { date: '2025-01-07', distance: 334 }
        ],
        truckUtilization: [
          { truck: 'Truck-001', utilization: 85 },
          { truck: 'Truck-002', utilization: 92 },
          { truck: 'Truck-003', utilization: 78 },
          { truck: 'Truck-004', utilization: 88 }
        ],
        alertFrequency: [
          { type: 'Geofence', count: 12 },
          { type: 'Temperature', count: 8 },
          { type: 'Speed', count: 15 },
          { type: 'Offline', count: 5 }
        ],
        performanceMetrics: {
          avgResponseTime: 145,
          successRate: 99.2,
          activeConnections: 24
        }
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  if (!data) return <div>Loading analytics...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 Analytics Dashboard</h2>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
          <p className="text-2xl font-bold text-blue-600">{data.performanceMetrics.avgResponseTime}ms</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
          <p className="text-2xl font-bold text-green-600">{data.performanceMetrics.successRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Connections</h3>
          <p className="text-2xl font-bold text-purple-600">{data.performanceMetrics.activeConnections}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Distance Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📈 Daily Distance Traveled</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.dailyDistance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="distance" stroke="#2196F3" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Truck Utilization Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">🚚 Truck Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.truckUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="truck" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="utilization" fill="#4CAF50" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Frequency Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">🚨 Alert Frequency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.alertFrequency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#FF9800" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Trends */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">⚡ Performance Trends</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>API Response Time</span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Database Performance</span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{width: '90%'}}></div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>WebSocket Stability</span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}