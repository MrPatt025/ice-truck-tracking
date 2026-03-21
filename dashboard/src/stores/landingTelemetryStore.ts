'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface LandingTelemetryState {
  temperatureC: number
  fogDensity: number
  fogTint: number
  setTelemetry: (temperatureC: number, fogDensity: number, fogTint: number) => void
}

export const useLandingTelemetryStore = create<LandingTelemetryState>()(
  subscribeWithSelector(set => ({
    temperatureC: -16,
    fogDensity: 0.38,
    fogTint: 0.22,
    setTelemetry: (temperatureC, fogDensity, fogTint) =>
      set({ temperatureC, fogDensity, fogTint }),
  }))
)

export function startLandingTelemetrySimulation(): () => void {
  let tick = 0

  const id = globalThis.setInterval(() => {
    tick += 0.12

    const base = -14 + Math.sin(tick) * 6.5
    const wave = Math.sin(tick * 0.5 + Math.PI / 4) * 1.8
    const temperatureC = Number((base + wave).toFixed(2))

    const fogDensity = Math.min(0.88, Math.max(0.22, 0.42 + temperatureC / -62))
    const fogTint = Math.min(1, Math.max(0, (temperatureC + 26) / 20))

    useLandingTelemetryStore
      .getState()
      .setTelemetry(temperatureC, fogDensity, fogTint)
  }, 420)

  return () => {
    globalThis.clearInterval(id)
  }
}
