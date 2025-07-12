import '@testing-library/jest-dom'

// Mock Mapbox GL
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    addControl: jest.fn(),
    on: jest.fn(),
    remove: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    fitBounds: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  FullscreenControl: jest.fn(),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  })),
  Popup: jest.fn(() => ({
    setHTML: jest.fn().mockReturnThis(),
  })),
  LngLatBounds: jest.fn(() => ({
    extend: jest.fn(),
  })),
}))

// Mock Socket.io
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token'
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:5000'
