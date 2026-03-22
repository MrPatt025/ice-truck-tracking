'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export type FleetStatus = 'active' | 'idle' | 'warning'

export interface FleetTruck {
  id: string
  lat: number
  lon: number
  tempC: number
  heading: number
  status: FleetStatus
}

interface FleetTelemetryState {
  trucks: readonly FleetTruck[]
  tick: number
  generatedAt: number
  setTrucks: (trucks: readonly FleetTruck[]) => void
  tickFleet: () => void
}

const BASE_LAT = 13.7563
const BASE_LON = 100.5018

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function createMockFleet(count = 180): readonly FleetTruck[] {
  return Array.from({ length: count }, (_, index) => {
    const arc = (index / count) * Math.PI * 2.8
    const spread = 0.015 + (index % 17) * 0.0015

    return {
      id: `fleet-${String(index + 1).padStart(4, '0')}`,
      lat: BASE_LAT + Math.sin(arc) * spread,
      lon: BASE_LON + Math.cos(arc) * spread,
      tempC: Number((-9 + Math.sin(index * 0.19) * 6).toFixed(2)),
      heading: (index * 29) % 360,
      status: index % 11 === 0 ? 'warning' : index % 5 === 0 ? 'idle' : 'active',
    }
  })
}

export const useFleetTelemetryStore = create<FleetTelemetryState>()(
  subscribeWithSelector((set, get) => ({
    trucks: createMockFleet(),
    tick: 0,
    generatedAt: Date.now(),
    setTrucks: trucks =>
      set({
        trucks,
        generatedAt: Date.now(),
      }),
    tickFleet: () => {
      const nextTick = get().tick + 1
      const nextTrucks = get().trucks.map((truck, index) => {
        const drift = Math.sin(nextTick * 0.07 + index * 0.09) * 0.00022
        const sway = Math.cos(nextTick * 0.05 + index * 0.12) * 0.00018
        const headingDelta = 0.8 + ((index + nextTick) % 3) * 0.55
        const temperatureWave = Math.sin(nextTick * 0.11 + index * 0.21) * 0.42

        const nextTemp = clamp(truck.tempC + temperatureWave, -24, 8)
        const nextStatus: FleetStatus =
          nextTemp > 2 ? 'warning' : nextTemp > -1 ? 'idle' : 'active'

        return {
          ...truck,
          lat: truck.lat + drift,
          lon: truck.lon + sway,
          tempC: Number(nextTemp.toFixed(2)),
          heading: (truck.heading + headingDelta) % 360,
          status: nextStatus,
        }
      })

      set({
        trucks: nextTrucks,
        tick: nextTick,
        generatedAt: Date.now(),
      })
    },
  }))
)

export function startFleetTelemetrySimulation(intervalMs = 420): () => void {
  const id = globalThis.setInterval(() => {
    useFleetTelemetryStore.getState().tickFleet()
  }, intervalMs)

  return () => {
    globalThis.clearInterval(id)
  }
}
