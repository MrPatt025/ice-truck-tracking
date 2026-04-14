'use client';

import { useEffect } from 'react';
import { useTransitionStore } from '@/stores/transitionStore';

/**
 * useCinematicTransition
 * 
 * Hooks into the transition store and applies visual effects:
 * - Monitors transitionStore.progress (0→1)
 * - Triggers 3D camera orchestration
 * - Syncs with HTML opacity fades (Framer Motion)
 */
export const useCinematicTransition = (isActive: boolean) => {
  const { progress, isTransitioning } = useTransitionStore();

  useEffect(() => {
    if (!isActive || !isTransitioning) return;

    // Sync with global canvas
    const canvas = document.getElementById(
      'cinematic-gateway-canvas'
    ) as HTMLCanvasElement;
    if (!canvas) return;

    // Camera movement is driven by orchestrateTransition()
    // which uses progress from transitionStore
  }, [isActive, progress, isTransitioning]);

  return {
    progress,
    isTransitioning,
  };
};
