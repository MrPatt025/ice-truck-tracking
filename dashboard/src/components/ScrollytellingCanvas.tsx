'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useScroll, motion, useTransform } from 'framer-motion';
import * as THREE from 'three';

/* ----------------------------------------------------------------
 *  ScrollytellingGrid — a Zero-Render Architecture 3D scene node.
 *  Uses useRef exclusively (no useState) to keep the animation at
 *  60 FPS without triggering React reconciliation.
 * ---------------------------------------------------------------- */
function ScrollytellingGrid() {
  const gridRef = useRef<THREE.GridHelper>(null);
  const timeRef = useRef(0);

  useFrame((_state, delta) => {
    timeRef.current += delta;
    if (gridRef.current) {
      gridRef.current.rotation.z = Math.sin(timeRef.current * 0.08) * 0.03;
      gridRef.current.position.y = -2 + Math.sin(timeRef.current * 0.15) * 0.12;
    }
  });

  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <ambientLight intensity={0.5} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <gridHelper ref={gridRef} args={[100, 100, '#4f46e5', '#334155']} position={[0, -2, 0]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <fog attach="fog" args={['#0f172a', 10, 30]} />
    </>
  );
}

/**
 * ScrollytellingCanvas: Full-screen fixed background canvas that
 * maps scroll position to 3D camera/scene properties via framer-motion
 * useScroll + useTransform, rendered with @react-three/fiber.
 *
 * Zero-Render Architecture: all animation state lives in useRef /
 * useFrame — no useState in the scroll or animation loops.
 */
export function ScrollytellingCanvas() {
  const { scrollYProgress } = useScroll();

  // Optimized transformations for background depth
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [1, 0.45, 0.45, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  return (
    <motion.div
      suppressHydrationWarning
      className="absolute inset-0 -z-10 pointer-events-none"
      style={{ opacity, scale }}
    >
      <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 2]} gl={{ antialias: false }} frameloop="always">
        <ScrollytellingGrid />
      </Canvas>
    </motion.div>
  );
}
