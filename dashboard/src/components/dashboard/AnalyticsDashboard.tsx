// /components/dashboard/AnalyticsDashboard.tsx
import React from 'react';
import LiveFleetMapCard from './LiveFleetMapCard'; // Import component ใหม่

const PlaceholderCard = ({
  title,
  testId,
}: {
  title: string;
  testId: string;
}) => (
  <div
    className="bg-slate-800/50 rounded-xl p-5 ring-1 ring-white/10 min-h-[400px]"
    data-testid={testId}
  >
    <h3 className="font-semibold text-white">{title}</h3>
    <p className="text-sm text-slate-400">
      Data visualization will be implemented here.
    </p>
  </div>
);

const AnalyticsDashboard = () => {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      data-testid="analytics-dashboard"
    >
      <div className="lg:col-span-3">
        <PlaceholderCard
          title="Truck Activity & Route Efficiency"
          testId="truck-activity-chart"
        />
      </div>
      {/* แทนที่ Placeholder ด้วย Map จริง */}
      <LiveFleetMapCard />
    </div>
  );
};

export default AnalyticsDashboard;
