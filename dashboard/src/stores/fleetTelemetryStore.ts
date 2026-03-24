'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { FleetLiveTruckPatch } from '@/lib/schemas/telemetry'

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
  updatedAt: number
  setTrucks: (trucks: readonly FleetTruck[]) => void
  applyLivePatches: (
    patches: readonly FleetLiveTruckPatch[],
    mode?: 'upsert' | 'replace'
  ) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeStatus(
  status: FleetLiveTruckPatch['status'],
  tempC: number
): FleetStatus {
  if (status === 'active') return 'active'
  if (status === 'idle') return 'idle'
  if (status === 'warning') return 'warning'
  if (status === 'maintenance' || status === 'offline') return 'idle'
  if (status === 'alert') return 'warning'
  if (tempC > 2) return 'warning'
  if (tempC > -1) return 'idle'
  return 'active'
}

function mergeTruckPatch(
  previous: FleetTruck | undefined,
  patch: FleetLiveTruckPatch
): FleetTruck | null {
  const lat = patch.lat ?? previous?.lat
  const lon = patch.lon ?? previous?.lon

  if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
    return null
  }

  const nextTemp = clamp(patch.tempC ?? previous?.tempC ?? -12, -30, 15)
  const headingBase = patch.heading ?? previous?.heading ?? 0

  return {
    id: patch.id,
    lat,
    lon,
    tempC: Number(nextTemp.toFixed(2)),
    heading: ((headingBase % 360) + 360) % 360,
    status: normalizeStatus(patch.status, nextTemp),
  }
}

export const useFleetTelemetryStore = create<FleetTelemetryState>()(
  subscribeWithSelector(set => ({
    trucks: [],
    updatedAt: Date.now(),
    setTrucks: trucks =>
      set({
        trucks,
        updatedAt: Date.now(),
      }),
    applyLivePatches: (patches, mode = 'upsert') =>
      set(state => {
        if (patches.length === 0) {
          return { updatedAt: Date.now() }
        }

        const currentById = new Map(state.trucks.map(truck => [truck.id, truck]))

        if (mode === 'replace') {
          const nextTrucks: FleetTruck[] = []

          for (const patch of patches) {
            const nextTruck = mergeTruckPatch(currentById.get(patch.id), patch)
            if (nextTruck) {
              nextTrucks.push(nextTruck)
            }
          }

          return {
            trucks: nextTrucks,
            updatedAt: Date.now(),
          }
        }

        for (const patch of patches) {
          const nextTruck = mergeTruckPatch(currentById.get(patch.id), patch)
          if (nextTruck) {
            currentById.set(nextTruck.id, nextTruck)
          }
        }

        return {
          trucks: Array.from(currentById.values()),
          updatedAt: Date.now(),
        }
      }),
  }))
)
