'use client';
/* eslint-disable react/prop-types */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useCinematicGateway, orchestrateTransition } from '@/lib/cinematic-gateway';

interface TransitionOrchestratorProps {
  isActive: boolean;
  duration?: number; // milliseconds
  onComplete?: () => void;
}

/**
 * TransitionOrchestrator
 * 
 * Manages the global WebGL canvas and coordinates:
 * - Camera FOV zoom (60° → 20°)
 * - Position push-back (-50 units on Z)
 * - HTML element opacity fade (via parent Framer Motion)
 * - 60FPS lock via requestAnimationFrame
 */
export const TransitionOrchestrator: React.FC<TransitionOrchestratorProps> = ({
  isActive,
  duration = 1200,
  onComplete,
}) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafs = useRef<number[]>([]);

  const { setCanvas, setRenderer, updateProgress, completeTransition } =
    useCinematicGateway();

  useEffect(() => {
    if (!isActive) return;

    // Initialize Three.js scene
    const canvas = document.getElementById(
      'cinematic-gateway-canvas'
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0.1);

    // Add subtle mesh to canvas (visual anchor)
    const geometry = new THREE.IcosahedronGeometry(1, 4);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00d4ff,
      emissive: 0x0099cc,
      wireframe: false,
      transparent: true,
      opacity: 0.15,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -30;
    scene.add(mesh);

    // Lighting
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    setCanvas(canvas);
    setRenderer(renderer);

    // Animation loop
    startTimeRef.current = Date.now();

    const animate = () => {
      const raf = requestAnimationFrame(animate);
      rafs.current.push(raf);

      const elapsed = Date.now() - (startTimeRef.current || 0);
      const progress = Math.min(elapsed / duration, 1);

      updateProgress(progress);
      orchestrateTransition(camera, progress);

      // Rotate mesh for visual feedback
      mesh.rotation.x += 0.0005;
      mesh.rotation.y += 0.0008;

      // Fade out mesh opacity with progress
      (material as THREE.Material).opacity = 0.15 * (1 - progress);

      renderer.render(scene, camera);

      if (progress >= 1) {
        completeTransition();
        onComplete?.();
      }
    };

    animationIdRef.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    const rafsToClean = rafs.current;
    return () => {
      window.removeEventListener('resize', handleResize);
      rafsToClean.forEach((raf) => cancelAnimationFrame(raf));
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [isActive, duration, onComplete, updateProgress, completeTransition, setCanvas, setRenderer]);


  return null; // Rendered globally via canvas, not DOM
};
