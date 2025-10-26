// /components/dashboard/DashboardHeader.tsx
import { Bell, Search, Wifi, WifiOff } from 'lucide-react';
import React from 'react';

const Pill = ({
  children,
  intent,
  'data-testid': dataTestId,
}: {
  children: React.ReactNode;
  intent: string;
  'data-testid'?: string;
}) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium backdrop-blur-xl ${intent === 'ok' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}
    data-testid={dataTestId}
  >
    {children}
  </span>
);

type DashboardHeaderProps = {
  apiHealthy: boolean | null;
  onShowAlerts: () => void;
};

const DashboardHeader = ({
  apiHealthy,
  onShowAlerts,
}: DashboardHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/70 backdrop-blur-lg border-b border-slate-700/50">
      <div className="flex items-center justify-between gap-4 px-6 h-20">
        <div>
          <h1
            className="text-xl font-bold text-white"
            data-testid="dashboard-title"
          >
            Fleet Telemetry Console
          </h1>
          <p className="text-sm text-slate-400">
            Real-time truck monitoring and analytics
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 rounded-lg bg-slate-800 pl-10 pr-4 py-2 text-sm ring-1 ring-transparent focus:ring-violet-500 focus:outline-none transition"
            />
          </div>
          <button
            onClick={onShowAlerts}
            className="relative rounded-lg p-2.5 hover:bg-slate-800 transition-colors"
            data-testid="show-alerts-btn"
          >
            <Bell className="h-5 w-5" />
          </button>
          <Pill
            intent={apiHealthy ? 'ok' : 'error'}
            data-testid="connection-status"
          >
            {apiHealthy ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {apiHealthy ? 'API Online' : 'API Offline'}
            </span>
          </Pill>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
