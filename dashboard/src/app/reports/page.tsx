'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Download, Truck, Thermometer,
  TrendingUp, TrendingDown, Package, Fuel,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import AppSidebar from '@/components/AppSidebar';

// ── Mock Data ──────────────────────────────────────────────
const temperatureData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  avg: -18 + Math.sin(i / 3) * 3 + Math.random() * 2,
  min: -22 + Math.sin(i / 3) * 2,
  max: -14 + Math.sin(i / 3) * 3 + Math.random() * 2,
}));

const deliveryData = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 6 + i);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short' }),
    completed: 40 + Math.floor(Math.random() * 30),
    failed: Math.floor(Math.random() * 5),
    pending: 10 + Math.floor(Math.random() * 15),
  };
});

const fuelData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 29 + i);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    consumption: 200 + Math.random() * 100,
    cost: 8000 + Math.random() * 4000,
  };
});

const fleetDistribution = [
  { name: 'Active', value: 35, color: '#10b981' },
  { name: 'Idle', value: 8, color: '#f59e0b' },
  { name: 'Maintenance', value: 4, color: '#f97316' },
  { name: 'Offline', value: 3, color: '#6b7280' },
];

type TimeRange = '24h' | '7d' | '30d' | '90d';

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'temperature' | 'delivery' | 'fuel'>('overview');

  const summaryCards = [
    {
      icon: Truck,
      label: 'Fleet Utilization',
      value: '70%',
      change: '+5.2%',
      trend: 'up' as const,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      icon: Package,
      label: 'Total Deliveries',
      value: '1,248',
      change: '+12.3%',
      trend: 'up' as const,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      icon: Thermometer,
      label: 'Avg Temperature',
      value: '-17.8°C',
      change: '-0.5°C',
      trend: 'down' as const,
      color: 'text-cyan-500',
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    },
    {
      icon: Fuel,
      label: 'Fuel Consumed',
      value: '8,420 L',
      change: '-3.1%',
      trend: 'down' as const,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'temperature', label: 'Temperature' },
    { key: 'delivery', label: 'Deliveries' },
    { key: 'fuel', label: 'Fuel & Costs' },
  ] as const;

  return (
    <AppSidebar>
      <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary" />
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Fleet performance insights and historical analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Time Range Picker */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              {(['24h', '7d', '30d', '90d'] as TimeRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors',
                    timeRange === range
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
            <button className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.bg)}>
                  <card.icon className={cn('w-5 h-5', card.color)} />
                </div>
                <span className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  card.trend === 'up' ? 'text-green-500' : 'text-red-500'
                )}>
                  {card.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {card.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Delivery Trend */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-medium mb-4">Delivery Trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'currentColor' }} />
                    <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fleet Distribution */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-medium mb-4">Fleet Distribution</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fleetDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={80} label>
                      {fleetDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'temperature' && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium mb-4">Temperature Monitoring (24h)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={temperatureData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis className="text-xs" tick={{ fill: 'currentColor' }} domain={[-25, -10]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="max" stroke="#f97316" fill="#f97316" fillOpacity={0.1} name="Max" />
                  <Area type="monotone" dataKey="avg" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} name="Average" />
                  <Area type="monotone" dataKey="min" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Min" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium mb-4">Delivery Performance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliveryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                  <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                  <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'fuel' && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium mb-4">Fuel Consumption & Costs (30 days)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fuelData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis yAxisId="left" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="consumption" stroke="#f59e0b" strokeWidth={2} dot={false} name="Liters" />
                  <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Cost (฿)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </AppSidebar>
  );
}
