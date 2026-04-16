/**
 * Cinematic Gateway: Seamless Landing-to-Dashboard Transition
 *
 * Architecture:
 * - Single shared WebGL canvas positioned behind DOM
 * - FOV zoom (60° → 20°) over 1200ms for depth illusion
 * - Opacity fade (1 → 0) coordinated with camera movement
 * - No post-processing (Bloom/DoF) to maintain 60FPS
 * - Zustand store for state sync across routes
 */

import { create } from 'zustand';
import * as THREE from 'three';
import { secureRandomRange } from './secureRandom';

export interface CinematicGatewayState {
  canvas: HTMLCanvasElement | null;
  renderer: THREE.WebGLRenderer | null;
  isTransitioning: boolean;
  progress: number;
  setCanvas: (canvas: HTMLCanvasElement) => void;
  setRenderer: (renderer: THREE.WebGLRenderer) => void;
  startTransition: () => void;
  updateProgress: (progress: number) => void;
  completeTransition: () => void;
}

export const useCinematicGateway = create<CinematicGatewayState>((set) => ({
  canvas: null,
  renderer: null,
  isTransitioning: false,
  progress: 0,

  setCanvas: (canvas) => set({ canvas }),
  setRenderer: (renderer) => set({ renderer }),

  startTransition: () => set({
    isTransitioning: true,
    progress: 0
  }),

  updateProgress: (progress) => set({ progress }),

  completeTransition: () => set({
    isTransitioning: false,
    progress: 1
  }),
}));

/**
 * Camera transition orchestrator
 * Eases FOV from 60° to 20° and position back by 50 units
 */
export const orchestrateTransition = (
  camera: THREE.PerspectiveCamera,
  progress: number // 0 to 1
): void => {
  const eased = easeInOutCubic(progress);

  // FOV: 60° to 20° (depth compression)
  const startFOV = 60;
  const endFOV = 20;
  camera.fov = THREE.MathUtils.lerp(startFOV, endFOV, eased);

  // Z position: 0 to -50 (push back for dramatic effect)
  const startZ = 0;
  const endZ = -50;
  camera.position.z = THREE.MathUtils.lerp(startZ, endZ, eased);

  camera.updateProjectionMatrix();
};

/**
 * Easing function: cubic in-out
 */
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * SVG noise generator for subtle texture
 */
export const createNoisePattern = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.createImageData(512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = secureRandomRange(0, 25);
    data[i] = noise;      // R
    data[i + 1] = noise;  // G
    data[i + 2] = noise;  // B
    data[i + 3] = 15;     // A (very subtle)
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Global canvas initialization
 * Called once from root layout
 */
export const initGlobalCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');

  canvas.id = 'cinematic-gateway-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';

  // Responsive sizing
  const updateCanvasSize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  };

  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize);

  document.body.appendChild(canvas);

  return canvas;
};
