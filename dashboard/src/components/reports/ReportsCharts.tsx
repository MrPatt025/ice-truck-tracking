'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type ReportsTab = 'overview' | 'temperature' | 'delivery' | 'fuel';

export interface TemperatureDatum {
  hour: string;
  avg: number;
  min: number;
  max: number;
}

export interface DeliveryDatum {
  date: string;
  completed: number;
  failed: number;
  pending: number;
}

export interface FuelDatum {
  date: string;
  consumption: number;
  cost: number;
}

export interface FleetDistributionDatum {
  name: string;
  value: number;
  color: string;
}

interface ReportsChartsProps {
  activeTab: ReportsTab;
  temperatureData: TemperatureDatum[];
  deliveryData: DeliveryDatum[];
  fuelData: FuelDatum[];
  fleetDistribution: FleetDistributionDatum[];
}

export function ReportsCharts({
  activeTab,
  temperatureData,
  deliveryData,
  fuelData,
  fleetDistribution,
}: Readonly<ReportsChartsProps>): JSX.Element {
  if (activeTab === 'overview') {
    return (
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 bg-card rounded-xl border border-border p-4'>
          <h3 className='text-sm font-medium mb-4'>Delivery Trend</h3>
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={deliveryData}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                <XAxis dataKey='date' className='text-xs' tick={{ fill: 'currentColor' }} />
                <YAxis className='text-xs' tick={{ fill: 'currentColor' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey='completed' fill='#10b981' radius={[4, 4, 0, 0]} name='Completed' />
                <Bar dataKey='failed' fill='#ef4444' radius={[4, 4, 0, 0]} name='Failed' />
                <Bar dataKey='pending' fill='#f59e0b' radius={[4, 4, 0, 0]} name='Pending' />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='bg-card rounded-xl border border-border p-4'>
          <h3 className='text-sm font-medium mb-4'>Fleet Distribution</h3>
          <div className='h-52'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={fleetDistribution}
                  dataKey='value'
                  cx='50%'
                  cy='50%'
                  outerRadius={80}
                  label
                >
                  {fleetDistribution.map(entry => (
                    <Cell key={entry.color} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'temperature') {
    return (
      <div className='bg-card rounded-xl border border-border p-4'>
        <h3 className='text-sm font-medium mb-4'>Temperature Monitoring (24h)</h3>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={temperatureData}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='hour' className='text-xs' tick={{ fill: 'currentColor' }} />
              <YAxis className='text-xs' tick={{ fill: 'currentColor' }} domain={[-25, -10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Area type='monotone' dataKey='max' stroke='#f97316' fill='#f97316' fillOpacity={0.1} name='Max' />
              <Area type='monotone' dataKey='avg' stroke='#06b6d4' fill='#06b6d4' fillOpacity={0.2} name='Average' />
              <Area type='monotone' dataKey='min' stroke='#3b82f6' fill='#3b82f6' fillOpacity={0.1} name='Min' />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (activeTab === 'delivery') {
    return (
      <div className='bg-card rounded-xl border border-border p-4'>
        <h3 className='text-sm font-medium mb-4'>Delivery Performance</h3>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={deliveryData}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='date' className='text-xs' tick={{ fill: 'currentColor' }} />
              <YAxis className='text-xs' tick={{ fill: 'currentColor' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Bar dataKey='completed' stackId='a' fill='#10b981' name='Completed' />
              <Bar dataKey='failed' stackId='a' fill='#ef4444' name='Failed' />
              <Bar dataKey='pending' stackId='a' fill='#f59e0b' name='Pending' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-card rounded-xl border border-border p-4'>
      <h3 className='text-sm font-medium mb-4'>Fuel Consumption & Costs (30 days)</h3>
      <div className='h-80'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={fuelData}>
            <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
            <XAxis dataKey='date' className='text-xs' tick={{ fill: 'currentColor' }} />
            <YAxis yAxisId='left' className='text-xs' tick={{ fill: 'currentColor' }} />
            <YAxis
              yAxisId='right'
              orientation='right'
              className='text-xs'
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend />
            <Line yAxisId='left' type='monotone' dataKey='consumption' stroke='#f59e0b' strokeWidth={2} dot={false} name='Liters' />
            <Line yAxisId='right' type='monotone' dataKey='cost' stroke='#8b5cf6' strokeWidth={2} dot={false} name='Cost (THB)' />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
