'use client'

import { useEffect, useCallback } from 'react'

interface AnalyticsEvent {
  action: string
  category: string
  label?: string
  value?: number
  custom_parameters?: Record<string, any>
}

interface UserProperties {
  user_id?: string
  language: string
  map_style_preference: string
  dashboard_layout: string
  notifications_enabled: boolean
}

export function useAnalytics() {
  const track = useCallback((event: AnalyticsEvent) => {
    // Check if user has opted in to analytics
    const analyticsEnabled = localStorage.getItem('analytics-enabled') === 'true'
    if (!analyticsEnabled) return

    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.custom_parameters,
      })
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event)
    }
  }, [])

  const trackPageView = useCallback((page_path: string, page_title?: string) => {
    const analyticsEnabled = localStorage.getItem('analytics-enabled') === 'true'
    if (!analyticsEnabled) return

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path,
        page_title,
      })
    }
  }, [])

  const setUserProperties = useCallback((properties: Partial<UserProperties>) => {
    const analyticsEnabled = localStorage.getItem('analytics-enabled') === 'true'
    if (!analyticsEnabled) return

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        custom_map: properties,
      })
    }
  }, [])

  const trackMapInteraction = useCallback((interaction: string, details?: Record<string, any>) => {
    track({
      action: 'map_interaction',
      category: 'engagement',
      label: interaction,
      custom_parameters: {
        interaction_type: interaction,
        ...details,
      },
    })
  }, [track])

  const trackTruckSelection = useCallback((truckId: string, method: 'click' | 'keyboard') => {
    track({
      action: 'truck_selected',
      category: 'engagement',
      label: truckId,
      custom_parameters: {
        selection_method: method,
        truck_id: truckId,
      },
    })
  }, [track])

  const trackPreferenceChange = useCallback((preference: string, value: any) => {
    track({
      action: 'preference_changed',
      category: 'customization',
      label: preference,
      custom_parameters: {
        preference_name: preference,
        preference_value: value,
      },
    })
  }, [track])

  const trackError = useCallback((error: Error, context?: string) => {
    track({
      action: 'error_occurred',
      category: 'error',
      label: error.message,
      custom_parameters: {
        error_name: error.name,
        error_stack: error.stack?.substring(0, 500), // Limit stack trace length
        error_context: context,
      },
    })
  }, [track])

  return {
    track,
    trackPageView,
    setUserProperties,
    trackMapInteraction,
    trackTruckSelection,
    trackPreferenceChange,
    trackError,
  }
}

export function useAnalyticsOptIn() {
  const isOptedIn = typeof window !== 'undefined' 
    ? localStorage.getItem('analytics-enabled') === 'true'
    : false

  const optIn = useCallback(() => {
    localStorage.setItem('analytics-enabled', 'true')
    
    // Initialize analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted'
      })
    }
  }, [])

  const optOut = useCallback(() => {
    localStorage.setItem('analytics-enabled', 'false')
    
    // Disable analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'denied'
      })
    }
  }, [])

  return { isOptedIn, optIn, optOut }
}