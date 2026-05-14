'use client'

import React, { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useScroll, motion, useTransform, MotionValue } from 'framer-motion'
import * as THREE from 'three'

/* ----------------------------------------------------------------
 *  ScrollytellingGrid — a Zero-Render Architecture 3D scene node.
 *  Uses useRef exclusively (no useState) to keep the animation at
 *  60 FPS without triggering React reconciliation.
 * ---------------------------------------------------------------- */
/* eslint-disable react/no-unknown-property */
function ScrollytellingGrid({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const gridRef = useRef<THREE.GridHelper>(null)
  const dirLightRef = useRef<THREE.DirectionalLight>(null)
  const timeRef = useRef(0)
  const { camera } = useThree()

  useFrame((_state, delta) => {
    timeRef.current += delta
    const scroll = scrollProgress.get()

    if (gridRef.current) {
      gridRef.current.rotation.z = Math.sin(timeRef.current * 0.08) * 0.03
      gridRef.current.position.y = -2 + Math.sin(timeRef.current * 0.15) * 0.12
    }

    // Camera interpolation based on scroll
    const targetZ = THREE.MathUtils.lerp(5, 12, scroll)
    const targetY = THREE.MathUtils.lerp(2, 6, scroll)
    const targetRotX = THREE.MathUtils.lerp(-0.2, -0.8, scroll)

    // Smooth dampening
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4, delta)
    camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, targetRotX, 4, delta)

    // Light intensity interpolation based on scroll
    if (dirLightRef.current) {
      const targetIntensity = THREE.MathUtils.lerp(1, 0.4, scroll)
      dirLightRef.current.intensity = THREE.MathUtils.damp(
        dirLightRef.current.intensity,
        targetIntensity,
        4,
        delta
      )
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight ref={dirLightRef} position={[10, 10, 5]} intensity={1} castShadow />
      <gridHelper
        ref={gridRef}
        args={[100, 100, '#4f46e5', '#334155']}
        position={[0, -2, 0]}
      />
      <fog attach='fog' args={['#0f172a', 10, 30]} />
    </>
  )
}
/* eslint-enable react/no-unknown-property */

/**
 * ScrollytellingCanvas: Full-screen fixed background canvas that
 * maps scroll position to 3D camera/scene properties via framer-motion
 * useScroll + useTransform, rendered with @react-three/fiber.
 *
 * Zero-Render Architecture: all animation state lives in useRef /
 * useFrame — no useState in the scroll or animation loops.
 */
export function ScrollytellingCanvas() {
  const { scrollYProgress } = useScroll()

  // Optimized transformations for background depth
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    [1, 0.45, 0.45, 1]
  )
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])

  return (
    <motion.div
      suppressHydrationWarning
      className='absolute inset-0 -z-10 pointer-events-none'
      style={{ opacity, scale }}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: false }}
        frameloop='always'
      >
        <ScrollytellingGrid scrollProgress={scrollYProgress} />
      </Canvas>
    </motion.div>
  )
}
