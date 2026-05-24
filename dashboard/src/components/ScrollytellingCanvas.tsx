'use client'

import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useScroll, motion, useTransform, MotionValue } from 'framer-motion'
import { MathUtils } from 'three'
import type { GridHelper, DirectionalLight } from 'three'
import GlassSpinner from '@/components/common/GlassSpinner'

/* ----------------------------------------------------------------
 *  ScrollytellingGrid — a Zero-Render Architecture 3D scene node.
 *  Uses useRef exclusively (no useState) to keep the animation at
 *  60 FPS without triggering React reconciliation.
 * ---------------------------------------------------------------- */
/* eslint-disable react/no-unknown-property */
function ScrollytellingGrid({
  cameraZ,
  cameraY,
  cameraRotX,
  gridLift,
  gridSpin,
  lightIntensity,
}: Readonly<{
  cameraZ: MotionValue<number>
  cameraY: MotionValue<number>
  cameraRotX: MotionValue<number>
  gridLift: MotionValue<number>
  gridSpin: MotionValue<number>
  lightIntensity: MotionValue<number>
}>) {
  const gridRef = useRef<GridHelper>(null)
  const dirLightRef = useRef<DirectionalLight>(null)
  const timeRef = useRef(0)
  const { camera } = useThree()

  useFrame((_state, delta) => {
    timeRef.current += delta
    const targetZ = cameraZ.get()
    const targetY = cameraY.get()
    const targetRotX = cameraRotX.get()

    if (gridRef.current) {
      gridRef.current.rotation.z = gridSpin.get()
      gridRef.current.position.y =
        gridLift.get() + Math.sin(timeRef.current * 0.15) * 0.08
    }

    camera.position.z = MathUtils.damp(
      camera.position.z,
      targetZ,
      4,
      delta
    )
    camera.position.y = MathUtils.damp(
      camera.position.y,
      targetY,
      4,
      delta
    )
    camera.rotation.x = MathUtils.damp(
      camera.rotation.x,
      targetRotX,
      4,
      delta
    )

    if (dirLightRef.current) {
      const targetIntensity = lightIntensity.get()
      dirLightRef.current.intensity = MathUtils.damp(
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
      <directionalLight
        ref={dirLightRef}
        position={[10, 10, 5]}
        intensity={1}
        castShadow
      />
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

  const cameraZ = useTransform(scrollYProgress, [0, 1], [5, 12])
  const cameraY = useTransform(scrollYProgress, [0, 1], [2, 6])
  const cameraRotX = useTransform(scrollYProgress, [0, 1], [-0.2, -0.8])
  const gridLift = useTransform(scrollYProgress, [0, 1], [-2, -1.45])
  const gridSpin = useTransform(scrollYProgress, [0, 1], [-0.025, 0.065])
  const lightIntensity = useTransform(scrollYProgress, [0, 1], [1, 0.4])
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    [1, 0.45, 0.45, 1]
  )
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])

  return (
    <motion.div
      suppressHydrationWarning
      className='absolute inset-0 -z-10 pointer-events-none min-h-[100svh]'
      style={{ opacity, scale }}
    >
      <Suspense fallback={<GlassSpinner className='absolute inset-0' />}>
        <Canvas
          shadows={false}
          dpr={[1, 1.5]}
          gl={{ powerPreference: 'high-performance', antialias: false }}
          frameloop='always'
        >
          <ScrollytellingGrid
            cameraZ={cameraZ}
            cameraY={cameraY}
            cameraRotX={cameraRotX}
            gridLift={gridLift}
            gridSpin={gridSpin}
            lightIntensity={lightIntensity}
          />
        </Canvas>
      </Suspense>
    </motion.div>
  )
}
