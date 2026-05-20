/**
 * Environment configuration and feature flags
 */

// API & WebSocket URLs
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL?.trim() || 'ws://localhost:5000'

// Third-party keys
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || ''
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || ''

// Feature Flags & Modes
export const E2E_LIGHT_MODE = process.env.NEXT_PUBLIC_E2E_LIGHT === 'true'
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Demo Credentials
export const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || ''
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || ''
