'use client'

import { useState, useEffect } from 'react'
import { Button } from './Button'

interface UserPreferences {
  mapStyle: 'streets' | 'satellite' | 'terrain' | 'dark'
  language: 'en' | 'th'
  notifications: {
    email: boolean
    push: boolean
    slack: boolean
  }
  dashboard: {
    layout: 'grid' | 'list'
    autoRefresh: boolean
    refreshInterval: number
  }
  privacy: {
    analytics: boolean
    crashReporting: boolean
  }
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
}

interface PreferencesPanelProps {
  isOpen: boolean
  onClose: () => void
  onPreferencesChange: (preferences: UserPreferences) => void
}

export function PreferencesPanel({ isOpen, onClose, onPreferencesChange }: PreferencesPanelProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('user-preferences')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPreferences({ ...defaultPreferences, ...parsed })
      } catch (error) {
        console.error('Failed to parse preferences:', error)
      }
    }
  }, [])

  const updatePreference = (path: string, value: any) => {
    setPreferences(prev => {
      const keys = path.split('.')
      const updated = { ...prev }
      let current: any = updated
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return updated
    })
    setHasChanges(true)
  }

  const handleSave = () => {
    localStorage.setItem('user-preferences', JSON.stringify(preferences))
    onPreferencesChange(preferences)
    setHasChanges(false)
    
    // Track preference changes
    if (typeof window !== 'undefined' && (window as any).gtag && preferences.privacy.analytics) {
      (window as any).gtag('event', 'preferences_updated', {
        map_style: preferences.mapStyle,
        language: preferences.language,
        layout: preferences.dashboard.layout,
      })
    }
  }

  const handleReset = () => {
    setPreferences(defaultPreferences)
    setHasChanges(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">User Preferences</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Map Preferences */}
          <section>
            <h3 className="text-lg font-medium mb-3">Map Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Default Map Style</label>
                <select 
                  value={preferences.mapStyle}
                  onChange={(e) => updatePreference('mapStyle', e.target.value)}
                  className="w-full p-2 border rounded-md"
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
            <h3 className="text-lg font-medium mb-3">Language</h3>
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
            <h3 className="text-lg font-medium mb-3">Notifications</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.email}
                  onChange={(e) => updatePreference('notifications.email', e.target.checked)}
                  className="mr-2"
                />
                Email notifications
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.push}
                  onChange={(e) => updatePreference('notifications.push', e.target.checked)}
                  className="mr-2"
                />
                Push notifications
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.slack}
                  onChange={(e) => updatePreference('notifications.slack', e.target.checked)}
                  className="mr-2"
                />
                Slack notifications
              </label>
            </div>
          </section>

          {/* Dashboard */}
          <section>
            <h3 className="text-lg font-medium mb-3">Dashboard</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Layout</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="layout"
                      value="grid"
                      checked={preferences.dashboard.layout === 'grid'}
                      onChange={(e) => updatePreference('dashboard.layout', e.target.value)}
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
                      onChange={(e) => updatePreference('dashboard.layout', e.target.value)}
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
                  onChange={(e) => updatePreference('dashboard.autoRefresh', e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh data
              </label>
              
              {preferences.dashboard.autoRefresh && (
                <div>
                  <label className="block text-sm font-medium mb-1">Refresh interval (seconds)</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={preferences.dashboard.refreshInterval}
                    onChange={(e) => updatePreference('dashboard.refreshInterval', parseInt(e.target.value))}
                    className="w-24 p-2 border rounded-md"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h3 className="text-lg font-medium mb-3">Privacy & Analytics</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.privacy.analytics}
                  onChange={(e) => updatePreference('privacy.analytics', e.target.checked)}
                  className="mr-2"
                />
                Allow usage analytics
              </label>
              <p className="text-sm text-gray-600 ml-6">
                Help us improve the dashboard by sharing anonymous usage data
              </p>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.privacy.crashReporting}
                  onChange={(e) => updatePreference('privacy.crashReporting', e.target.checked)}
                  className="mr-2"
                />
                Enable crash reporting
              </label>
              <p className="text-sm text-gray-600 ml-6">
                Automatically report errors to help us fix issues
              </p>
            </div>
          </section>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
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
  )
}