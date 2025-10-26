// /components/dashboard/MetricsGrid.tsx
import React from 'react';
import MetricCard from './MetricCard';
import { useMetrics } from '@/hooks/useMetrics';

const MetricsGrid = () => {
  const { metrics, isLoading, error } = useMetrics();

  if (error) {
    return (
      <div
        className="rounded-lg bg-rose-500/10 p-4 text-center text-rose-300"
        data-testid="metrics-error"
      >
        Failed to load metrics. Please check the API connection.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="metrics-grid"
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} isLoading={isLoading} />
      ))}
    </div>
  );
};

export default MetricsGrid;
