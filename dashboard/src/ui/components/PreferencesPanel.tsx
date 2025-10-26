// /dashboard/src/ui/components/PreferencesPanel.tsx
'use client';

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { Button } from './Button';

interface UserPreferences {
  mapStyle: 'streets' | 'satellite' | 'terrain' | 'dark';
  language: 'en' | 'th';
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
  };
  dashboard: {
    layout: 'grid' | 'list';
    autoRefresh: boolean;
    refreshInterval: number;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
  };
}

const defaultPreferences: UserPreferences = {
  mapStyle: 'streets',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    slack: false,
  },
  dashboard: {
    layout: 'grid',
    autoRefresh: true,
    refreshInterval: 30,
  },
  privacy: {
    analytics: false,
    crashReporting: true,
  },
};

type PrefPath =
  | 'mapStyle'
  | 'language'
  | 'notifications.email'
  | 'notifications.push'
  | 'notifications.slack'
  | 'dashboard.layout'
  | 'dashboard.autoRefresh'
  | 'dashboard.refreshInterval'
  | 'privacy.analytics'
  | 'privacy.crashReporting';

interface PreferencesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange: (preferences: UserPreferences) => void;
}

export function PreferencesPanel({
  isOpen,
  onClose,
  onPreferencesChange,
}: PreferencesPanelProps): JSX.Element | null {
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem('user-preferences');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<UserPreferences>;
        // merge แบบปลอดภัย
        setPreferences({
          ...defaultPreferences,
          ...parsed,
          notifications: {
            ...defaultPreferences.notifications,
            ...parsed?.notifications,
          },
          dashboard: { ...defaultPreferences.dashboard, ...parsed?.dashboard },
          privacy: { ...defaultPreferences.privacy, ...parsed?.privacy },
        });
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  function clampInt(v: number, min: number, max: number): number {
    if (!Number.isFinite(v)) return min;
    if (v < min) return min;
    if (v > max) return max;
    return Math.trunc(v);
  }

  function updatePreference(path: PrefPath, value: unknown): void {
    setPreferences((prev) => {
      // copy ชั้นแรกเสมอ ป้องกันการกลายพันธุ์
      const next: UserPreferences = {
        ...prev,
        notifications: { ...prev.notifications },
        dashboard: { ...prev.dashboard },
        privacy: { ...prev.privacy },
      };

      switch (path) {
        case 'mapStyle': {
          const v = value as UserPreferences['mapStyle'];
          if (
            v === 'streets' ||
            v === 'satellite' ||
            v === 'terrain' ||
            v === 'dark'
          )
            next.mapStyle = v;
          break;
        }
        case 'language': {
          const v = value as UserPreferences['language'];
          if (v === 'en' || v === 'th') next.language = v;
          break;
        }
        case 'notifications.email': {
          next.notifications.email = Boolean(value);
          break;
        }
        case 'notifications.push': {
          next.notifications.push = Boolean(value);
          break;
        }
        case 'notifications.slack': {
          next.notifications.slack = Boolean(value);
          break;
        }
        case 'dashboard.layout': {
          const v = value as UserPreferences['dashboard']['layout'];
          next.dashboard.layout = v === 'list' ? 'list' : 'grid';
          break;
        }
        case 'dashboard.autoRefresh': {
          next.dashboard.autoRefresh = Boolean(value);
          break;
        }
        case 'dashboard.refreshInterval': {
          const num = clampInt(Number(value), 10, 300);
          next.dashboard.refreshInterval = num;
          break;
        }
        case 'privacy.analytics': {
          next.privacy.analytics = Boolean(value);
          break;
        }
        case 'privacy.crashReporting': {
          next.privacy.crashReporting = Boolean(value);
          break;
        }
        default:
          break;
      }

      return next;
    });
    setHasChanges(true);
  }

  function handleSave(): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'user-preferences',
          JSON.stringify(preferences),
        );
      } catch {
        // storage quota or disabled
      }
    }
    onPreferencesChange(preferences);
    setHasChanges(false);

    // analytics (opt-in)
    if (
      typeof window !== 'undefined' &&
      (window as any).gtag &&
      preferences.privacy.analytics
    ) {
      (window as any).gtag('event', 'preferences_updated', {
        map_style: preferences.mapStyle,
        language: preferences.language,
        layout: preferences.dashboard.layout,
      });
    }
  }

  function handleReset(): void {
    setPreferences(defaultPreferences);
    setHasChanges(true);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="User preferences"
    >
      <div className="mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Preferences</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded"
              aria-label="Close preferences"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Map Preferences */}
          <section>
            <h3 className="mb-3 text-lg font-medium">Map Settings</h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="map-style-select"
                  className="mb-1 block text-sm font-medium"
                >
                  Default Map Style
                </label>
                <select
                  id="map-style-select"
                  value={preferences.mapStyle}
                  onChange={(e) => updatePreference('mapStyle', e.target.value)}
                  className="w-full rounded-md border p-2"
                  aria-label="Default map style"
                >
                  <option value="streets">Streets</option>
                  <option value="satellite">Satellite</option>
                  <option value="terrain">Terrain</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </section>

          {/* Language */}
          <section>
            <h3 className="mb-3 text-lg font-medium">Language</h3>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={preferences.language === 'en'}
                  onChange={(e) => updatePreference('language', e.target.value)}
                  className="mr-2"
                />
                English
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="language"
                  value="th"
                  checked={preferences.language === 'th'}
                  onChange={(e) => updatePreference('language', e.target.value)}
                  className="mr-2"
                />
                ไทย
              </label>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h3 className="mb-3 text-lg font-medium">Notifications</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.email}
                  onChange={(e) =>
                    updatePreference('notifications.email', e.target.checked)
                  }
                  className="mr-2"
                />
                Email notifications
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.push}
                  onChange={(e) =>
                    updatePreference('notifications.push', e.target.checked)
                  }
                  className="mr-2"
                />
                Push notifications
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.slack}
                  onChange={(e) =>
                    updatePreference('notifications.slack', e.target.checked)
                  }
                  className="mr-2"
                />
                Slack notifications
              </label>
            </div>
          </section>

          {/* Dashboard */}
          <section>
            <h3 className="mb-3 text-lg font-medium">Dashboard</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Layout</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="layout"
                      value="grid"
                      checked={preferences.dashboard.layout === 'grid'}
                      onChange={(e) =>
                        updatePreference('dashboard.layout', e.target.value)
                      }
                      className="mr-2"
                    />
                    Grid
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="layout"
                      value="list"
                      checked={preferences.dashboard.layout === 'list'}
                      onChange={(e) =>
                        updatePreference('dashboard.layout', e.target.value)
                      }
                      className="mr-2"
                    />
                    List
                  </label>
                </div>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.dashboard.autoRefresh}
                  onChange={(e) =>
                    updatePreference('dashboard.autoRefresh', e.target.checked)
                  }
                  className="mr-2"
                />
                Auto-refresh data
              </label>

              {preferences.dashboard.autoRefresh && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Refresh interval (seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={preferences.dashboard.refreshInterval}
                    onChange={(e) =>
                      updatePreference(
                        'dashboard.refreshInterval',
                        clampInt(Number(e.target.value), 10, 300),
                      )
                    }
                    className="w-24 rounded-md border p-2"
                    inputMode="numeric"
                    aria-label="Refresh interval in seconds"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h3 className="mb-3 text-lg font-medium">Privacy & Analytics</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.privacy.analytics}
                  onChange={(e) =>
                    updatePreference('privacy.analytics', e.target.checked)
                  }
                  className="mr-2"
                />
                Allow usage analytics
              </label>
              <p className="ml-6 text-sm text-gray-600">
                Help us improve the dashboard by sharing anonymous usage data
              </p>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.privacy.crashReporting}
                  onChange={(e) =>
                    updatePreference('privacy.crashReporting', e.target.checked)
                  }
                  className="mr-2"
                />
                Enable crash reporting
              </label>
              <p className="ml-6 text-sm text-gray-600">
                Automatically report errors to help us fix issues
              </p>
            </div>
          </section>
        </div>

        <div className="flex justify-between border-t bg-gray-50 p-6">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
