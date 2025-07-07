import React, { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: string[];
  rolloutPercentage: number;
}

interface FeatureFlagsProps {
  isAdmin?: boolean;
}

export function FeatureFlags({ isAdmin = false }: FeatureFlagsProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const fetchFeatureFlags = async () => {
    try {
      const response = await fetch('/api/v1/feature-flags');
      const data = await response.json();
      setFlags(data.flags || []);
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagKey: string, enabled: boolean) => {
    if (!isAdmin) return;

    try {
      await fetch(`/api/v1/feature-flags/${flagKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      setFlags(prev => prev.map(flag => 
        flag.key === flagKey ? { ...flag, enabled } : flag
      ));
    } catch (error) {
      console.error('Failed to toggle feature flag:', error);
    }
  };

  const updateRollout = async (flagKey: string, percentage: number) => {
    if (!isAdmin) return;

    try {
      await fetch(`/api/v1/feature-flags/${flagKey}/rollout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolloutPercentage: percentage }),
      });

      setFlags(prev => prev.map(flag => 
        flag.key === flagKey ? { ...flag, rolloutPercentage: percentage } : flag
      ));
    } catch (error) {
      console.error('Failed to update rollout percentage:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Feature Flags
        </h2>
        {!isAdmin && (
          <span className="text-sm text-gray-500">Read-only mode</span>
        )}
      </div>

      <div className="space-y-4">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {flag.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {flag.description}
                </p>
              </div>
              
              <Switch
                checked={flag.enabled}
                onChange={(enabled) => toggleFlag(flag.key, enabled)}
                disabled={!isAdmin}
                className={`${
                  flag.enabled ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  !isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span
                  className={`${
                    flag.enabled ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-500">
                  Environments: {flag.environment.join(', ')}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  flag.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {isAdmin && flag.enabled && (
                <div className="flex items-center space-x-2">
                  <label className="text-gray-500">Rollout:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={flag.rolloutPercentage}
                    onChange={(e) => updateRollout(flag.key, parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-gray-700 dark:text-gray-300 min-w-[3rem]">
                    {flag.rolloutPercentage}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {flags.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No feature flags configured
        </div>
      )}
    </div>
  );
}

// Hook for using feature flags in components
export function useFeatureFlag(flagKey: string): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const checkFlag = async () => {
      try {
        const response = await fetch(`/api/v1/feature-flags/${flagKey}/check`);
        const data = await response.json();
        setEnabled(data.enabled || false);
      } catch (error) {
        console.error(`Failed to check feature flag ${flagKey}:`, error);
        setEnabled(false);
      }
    };

    checkFlag();
  }, [flagKey]);

  return enabled;
}