'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface CameraTarget {
  truckId: string | null
  latitude: number | null
  longitude: number | null
}

interface CameraSelectionState {
  selectedTruckId: string | null
  cameraTarget: CameraTarget
  selectTruck: (truckId: string, latitude: number, longitude: number) => void
  deselectTruck: () => void
  updateCameraTarget: (latitude: number, longitude: number) => void
}

/**
 * Camera Selection Store — Manages truck selection for cinematic camera fly-to.
 * Uses Zustand with subscribeWithSelector for efficient updates to worker.
 */
export const useCameraSelectionStore = create<CameraSelectionState>()(
  subscribeWithSelector(set => ({
    selectedTruckId: null,
    cameraTarget: {
      truckId: null,
      latitude: null,
      longitude: null,
    },

    selectTruck: (truckId: string, latitude: number, longitude: number) => {
      set({
        selectedTruckId: truckId,
        cameraTarget: {
          truckId,
          latitude,
          longitude,
        },
      })
    },

    deselectTruck: () => {
      set({
        selectedTruckId: null,
        cameraTarget: {
          truckId: null,
          latitude: null,
          longitude: null,
        },
      })
    },

    updateCameraTarget: (latitude: number, longitude: number) => {
      set(state => ({
        cameraTarget: {
          ...state.cameraTarget,
          latitude,
          longitude,
        },
      }))
    },
  }))
)
